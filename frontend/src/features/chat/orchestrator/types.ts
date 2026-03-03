/**
 * AI Orchestrator — Type Definitions
 *
 * 對應 Anthropic Messages API 的 tool_use / tool_result 格式。
 * 工具定義來源：docs/ai/tools.json
 */

// ─── Anthropic API 基本型別 ──────────────────────────────────────────────────

export interface ContentBlockText {
  type: 'text'
  text: string
}

export interface ContentBlockToolUse {
  type: 'tool_use'
  id: string
  name: ToolName
  input: ToolInputMap[ToolName]
}

export interface ContentBlockToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = ContentBlockText | ContentBlockToolUse

export type ClaudeRole = 'user' | 'assistant'

export interface ClaudeMessage {
  role: ClaudeRole
  content: string | ContentBlock[] | ContentBlockToolResult[]
}

export interface ClaudeApiResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

// ─── 工具名稱與輸入型別 ─────────────────────────────────────────────────────

export type ToolName = 'searchEvents' | 'getEventDetail'

export interface SearchEventsInput {
  age?: number
  dateFrom?: string
  dateTo?: string
  location?: string
  page?: number
  size?: number
}

export interface GetEventDetailInput {
  id: string
}

export interface ToolInputMap {
  searchEvents: SearchEventsInput
  getEventDetail: GetEventDetailInput
}

// ─── Orchestrator 設定與結果 ─────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** Claude API key（伺服器環境使用） */
  apiKey: string
  /** 使用的模型 ID */
  model: string
  /** 平台後端 Base URL（供 tool executor 呼叫） */
  platformBaseUrl: string
  /** 單次 Claude API 呼叫的 timeout（毫秒） */
  claudeTimeoutMs: number
  /** 單次工具呼叫的 timeout（毫秒） */
  toolTimeoutMs: number
  /** Claude API 呼叫失敗時的最大重試次數 */
  claudeRetryAttempts: number
  /** 重試前的初始等待時間（毫秒，指數退避） */
  retryBaseDelayMs: number
  /** 單次對話允許的最大工具呼叫輪次 */
  maxTurns: number
  /** 單 session 最大工具呼叫總次數（防濫用） */
  maxToolCallsPerSession: number
}

export const DEFAULT_CONFIG: Omit<OrchestratorConfig, 'apiKey' | 'platformBaseUrl'> = {
  model: 'claude-sonnet-4-6',
  claudeTimeoutMs: 30_000,
  toolTimeoutMs: 10_000,
  claudeRetryAttempts: 3,
  retryBaseDelayMs: 500,
  maxTurns: 5,
  maxToolCallsPerSession: 20,
}

export interface OrchestratorResult {
  /** 最終回覆文字 */
  response: string
  /** 本次對話中出現過的合法 eventId 集合（用於幻覺驗證） */
  seenEventIds: string[]
  /** 實際使用的工具呼叫次數 */
  toolCallCount: number
  /** 使用的 agent loop 輪次 */
  turnsUsed: number
  /** 是否因達到上限而提前終止 */
  hitLimit: boolean
}

// ─── 平台 API 回傳型別（與 frontend/src/shared/types/api.ts 對齊） ───────────

export interface PlatformEvent {
  id: string
  name: string
  ageMin: number
  ageMax: number
  startTime: string
  location: string
  registrationStatus: 'OPEN' | 'CLOSED' | 'FULL'
}

export interface PlatformEventDetail {
  id: string
  name: string
  description?: string
  ageRestriction: {
    minAge: number
    maxAge: number
    description: string
    strictEnforcement?: boolean
  }
  startTime: string
  endTime?: string
  location: string
  address?: string
  capacity: number
  registeredCount: number
  registrationStatus: 'OPEN' | 'CLOSED' | 'FULL'
  registrationDeadline?: string
  fee: number
  organizer?: string
  contactEmail?: string
  contactPhone?: string
}

export interface PlatformPageResponse<T> {
  success: boolean
  data: T[]
  page: {
    page: number
    size: number
    totalElements: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
  timestamp: string
}

export interface PlatformApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}
