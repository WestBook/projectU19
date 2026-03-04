# AI 客服 Agent — Fallback 策略設計

> **文件版本：** v1.0
> **對應模組：** `frontend/src/features/chat/orchestrator/`
> **關聯文件：** `docs/ai/prompt.md`、`docs/ai/response-schema.json`

---

## 1. 概覽

Fallback 策略的目標：

1. **不對使用者說謊**：任何失敗都不得以捏造資料填補，寧可說「暫時無法取得」
2. **不暴露技術細節**：訊息不含 HTTP 狀態碼、錯誤堆疊、API 術語
3. **提供下一步**：每個失敗回應都必須附帶至少一個可操作的建議
4. **安全降級**：部分失敗允許繼續，完全失敗才轉接人工

系統涉及三個外部依賴，每一層都可能獨立故障：

```
使用者 → [Orchestrator] → Claude API (Anthropic)
                       → Platform API (Spring Boot)
                              ↓
                         PostgreSQL
```

---

## 2. 失敗分類與錯誤碼

| 代碼 | 發生層次 | 可重試 | 說明 |
|------|---------|-------|------|
| `CLAUDE_TIMEOUT` | Claude API | ✓ | 30s 無回應（AbortController 觸發）|
| `CLAUDE_RATE_LIMITED` | Claude API | ✓ | HTTP 429，指數退避後重試 |
| `CLAUDE_SERVER_ERROR` | Claude API | ✓ | HTTP 500/502/503/529 |
| `CLAUDE_AUTH_ERROR` | Claude API | ✗ | HTTP 401，API Key 無效 |
| `CLAUDE_MAX_TOKENS` | Claude API | ✗ | 回覆被截斷（stop_reason = max_tokens）|
| `TOOL_TIMEOUT` | Tool Executor | ✓ | 單次工具呼叫超過 10s |
| `PLATFORM_404` | Platform API | ✗ | 賽事不存在或已下架 |
| `PLATFORM_RATE_LIMITED` | Platform API | ✓ | 平台 API 限流 |
| `PLATFORM_SERVER_ERROR` | Platform API | ✓ | HTTP 5xx |
| `PLATFORM_UNAVAILABLE` | Platform API | ✗ | 連線完全失敗（無法建立 TCP）|
| `UNVERIFIED_ID` | Orchestrator | ✗ | getEventDetail 收到未經 seenEventIds 驗證的 ID |
| `TOOL_LIMIT_EXCEEDED` | Orchestrator | ✗ | session 工具呼叫達 20 次上限 |
| `MAX_TURNS_EXCEEDED` | Orchestrator | ✗ | agent loop 超過 5 輪 |
| `UNKNOWN` | 任意 | △ | 未預期錯誤，保守處理為不可重試 |

---

## 3. 決策樹

```
使用者送出訊息
        │
        ▼
  ┌─────────────────────────────────┐
  │  呼叫 Claude API（含 timeout）   │
  └─────────────────────────────────┘
        │
   成功？ ─────── ✗ ──────────────────────────────────────────────────┐
        │                                                              │
        ▼ ✓                                                            ▼
  stop_reason?                                             [CLAUDE 失敗分支]
        │                                                              │
   end_turn ──► 正常回應                                               ├─ timeout / 5xx
        │                                                              │    ► 重試（最多 3 次，指數退避）
   max_tokens ──► [L2-C] 回覆截斷 Fallback                            │    ► 3 次後 ► [L3-TOTAL] 全系統 Fallback
        │                                                              │
   tool_use ──► 逐一執行工具                                           ├─ 429 rate limited
        │                                                              │    ► 重試（含 Retry-After 標頭）
        ▼                                                              │
  ┌─────────────────────────────────┐                                  ├─ 401 auth error
  │  executeToolBlock()             │                                  │    ► 立即 [L3-TOTAL]（不重試）
  │    ├─ session limit check       │                                  │
  │    ├─ seenEventIds check        │                                  └─ AbortError
  │    └─ platformFetch()           │                                       ► 等同 timeout，重試
  └─────────────────────────────────┘
        │
   工具成功？ ─── ✗ ────────────────────────────────────────┐
        │                                                     │
        ▼ ✓                                                   ▼
  tool_result 送回 Claude                         [TOOL 失敗分支]
  （下一輪 loop）                                              │
                                                              ├─ TOOL_TIMEOUT
                                                              │    ► 回傳 is_error tool_result
                                                              │    ► Claude 收到後自行措辭
                                                              │
                                                              ├─ PLATFORM_404
                                                              │    ► 回傳 is_error tool_result
                                                              │    ► 告知活動不存在，建議重新搜尋
                                                              │
                                                              ├─ PLATFORM_5xx / RATE_LIMITED
                                                              │    ► 工具層重試 1 次
                                                              │    ► 失敗 ► is_error tool_result
                                                              │
                                                              ├─ UNVERIFIED_ID
                                                              │    ► is_error tool_result（永不重試）
                                                              │
                                                              └─ TOOL_LIMIT_EXCEEDED
                                                                   ► is_error tool_result（永不重試）
                                                                   ► hitLimit=true，結束 session
```

---

## 4. 各層次 Fallback 詳述

### Layer 1：工具層（Tool Executor）失敗

工具失敗不直接呈現給使用者，而是透過 `is_error: true` 的 `tool_result` 回傳給 Claude，由 Claude 負責措辭。Orchestrator 僅在特殊情況（session 上限）才強制終止。

#### L1-A：工具呼叫 Timeout（10 秒）

```
觸發條件：platformFetch() 超過 toolTimeoutMs（10,000ms）
重試：不在工具層重試（由 Claude 決定是否再次呼叫）
tool_result content：
  { "error": true, "message": "searchEvents 失敗：工具呼叫逾時（10000ms）" }
```

Claude 預期行為：告知使用者「資料暫時無法取得，稍後再試」，並附上 `CONTACT_SUPPORT` 建議。

**使用者看到的訊息（由 Claude 產生）：**
> 「很抱歉，系統暫時無法載入賽事資訊，可能是網路連線暫時不穩定。請稍後再試，或點擊下方聯繫客服由人工協助。」

---

#### L1-B：平台 API 404（賽事不存在）

```
觸發條件：GET /api/events/{id} 回傳 HTTP 404
重試：不重試（資料已確認不存在）
tool_result content：
  { "error": true, "code": "RESOURCE_NOT_FOUND",
    "message": "找不到 ID 為 '{id}' 的賽事，可能已下架。" }
```

**使用者看到的訊息：**
> 「找不到這個活動的資訊，可能已下架或連結有誤。讓我重新為您搜尋最新的活動清單。」

**StructuredAiResponse：**
```json
{
  "answer": "找不到這個活動的資訊，可能已下架或連結有誤。讓我重新為您搜尋最新的活動清單。",
  "sources": [],
  "suggestions": [
    { "label": "重新搜尋活動", "action": "SEARCH_EVENTS" },
    { "label": "聯繫客服", "action": "CONTACT_SUPPORT" }
  ]
}
```

---

#### L1-C：平台 API 5xx / 限流

```
觸發條件：HTTP 500/502/503 或 429
重試：工具層自動重試 1 次（500ms 延遲）
若重試後仍失敗 → is_error tool_result，Claude 措辭
```

**使用者看到的訊息：**
> 「系統目前有些忙碌，無法取得賽事資訊。請稍等 1-2 分鐘後再試，感謝您的耐心等待。」

---

#### L1-D：UNVERIFIED_ID（seenEventIds 防護觸發）

```
觸發條件：getEventDetail 的 id 不在 seenEventIds 中
重試：永不重試（這是防幻覺的硬性護欄）
tool_result content：
  { "error": true, "code": "UNVERIFIED_ID",
    "message": "ID 未在本 session 的 searchEvents 結果中出現，無法查詢。" }
```

Claude 預期行為：說明需要先搜尋，引導使用者重新提問。
**此情況不應向使用者揭示 UNVERIFIED_ID 術語。**

**使用者看到的訊息：**
> 「我需要先搜尋確認活動資訊後才能回答您的問題。請問您想找什麼類型的活動呢？」

---

#### L1-E：TOOL_LIMIT_EXCEEDED（Session 工具呼叫上限）

```
觸發條件：sessionToolCount >= 20
處理：返回 is_error tool_result，同時設 hitLimit=true
Claude 預期行為：結束對話並建議重新整理頁面
```

**使用者看到的訊息：**
> 「很抱歉，這次對話已查詢了許多資訊，為了保護系統效能，暫時無法繼續自動搜尋。建議您重新整理頁面開始新對話，或直接前往活動列表頁查看。」

**StructuredAiResponse：**
```json
{
  "answer": "很抱歉，這次對話已查詢了許多資訊，為了保護系統效能，暫時無法繼續自動搜尋。建議您重新整理頁面開始新對話，或直接前往活動列表頁查看。",
  "sources": [],
  "suggestions": [
    { "label": "前往活動列表", "action": "SEARCH_EVENTS" },
    { "label": "重新開始對話", "action": "CLEAR_CHAT" },
    { "label": "聯繫客服", "action": "CONTACT_SUPPORT" }
  ],
  "meta": { "hitLimit": true }
}
```

---

### Layer 2：Claude API 失敗

當 Claude API 失敗時，Orchestrator 的 `callClaudeWithRetry()` 處理重試邏輯。重試耗盡後，Orchestrator 自行生成 fallback 回應（不依賴 Claude）。

#### L2-A：Timeout / 5xx（可重試）

```
重試策略：指數退避
  Attempt 1：立即
  Attempt 2：等待 500ms
  Attempt 3：等待 1000ms
  Attempt 4（最後）：等待 2000ms
可重試狀態碼：429, 500, 502, 503, 529 + AbortError
```

**重試全部耗盡後的 Orchestrator fallback（不經過 Claude）：**

```json
{
  "answer": "系統暫時無法處理您的請求，請稍後再試。若問題持續，歡迎聯繫我們的人工客服。",
  "sources": [],
  "suggestions": [
    { "label": "稍後重試", "action": "CLEAR_CHAT" },
    { "label": "聯繫人工客服", "action": "CONTACT_SUPPORT" }
  ],
  "meta": { "hitLimit": false }
}
```

---

#### L2-B：401 Auth Error（不重試）

```
觸發條件：Claude API 回傳 HTTP 401
重試：立即停止，不重試
處理：同 L2-A 的 Orchestrator fallback + 記錄告警 log
```

> 此情況表示 API Key 無效或已過期，需由運維人員介入，不應讓使用者等待重試。

---

#### L2-C：max_tokens（回覆截斷）

```
觸發條件：stop_reason = "max_tokens"
重試：不重試（已產生部分回覆）
處理：取用已產生的文字（若有），加上截斷提示
```

**使用者看到的訊息（附加在截斷文字後）：**
> `\n\n---\n（回覆因長度限制而截斷，請重新提問或縮短問題）`

**StructuredAiResponse：**
```json
{
  "answer": "{已產生的部分文字}\n\n---\n（回覆因長度限制而截斷，請重新提問或縮短問題）",
  "sources": [],
  "suggestions": [
    { "label": "重新提問", "action": "CLEAR_CHAT" },
    { "label": "聯繫客服", "action": "CONTACT_SUPPORT" }
  ],
  "meta": { "hitLimit": true }
}
```

---

### Layer 3：Orchestrator 上限

#### L3-A：MAX_TURNS_EXCEEDED（5 輪）

```
觸發條件：turnsUsed >= maxTurns（5）
重試：不重試（需使用者重新提問）
hitLimit：true
```

**使用者看到的訊息：**
> 「抱歉，這個問題我查詢了好幾次還是無法完整回答。建議您嘗試更具體地描述需求，例如：孩子的年齡、想參加的活動地點、或是活動名稱。」

**StructuredAiResponse：**
```json
{
  "answer": "抱歉，這個問題我查詢了好幾次還是無法完整回答。建議您嘗試更具體地描述需求，例如：孩子的年齡、想參加的活動地點、或是活動名稱。",
  "sources": [],
  "suggestions": [
    { "label": "重新描述需求", "action": "CLEAR_CHAT" },
    {
      "label": "搜尋全部活動",
      "action": "SEARCH_EVENTS",
      "params": { "searchParams": {} }
    },
    { "label": "聯繫客服", "action": "CONTACT_SUPPORT" }
  ],
  "meta": { "hitLimit": true }
}
```

---

### Layer 4：全系統不可用

當 Claude API 和 Platform API 同時失敗，或在系統維護期間，前端的 `chatApi.ts` 會捕獲錯誤並使用 mock fallback 回應。

#### L4：靜默降級（Frontend Mock Fallback）

觸發條件：`POST /api/ai/chat` 回傳任何錯誤
現有行為：隨機回傳 `MOCK_RESPONSES` 中的預設回應

**問題：** 現有 mock 回應可能包含不準確資訊（如「我建議您查看我們的春季籃球營」—捏造賽事名稱）。

**改進方案：** 將 mock 回應替換為安全的通用訊息，不涉及任何賽事細節：

```typescript
// 建議替換 chatApi.ts 中的 MOCK_RESPONSES 為：
const SAFE_FALLBACK_RESPONSES: ChatResponse[] = [
  {
    message: '系統暫時無法回應，請稍後再試，或前往活動列表直接查詢。',
    // structuredResponse 附加安全的 suggestions
  }
]
```

**L4 StructuredAiResponse（完全降級）：**
```json
{
  "answer": "很抱歉，我們的智慧客服目前暫時無法使用。您可以：\n\n1. 直接前往**活動列表**查看所有開放的賽事\n2. 聯繫我們的**人工客服**取得協助\n\n感謝您的耐心，我們正在盡快恢復服務。",
  "sources": [],
  "suggestions": [
    { "label": "前往活動列表", "action": "SEARCH_EVENTS" },
    { "label": "聯繫人工客服", "action": "CONTACT_SUPPORT" }
  ],
  "meta": { "hitLimit": true }
}
```

---

## 5. 人工轉接觸發條件

滿足以下任一條件時，`suggestions` **必須**包含 `CONTACT_SUPPORT`：

| 條件 | 說明 |
|------|------|
| Claude API 重試全數耗盡 | 服務故障，超出 AI 能力範圍 |
| Platform API 完全不可用 | 後端問題，AI 無資料可查 |
| `hitLimit: true` 且使用者重複提問 | 問題超出 Agent 處理能力 |
| `TOOL_LIMIT_EXCEEDED` | Session 資源耗盡 |
| 使用者連續 3 次收到 fallback 回應 | 需由系統計數，達標後主動提示 |
| 使用者明確說「我要找人」或「客服」 | 語意觸發，直接轉接 |

**轉接回應模板（包含在 suggestions 的同時，answer 也要主動說明）：**
```
如需由人工協助，可點擊下方「聯繫客服」按鈕，我們的客服團隊將在服務時間內盡快回覆您。
服務時間：週一至週五 09:00–18:00（國定假日除外）
```

---

## 6. 安全訊息規則（所有 Fallback 共用）

| 規則 | 範例 ✗（違規）| 範例 ✓（合規）|
|------|-------------|-------------|
| 不含 HTTP 狀態碼 | 「發生 404 錯誤」| 「找不到此活動」|
| 不含 API 術語 | 「API 呼叫 timeout」| 「資料暫時無法取得」|
| 不含 traceId（使用者層）| 「錯誤代碼 abc123」| （traceId 只在 meta 欄位中） |
| 不捏造替代資料 | 「找不到，但有類似活動 XXX」| 「找不到，建議重新搜尋」|
| 不引用未驗證的 eventId | 引用未經搜尋確認的 ID | 只使用 seenEventIds 中的 ID |
| 必須有下一步 | 「發生錯誤。」（僅此一句）| 加上 suggestions 或詢問 |

---

## 7. 前端 ChatWidget 層的 Fallback

當 Orchestrator 回傳 `hitLimit: true` 或 `suggestions` 包含 `CONTACT_SUPPORT` 時，前端 ChatWidget 應：

1. **視覺提示**：在錯誤訊息氣泡加上橘色邊框（對應 `isError: true`）
2. **停用輸入框**：若連續 3 次 `hitLimit: true`，暫時禁用輸入 30 秒，附提示「請稍等片刻後再試」
3. **突出顯示客服按鈕**：`CONTACT_SUPPORT` suggestion 按鈕使用主色強調樣式
4. **不自動重試**：使用者必須主動重新發送，避免無意識的重複請求

---

## 8. 監控與告警建議

以下情況應觸發告警（非 Fallback 文件範疇，供運維參考）：

| 指標 | 告警閾值 | 嚴重度 |
|------|---------|-------|
| Claude API 重試耗盡率 | > 5% 請求 / 5 分鐘 | High |
| Platform API 5xx 率 | > 1% 請求 / 5 分鐘 | High |
| `CLAUDE_AUTH_ERROR` 出現 | 任何一次 | Critical |
| 平均 toolCallCount per turn | > 4 | Medium（可能問題設計不良）|
| `MAX_TURNS_EXCEEDED` 率 | > 10% 請求 | Medium |
| `TOOL_LIMIT_EXCEEDED` 率 | > 1% session | Medium（可能遭濫用）|

---

## 9. 版本記錄

| 版本 | 日期 | 異動 |
|------|------|------|
| v1.0 | 2026-03-04 | 初版，涵蓋 4 層 Fallback、人工轉接條件、安全訊息規則 |
