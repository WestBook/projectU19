/**
 * AI Orchestrator — 主控迴圈
 *
 * 實作 user → Claude API → tool_use → tool_result → ... → end_turn 的完整流程。
 *
 * 架構：
 *   runAgentTurn()     ← 單次對話入口（外部呼叫）
 *     └─ agentLoop()  ← 多輪 tool-calling 迴圈
 *          ├─ callClaudeWithRetry()   ← Claude API（含 timeout + 指數退避重試）
 *          └─ executeToolBlock()      ← 依工具名稱路由到 toolExecutors
 *
 * 注意：此模組使用 fetch 呼叫 Claude API，適合在 Node.js/Deno/BFF 環境執行。
 *       不應在瀏覽器端直接使用（會暴露 API Key）。
 */

import { executeGetEventDetail, executeSearchEvents, withTimeout } from './toolExecutors'
import type {
  ClaudeApiResponse,
  ClaudeMessage,
  ContentBlock,
  ContentBlockToolResult,
  ContentBlockToolUse,
  GetEventDetailInput,
  OrchestratorConfig,
  OrchestratorResult,
  SearchEventsInput,
} from './types'
import { DEFAULT_CONFIG } from './types'

// ─── 工具定義（從 docs/ai/tools.json 同步，保持最小化） ──────────────────────

const TOOL_DEFINITIONS = [
  {
    name: 'searchEvents',
    description:
      'Search for children sports events. Returns a paginated list with id, name, age range, startTime, location, and registrationStatus.',
    input_schema: {
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 1, maximum: 18 },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        location: { type: 'string', maxLength: 100 },
        page: { type: 'integer', minimum: 0, default: 0 },
        size: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
      },
      required: [],
    },
  },
  {
    name: 'getEventDetail',
    description:
      'Retrieve full details of a single sports event by UUID. Only call with IDs from previous searchEvents results.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      required: ['id'],
    },
  },
]

// ─── Claude API 呼叫（含 timeout） ───────────────────────────────────────────

async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
  config: OrchestratorConfig
): Promise<ClaudeApiResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.claudeTimeoutMs)

  let response: Response
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        messages,
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(`Claude API error ${response.status}: ${body.error?.message ?? 'unknown'}`)
  }

  return response.json() as Promise<ClaudeApiResponse>
}

// ─── 指數退避重試 ────────────────────────────────────────────────────────────

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529])

async function callClaudeWithRetry(
  messages: ClaudeMessage[],
  systemPrompt: string,
  config: OrchestratorConfig
): Promise<ClaudeApiResponse> {
  let lastError: Error = new Error('Unexpected: no attempts made')

  for (let attempt = 0; attempt < config.claudeRetryAttempts; attempt++) {
    try {
      return await callClaude(messages, systemPrompt, config)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      const isAbort = lastError.name === 'AbortError'
      const statusMatch = lastError.message.match(/Claude API error (\d+)/)
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0
      const isRetryable = isAbort || RETRYABLE_STATUS_CODES.has(statusCode)

      if (!isRetryable || attempt === config.claudeRetryAttempts - 1) {
        break
      }

      // 指數退避：500ms, 1000ms, 2000ms...
      const delay = config.retryBaseDelayMs * Math.pow(2, attempt)
      await new Promise<void>((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// ─── 工具路由 ────────────────────────────────────────────────────────────────

async function executeToolBlock(
  block: ContentBlockToolUse,
  config: OrchestratorConfig,
  seenEventIds: Set<string>,
  sessionToolCount: { value: number }
): Promise<ContentBlockToolResult> {
  // 防濫用：session 總工具呼叫次數上限
  if (sessionToolCount.value >= config.maxToolCallsPerSession) {
    return {
      type: 'tool_result',
      tool_use_id: block.id,
      content: JSON.stringify({
        error: true,
        code: 'TOOL_CALL_LIMIT_EXCEEDED',
        message: '已達本 session 工具呼叫上限，請結束對話或重新整理頁面。',
      }),
      is_error: true,
    }
  }

  sessionToolCount.value += 1

  let resultContent: string

  try {
    if (block.name === 'searchEvents') {
      resultContent = await withTimeout(
        executeSearchEvents(
          block.input as SearchEventsInput,
          config.platformBaseUrl,
          config.toolTimeoutMs,
          seenEventIds
        ),
        config.toolTimeoutMs,
        'searchEvents'
      )
    } else if (block.name === 'getEventDetail') {
      resultContent = await withTimeout(
        executeGetEventDetail(
          block.input as GetEventDetailInput,
          config.platformBaseUrl,
          config.toolTimeoutMs,
          seenEventIds
        ),
        config.toolTimeoutMs,
        'getEventDetail'
      )
    } else {
      resultContent = JSON.stringify({
        error: true,
        code: 'UNKNOWN_TOOL',
        message: `不支援的工具：${block.name}`,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '工具執行失敗'
    resultContent = JSON.stringify({ error: true, message: msg })
  }

  return {
    type: 'tool_result',
    tool_use_id: block.id,
    content: resultContent,
  }
}

// ─── 主迴圈 ──────────────────────────────────────────────────────────────────

function extractTextFromContent(content: ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
}

async function agentLoop(
  initialMessages: ClaudeMessage[],
  systemPrompt: string,
  config: OrchestratorConfig,
  seenEventIds: Set<string>,
  sessionToolCount: { value: number }
): Promise<OrchestratorResult> {
  const messages: ClaudeMessage[] = [...initialMessages]
  let turnsUsed = 0

  while (turnsUsed < config.maxTurns) {
    // ── 呼叫 Claude（含 timeout + 重試） ──
    let claudeResponse: ClaudeApiResponse
    try {
      claudeResponse = await callClaudeWithRetry(messages, systemPrompt, config)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知錯誤'
      return {
        response: `系統暫時無法處理您的請求，請稍後再試。（${msg}）`,
        seenEventIds: [...seenEventIds],
        toolCallCount: sessionToolCount.value,
        turnsUsed,
        hitLimit: false,
      }
    }

    // ── 終止條件：對話結束 ──
    if (claudeResponse.stop_reason === 'end_turn' || claudeResponse.stop_reason === 'stop_sequence') {
      const text = extractTextFromContent(claudeResponse.content)
      return {
        response: text || '抱歉，我目前無法回覆，請重新提問。',
        seenEventIds: [...seenEventIds],
        toolCallCount: sessionToolCount.value,
        turnsUsed,
        hitLimit: false,
      }
    }

    // ── 終止條件：token 上限 ──
    if (claudeResponse.stop_reason === 'max_tokens') {
      const partial = extractTextFromContent(claudeResponse.content)
      return {
        response: partial || '回覆被截斷，請重新提問或縮短問題。',
        seenEventIds: [...seenEventIds],
        toolCallCount: sessionToolCount.value,
        turnsUsed,
        hitLimit: true,
      }
    }

    // ── Tool Use：執行所有 tool_use block ──
    const toolUseBlocks = claudeResponse.content.filter(
      (b): b is ContentBlockToolUse => b.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0) {
      // stop_reason === 'tool_use' 但沒有 tool_use block，視為異常
      return {
        response: '系統發生異常，請稍後再試。',
        seenEventIds: [...seenEventIds],
        toolCallCount: sessionToolCount.value,
        turnsUsed,
        hitLimit: false,
      }
    }

    // 將 assistant 訊息（含 tool_use）加入歷史
    messages.push({ role: 'assistant', content: claudeResponse.content })

    // 平行執行所有工具（大多數對話只有一個，但允許多個）
    const toolResults = await Promise.all(
      toolUseBlocks.map((block) =>
        executeToolBlock(block, config, seenEventIds, sessionToolCount)
      )
    )

    // 將工具結果加入歷史（role: 'user'，content 為 tool_result 陣列）
    messages.push({ role: 'user', content: toolResults })

    turnsUsed += 1
  }

  // 超過 maxTurns 上限
  return {
    response: '抱歉，這個問題我需要查詢太多次才能回答，請試著更具體地描述您的需求，例如孩子的年齡和希望的活動地點。',
    seenEventIds: [...seenEventIds],
    toolCallCount: sessionToolCount.value,
    turnsUsed,
    hitLimit: true,
  }
}

// ─── 公開 API ────────────────────────────────────────────────────────────────

/**
 * 執行單次對話輪次。
 *
 * @param userMessage  使用者輸入的文字
 * @param history      之前的對話歷史（不含工具呼叫中間步驟）
 * @param systemPrompt 來自 docs/ai/prompt.md Part 1 的 system prompt 文字
 * @param configOverrides 覆蓋 DEFAULT_CONFIG 的設定項目
 * @param sessionState  跨輪次共享的狀態（seenEventIds、sessionToolCount）
 */
export async function runAgentTurn(
  userMessage: string,
  history: ClaudeMessage[],
  systemPrompt: string,
  configOverrides: Partial<OrchestratorConfig> & Pick<OrchestratorConfig, 'apiKey' | 'platformBaseUrl'>,
  sessionState: {
    seenEventIds: Set<string>
    sessionToolCount: { value: number }
  }
): Promise<OrchestratorResult> {
  const config: OrchestratorConfig = { ...DEFAULT_CONFIG, ...configOverrides }

  const messages: ClaudeMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
  ]

  return agentLoop(messages, systemPrompt, config, sessionState.seenEventIds, sessionState.sessionToolCount)
}
