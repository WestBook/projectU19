/**
 * AI Orchestrator — Public API
 *
 * 使用方式（伺服器端，例如 Express / Node.js BFF）：
 *
 *   import { runAgentTurn, createSessionState, DEFAULT_CONFIG } from './orchestrator'
 *
 * 典型整合路徑：
 *   POST /api/ai/chat（Spring Boot）
 *     → 呼叫此 Node.js BFF（或在 Kotlin 端重新實作相同邏輯）
 *     → 將 OrchestratorResult.response 回傳給前端
 *
 * ─── 執行流程範例（Example Execution Flow）─────────────────────────────────
 *
 * 使用者輸入：「有沒有適合 9 歲小孩的籃球活動？」
 *
 * Turn 0：
 *   → 送入 Claude（含 tools 定義 + system prompt）
 *   ← Claude: stop_reason="tool_use"
 *              tool_use { id: "tu_01", name: "searchEvents", input: { age: 9 } }
 *
 *   → execute searchEvents({ age: 9 })
 *      呼叫 GET /api/events?age=9&page=0&size=10
 *      timeout: 10s，失敗回傳 error JSON
 *   ← tool_result { tool_use_id: "tu_01", content: '{"found":3,"events":[...]}' }
 *
 * Turn 1：
 *   → 送入 Claude（含 tool_result）
 *   ← Claude: stop_reason="tool_use"
 *              tool_use { id: "tu_02", name: "getEventDetail",
 *                         input: { id: "550e8400-..." } }
 *
 *   → execute getEventDetail({ id: "550e8400-..." })
 *      [seenEventIds 驗證通過]
 *      呼叫 GET /api/events/550e8400-...
 *   ← tool_result { tool_use_id: "tu_02", content: '{"id":"550e8400-...","name":"..."}' }
 *
 * Turn 2：
 *   → 送入 Claude（含 tool_result）
 *   ← Claude: stop_reason="end_turn"
 *              text: "找到以下適合 9 歲小孩的籃球活動：
 *                     兒童籃球夏令營（ID: 550e8400-...），台北市，3/15，費用 NT$2000，
 *                     目前尚有 5 個名額，報名截止 2026-03-10。
 *                     請問您要進一步了解這個活動嗎？"
 *
 * OrchestratorResult {
 *   response: "找到以下適合...",
 *   seenEventIds: ["550e8400-..."],
 *   toolCallCount: 2,
 *   turnsUsed: 2,
 *   hitLimit: false
 * }
 */

export { runAgentTurn } from './orchestrator'
export { DEFAULT_CONFIG } from './types'
export type {
  OrchestratorConfig,
  OrchestratorResult,
  ClaudeMessage,
  ToolName,
  SearchEventsInput,
  GetEventDetailInput,
} from './types'

// ─── Session State 工廠 ──────────────────────────────────────────────────────

/**
 * 建立每個對話 session 共享的可變狀態。
 * 應在 session 開始時建立一次，跨多個 runAgentTurn 呼叫共享。
 *
 * seenEventIds   — 所有曾由 searchEvents 回傳的 eventId（防幻覺驗證用）
 * sessionToolCount — 本 session 已使用的工具呼叫次數（防濫用限流用）
 */
export function createSessionState() {
  return {
    seenEventIds: new Set<string>(),
    sessionToolCount: { value: 0 },
  }
}

// ─── System Prompt 載入輔助 ───────────────────────────────────────────────────

/**
 * 從 docs/ai/prompt.md 的 Part 1 提取 system prompt 文字。
 *
 * 整合時建議在伺服器啟動時讀取一次並快取，而非每次請求讀取。
 *
 * @param rawMarkdown  prompt.md 的完整文字內容
 * @returns            ``` 代碼區塊內的 system prompt 純文字
 */
export function extractSystemPrompt(rawMarkdown: string): string {
  // 擷取第一個 ``` 代碼區塊的內容（Part 1 的 system prompt）
  const match = rawMarkdown.match(/```\n([\s\S]*?)\n```/)
  if (!match?.[1]) {
    throw new Error('無法從 prompt.md 解析 System Prompt，請確認格式正確。')
  }
  return match[1].trim()
}
