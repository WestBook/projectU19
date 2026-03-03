/**
 * AI Orchestrator — Tool Executors
 *
 * 每個 tool executor 對應 docs/ai/tools.json 中的一個工具。
 * 職責：接收 Claude 的 tool input → 呼叫平台 REST API → 回傳格式化字串結果。
 *
 * 設計原則：
 * - 回傳值為純文字（JSON 序列化），讓 Claude 能直接解析
 * - 任何 HTTP 錯誤都轉換為友善的錯誤描述，而非拋出例外
 * - 記錄所有出現過的 eventId 到 seenEventIds（防幻覺驗證用）
 */

import type {
  SearchEventsInput,
  GetEventDetailInput,
  PlatformPageResponse,
  PlatformApiResponse,
  PlatformEvent,
  PlatformEventDetail,
} from './types'

// ─── Timeout 工具函式 ────────────────────────────────────────────────────────

/**
 * 為任意 Promise 加上超時。
 * 超時後丟出錯誤（由呼叫方轉換為 tool_result is_error: true）。
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[${label}] 工具呼叫逾時（${timeoutMs}ms）`))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

// ─── Fetch 輔助函式 ──────────────────────────────────────────────────────────

async function platformFetch<T>(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(path, baseUrl)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } }
    const code = body.error?.code ?? 'UNKNOWN_ERROR'
    const message = body.error?.message ?? `HTTP ${response.status}`
    throw Object.assign(new Error(message), { code, statusCode: response.status })
  }

  return response.json() as Promise<T>
}

// ─── Tool: searchEvents ──────────────────────────────────────────────────────

/**
 * 呼叫 GET /api/events，將結果序列化為 Claude 可讀的文字。
 * 同時將所有回傳的 eventId 記錄至 seenEventIds。
 */
export async function executeSearchEvents(
  input: SearchEventsInput,
  platformBaseUrl: string,
  toolTimeoutMs: number,
  seenEventIds: Set<string>
): Promise<string> {
  const params: Record<string, string | number | undefined> = {
    age: input.age,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    location: input.location,
    page: input.page ?? 0,
    size: Math.min(input.size ?? 10, 20),
  }

  const doFetch = platformFetch<PlatformPageResponse<PlatformEvent>>(
    platformBaseUrl,
    '/api/events',
    params
  )

  let result: PlatformPageResponse<PlatformEvent>
  try {
    result = await withTimeout(doFetch, toolTimeoutMs, 'searchEvents')
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤'
    return JSON.stringify({ error: true, message: `searchEvents 失敗：${msg}` })
  }

  // 記錄合法 eventId
  for (const event of result.data) {
    seenEventIds.add(event.id)
  }

  if (result.data.length === 0) {
    return JSON.stringify({
      found: 0,
      events: [],
      message: '沒有符合條件的賽事。建議放寬年齡、地點或日期範圍。',
      page: result.page,
    })
  }

  return JSON.stringify({
    found: result.page.totalElements,
    events: result.data.map((e) => ({
      id: e.id,
      name: e.name,
      ageRange: `${e.ageMin}-${e.ageMax} 歲`,
      startTime: e.startTime,
      location: e.location,
      registrationStatus: e.registrationStatus,
    })),
    page: result.page,
  })
}

// ─── Tool: getEventDetail ────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 呼叫 GET /api/events/{id}，將完整賽事資訊序列化為 Claude 可讀文字。
 * 只允許呼叫已出現在 seenEventIds 中的 ID（防幻覺）。
 */
export async function executeGetEventDetail(
  input: GetEventDetailInput,
  platformBaseUrl: string,
  toolTimeoutMs: number,
  seenEventIds: Set<string>
): Promise<string> {
  const { id } = input

  // 防幻覺：只允許工具回傳過的合法 ID
  if (!UUID_REGEX.test(id)) {
    return JSON.stringify({
      error: true,
      code: 'INVALID_ID_FORMAT',
      message: `ID "${id}" 格式不正確，必須為有效 UUID。`,
    })
  }

  if (!seenEventIds.has(id)) {
    return JSON.stringify({
      error: true,
      code: 'UNVERIFIED_ID',
      message: `ID "${id}" 未在本 session 的 searchEvents 結果中出現，無法查詢。請先呼叫 searchEvents 取得合法 ID。`,
    })
  }

  const doFetch = platformFetch<PlatformApiResponse<PlatformEventDetail>>(
    platformBaseUrl,
    `/api/events/${id}`
  )

  let result: PlatformApiResponse<PlatformEventDetail>
  try {
    result = await withTimeout(doFetch, toolTimeoutMs, 'getEventDetail')
  } catch (err) {
    const apiErr = err as { code?: string; statusCode?: number; message?: string }

    if (apiErr.statusCode === 404) {
      return JSON.stringify({
        error: true,
        code: 'RESOURCE_NOT_FOUND',
        message: `找不到 ID 為 "${id}" 的賽事，可能已下架。`,
      })
    }

    const msg = err instanceof Error ? err.message : '未知錯誤'
    return JSON.stringify({ error: true, message: `getEventDetail 失敗：${msg}` })
  }

  const d = result.data
  const spotsLeft = d.capacity - d.registeredCount

  return JSON.stringify({
    id: d.id,
    name: d.name,
    description: d.description ?? null,
    ageRestriction: {
      minAge: d.ageRestriction.minAge,
      maxAge: d.ageRestriction.maxAge,
      description: d.ageRestriction.description,
      strictEnforcement: d.ageRestriction.strictEnforcement ?? true,
    },
    schedule: {
      startTime: d.startTime,
      endTime: d.endTime ?? null,
      registrationDeadline: d.registrationDeadline ?? null,
    },
    venue: {
      location: d.location,
      address: d.address ?? null,
    },
    capacity: {
      total: d.capacity,
      registered: d.registeredCount,
      spotsLeft,
    },
    registrationStatus: d.registrationStatus,
    fee: d.fee,
    contact: {
      organizer: d.organizer ?? null,
      email: d.contactEmail ?? null,
      phone: d.contactPhone ?? null,
    },
  })
}
