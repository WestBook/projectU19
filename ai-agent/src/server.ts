/**
 * AI Agent — Express HTTP Server
 *
 * 提供 POST /api/ai/chat 端點，整合 Orchestrator 完成 tool-calling 流程。
 * 此服務在 Docker 網路中作為獨立容器運行（port 3001），
 * 前端透過 nginx proxy 將 /api/ai/ 的請求轉發至此服務。
 *
 * 環境變數：
 *   ANTHROPIC_API_KEY  — Claude API 金鑰（必填）
 *   PLATFORM_BASE_URL  — 後端 API 位址（預設 http://app:8080）
 *   PORT               — 監聽埠（預設 3001）
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import { runAgentTurn, createSessionState, extractSystemPrompt, DEFAULT_CONFIG } from './orchestrator/index.js'
import type { ClaudeMessage } from './orchestrator/types.js'

// ─── 環境設定 ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const PLATFORM_BASE_URL = process.env.PLATFORM_BASE_URL ?? 'http://app:8080'

if (!ANTHROPIC_API_KEY) {
  console.error('[ai-agent] 必須設定 ANTHROPIC_API_KEY 環境變數')
  process.exit(1)
}

// ─── System Prompt 載入（啟動時讀取一次） ────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROMPT_MD_PATH = join(__dirname, '../../docs/ai/prompt.md')

let SYSTEM_PROMPT: string
try {
  const raw = readFileSync(PROMPT_MD_PATH, 'utf8')
  SYSTEM_PROMPT = extractSystemPrompt(raw)
  console.log('[ai-agent] System prompt 載入成功（長度:', SYSTEM_PROMPT.length, '字元）')
} catch (err) {
  console.error('[ai-agent] 無法載入 prompt.md:', err)
  process.exit(1)
}

// ─── Session 管理（In-Memory，生產環境建議改用 Redis） ────────────────────────

interface SessionData {
  state: ReturnType<typeof createSessionState>
  history: ClaudeMessage[]
  lastActiveAt: number
}

const sessions = new Map<string, SessionData>()

// 每 5 分鐘清理超過 30 分鐘未活動的 session
setInterval(
  () => {
    const expiry = Date.now() - 30 * 60 * 1000
    for (const [id, session] of sessions) {
      if (session.lastActiveAt < expiry) sessions.delete(id)
    }
  },
  5 * 60 * 1000
)

function getOrCreateSession(sessionId: string): SessionData {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      state: createSessionState(),
      history: [],
      lastActiveAt: Date.now(),
    })
  }
  const session = sessions.get(sessionId)!
  session.lastActiveAt = Date.now()
  return session
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express()
app.use(express.json({ limit: '64kb' }))

// CORS（僅允許 Docker 網路內部及本機開發）
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id, X-Trace-Id')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  next()
})

app.options('*', (_req: Request, res: Response) => {
  res.sendStatus(204)
})

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'ai-agent', timestamp: new Date().toISOString() })
})

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────

interface ChatRequestBody {
  message: string
  history?: ClaudeMessage[]
}

app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const traceId = req.headers['x-trace-id'] as string | undefined ?? crypto.randomUUID().slice(0, 12)
  const sessionId = req.headers['x-session-id'] as string | undefined ?? traceId

  const body = req.body as ChatRequestBody

  if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'message 欄位不得為空', traceId },
    })
    return
  }

  const userMessage = body.message.trim()

  // 安全政策：拒絕過長輸入
  if (userMessage.length > 1000) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '訊息長度不得超過 1000 字', traceId },
    })
    return
  }

  const session = getOrCreateSession(sessionId)

  // 若前端傳入歷史，以前端為準（允許無狀態呼叫）
  const history: ClaudeMessage[] = body.history ?? session.history

  console.log(`[ai-agent] [${traceId}] session=${sessionId} message="${userMessage.slice(0, 50)}..."`)

  try {
    const result = await runAgentTurn(userMessage, history, SYSTEM_PROMPT, {
      ...DEFAULT_CONFIG,
      apiKey: ANTHROPIC_API_KEY,
      platformBaseUrl: PLATFORM_BASE_URL,
    }, session.state)

    // 更新 session 歷史（排除工具呼叫中間步驟，只保留純文字輪次）
    session.history = [
      ...history,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: result.response },
    ]

    // 限制歷史長度（保留最近 20 輪）
    if (session.history.length > 40) {
      session.history = session.history.slice(-40)
    }

    res.setHeader('X-Trace-Id', traceId)
    res.json({
      success: true,
      message: result.response,
      structured: result.structured ?? null,
      meta: {
        traceId,
        toolCallCount: result.toolCallCount,
        turnsUsed: result.turnsUsed,
        hitLimit: result.hitLimit,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤'
    console.error(`[ai-agent] [${traceId}] Unhandled error:`, msg)

    res.status(500).json({
      success: false,
      message: '系統暫時無法處理您的請求，請稍後再試。',
      structured: {
        answer: '系統暫時無法處理您的請求，請稍後再試。',
        sources: [],
        suggestions: [
          { label: '聯繫客服', action: 'CONTACT_SUPPORT' },
          { label: '重新開始', action: 'CLEAR_CHAT' },
        ],
      },
      meta: { traceId, hitLimit: false },
    })
  }
})

// ─── 啟動 ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[ai-agent] 服務啟動於 http://0.0.0.0:${PORT}`)
  console.log(`[ai-agent] Platform API: ${PLATFORM_BASE_URL}`)
})
