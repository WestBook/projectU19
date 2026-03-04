# Smoke Test — AI Sports Event Platform

> **目的：** 驗證 `docker compose up --build` 後四個服務（frontend / backend / ai-agent / db）的關鍵路徑可正常運作。
> **執行時間預估：** 約 3 分鐘（手動）/ 30 秒（自動化腳本）
> **最後更新：** 2026-03-04

---

## 目錄

1. [前置條件](#前置條件)
2. [測試矩陣](#測試矩陣)
3. [Flow 0：服務健康確認](#flow-0服務健康確認)
4. [Flow A：賽事列表](#flow-a賽事列表)
5. [Flow B：訂單建立](#flow-b訂單建立)
6. [Flow C：AI 查詢](#flow-cai-查詢)
7. [自動化腳本](#自動化腳本)
8. [常見失敗原因](#常見失敗原因)

---

## 前置條件

### 系統需求

| 工具 | 最低版本 | 驗證指令 |
|------|---------|---------|
| Docker | 24.0 + | `docker --version` |
| Docker Compose | 2.20 + | `docker compose version` |
| curl | 7.0 + | `curl --version` |
| jq（選用，美化輸出） | 1.6 + | `jq --version` |

### 啟動步驟

```bash
# 1. 複製環境變數
cp .env.example .env
# 編輯 .env，填入 ANTHROPIC_API_KEY

# 2. 編譯後端 JAR（首次或程式碼異動後需執行）
./gradlew bootJar

# 3. 啟動所有服務
docker compose up --build -d

# 4. 等待所有服務健康（最長約 90 秒）
docker compose ps   # 確認全部 Status = healthy
```

### 測試用種子資料（V2__seed_events_data.sql 已內建）

| 欄位 | 值 |
|------|-----|
| **Event ID** | `550e8400-e29b-41d4-a716-446655440000` |
| **名稱** | 2026 春季兒童籃球營 |
| **年齡範圍** | 8–12 歲（嚴格驗證） |
| **費用** | NT$1,500 |
| **容量** | 30 人 |
| **報名截止** | 2026-03-10 23:59 |
| **活動開始** | 2026-03-15 09:00 |
| **地點** | 台北市大安運動中心 |

---

## 測試矩陣

| ID | Flow | 測試項目 | 方法 | 路徑 | 預期 HTTP |
|----|------|---------|------|------|----------|
| ST-01 | 0 | Backend 健康檢查 | GET | `:8080/health` | 200 |
| ST-02 | 0 | AI Agent 健康檢查 | GET | `:3001/health` | 200 |
| ST-03 | 0 | Frontend 可存取 | GET | `:80/` | 200 |
| ST-04 | A | 取得賽事列表（無篩選） | GET | `:8080/api/events` | 200 |
| ST-05 | A | 依年齡篩選賽事 | GET | `:8080/api/events?age=9` | 200 |
| ST-06 | A | 取得單一賽事詳情 | GET | `:8080/api/events/{id}` | 200 |
| ST-07 | B | 建立訂單（成功） | POST | `:8080/api/orders` | 201 |
| ST-08 | B | 建立訂單（欄位驗證失敗） | POST | `:8080/api/orders` | 400 |
| ST-09 | B | 建立訂單（重複報名） | POST | `:8080/api/orders` | 409 |
| ST-10 | C | AI 查詢（直連 ai-agent） | POST | `:3001/api/ai/chat` | 200 |
| ST-11 | C | AI 查詢（經由 nginx 代理） | POST | `:80/api/ai/chat` | 200 |

**PASS 定義：** HTTP 狀態碼符合預期 **且** 回應 body 包含所有驗證欄位。

---

## Flow 0：服務健康確認

### ST-01：Backend 健康檢查

```bash
curl -s http://localhost:8080/health | jq .
```

**預期回應（HTTP 200）：**
```json
{
  "status": "UP",
  "service": "sports-event-platform",
  "timestamp": "2026-03-04T09:00:00Z",
  "components": {
    "database": {
      "status": "UP"
    }
  }
}
```

**通過條件：**
- HTTP 狀態碼 = 200
- `$.status` = `"UP"`
- `$.components.database.status` = `"UP"`

**失敗時：** 若 `database.status` = `"DOWN"` 表示 PostgreSQL 連線異常，檢查 `docker compose ps db`。

---

### ST-02：AI Agent 健康檢查

```bash
curl -s http://localhost:3001/health | jq .
```

**預期回應（HTTP 200）：**
```json
{
  "status": "UP",
  "service": "ai-agent",
  "timestamp": "2026-03-04T09:00:00Z"
}
```

**通過條件：**
- HTTP 狀態碼 = 200
- `$.status` = `"UP"`

---

### ST-03：Frontend 可存取

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/
```

**預期輸出：**
```
200
```

**進階驗證（確認是 React 應用而非 nginx 預設頁）：**
```bash
curl -s http://localhost/ | grep -c "react\|vite\|sports"
# 輸出 > 0 表示正確
```

---

## Flow A：賽事列表

### ST-04：取得賽事列表（無篩選）

```bash
curl -s "http://localhost:8080/api/events" | jq '{
  success: .success,
  count: (.data | length),
  first_event_id: .data[0].id,
  page: .page
}'
```

**預期回應（HTTP 200）：**
```json
{
  "success": true,
  "count": 5,
  "first_event_id": "550e8400-e29b-41d4-a716-446655440000",
  "page": {
    "page": 0,
    "size": 10,
    "totalElements": 5,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

**通過條件：**
- HTTP 狀態碼 = 200
- `$.success` = `true`
- `$.data` 為陣列且長度 ≥ 1
- `$.page.totalElements` ≥ 1
- 每個 event 包含欄位：`id`、`name`、`ageMin`、`ageMax`、`startTime`、`location`

---

### ST-05：依年齡篩選賽事

```bash
curl -s "http://localhost:8080/api/events?age=9" | jq '{
  success: .success,
  count: (.data | length),
  all_include_age_9: [.data[] | select(.ageMin <= 9 and .ageMax >= 9)] | length
}'
```

**預期回應（HTTP 200）：**
```json
{
  "success": true,
  "count": 3,
  "all_include_age_9": 3
}
```

**通過條件：**
- HTTP 狀態碼 = 200
- `all_include_age_9` = `count`（回傳的所有賽事都包含年齡 9）
- 不包含 `ageMax < 9` 或 `ageMin > 9` 的賽事

---

### ST-06：取得單一賽事詳情

```bash
EVENT_ID="550e8400-e29b-41d4-a716-446655440000"

curl -s "http://localhost:8080/api/events/${EVENT_ID}" | jq '{
  success: .success,
  id: .data.id,
  name: .data.name,
  registrationStatus: .data.registrationStatus,
  spotsLeft: (.data.capacity - .data.registeredCount)
}'
```

**預期回應（HTTP 200）：**
```json
{
  "success": true,
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "2026 春季兒童籃球營",
  "registrationStatus": "OPEN",
  "spotsLeft": 30
}
```

**通過條件：**
- HTTP 狀態碼 = 200
- `$.data.id` 與請求 ID 一致
- `$.data.ageRestriction` 包含 `minAge`、`maxAge`、`strictEnforcement`
- `$.data.fee` = `1500`
- `$.data.registrationStatus` ∈ `["OPEN", "CLOSED", "FULL"]`

**404 測試（確認錯誤處理正常）：**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:8080/api/events/00000000-0000-0000-0000-000000000000"
# 預期輸出：404
```

---

## Flow B：訂單建立

> **注意：** 種子資料報名截止日為 2026-03-10，請在此日期前執行。
> 若截止日已過，請先透過管理員 API 建立新賽事（見 [建立測試賽事](#附錄建立測試賽事)）。

### ST-07：建立訂單（成功）

```bash
curl -s -X POST "http://localhost:8080/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "parent": {
      "name": "測試家長",
      "email": "smoke-test@example.com",
      "phone": "0912345678"
    },
    "child": {
      "name": "測試小孩",
      "birthDate": "2017-06-15",
      "gender": "MALE"
    },
    "emergencyContact": {
      "name": "緊急聯絡人",
      "phone": "0987654321",
      "relationship": "祖父母"
    }
  }' | jq '{
    success: .success,
    orderId: .data.orderId,
    status: .data.status,
    paymentDeadline: .data.paymentDeadline
  }'
```

**預期回應（HTTP 201）：**
```json
{
  "success": true,
  "orderId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "status": "PENDING",
  "paymentDeadline": "2026-03-07T09:00:00Z"
}
```

**通過條件：**
- HTTP 狀態碼 = **201**
- `$.success` = `true`
- `$.data.status` = `"PENDING"`
- `$.data.orderId` 為有效 UUID 格式
- `$.data.paymentDeadline` 存在且為 ISO 8601 時間字串
- 若出現 `$.data.warnings`，不視為失敗（彈性年齡模式警告）

---

### ST-08：建立訂單（欄位驗證失敗）

```bash
curl -s -X POST "http://localhost:8080/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "parent": {
      "name": "測",
      "email": "not-an-email",
      "phone": "02-12345678"
    },
    "child": {
      "name": "小",
      "birthDate": "2030-01-01"
    }
  }' | jq '{
    success: .success,
    code: .error.code,
    fields: [.error.details[].field]
  }'
```

**預期回應（HTTP 400）：**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "fields": ["parent.name", "parent.email", "parent.phone", "child.name", "child.birthDate"]
}
```

**通過條件：**
- HTTP 狀態碼 = **400**
- `$.success` = `false`
- `$.error.code` = `"VALIDATION_ERROR"`
- `$.error.details` 為非空陣列，每筆包含 `field` 和 `reason`
- `$.error.traceId` 存在（可用於 log 追蹤）

---

### ST-09：建立訂單（重複報名）

> 前提：ST-07 已成功建立一筆訂單。

```bash
curl -s -X POST "http://localhost:8080/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "parent": {
      "name": "不同家長",
      "email": "another@example.com",
      "phone": "0922222222"
    },
    "child": {
      "name": "測試小孩",
      "birthDate": "2017-06-15"
    }
  }' | jq '{
    success: .success,
    code: .error.code
  }'
```

**預期回應（HTTP 409）：**
```json
{
  "success": false,
  "code": "DUPLICATE_REGISTRATION"
}
```

**通過條件：**
- HTTP 狀態碼 = **409**
- `$.error.code` = `"DUPLICATE_REGISTRATION"`

---

## Flow C：AI 查詢

> **注意：** 需在 `.env` 中設定有效的 `ANTHROPIC_API_KEY`，否則 ST-10 和 ST-11 將失敗。

### ST-10：AI 查詢（直連 ai-agent）

```bash
curl -s -X POST "http://localhost:3001/api/ai/chat" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: smoke-test-$(date +%s)" \
  -d '{
    "message": "有什麼適合 9 歲小孩的活動？"
  }' | jq '{
    success: .success,
    has_message: (.message | length > 0),
    has_sources: (.structured.sources | type),
    has_suggestions: (.structured.suggestions | type),
    tool_calls: .meta.toolCallCount
  }'
```

**預期回應（HTTP 200，約 10-30 秒）：**
```json
{
  "success": true,
  "has_message": true,
  "has_sources": "array",
  "has_suggestions": "array",
  "tool_calls": 1
}
```

**通過條件：**
- HTTP 狀態碼 = **200**
- `$.success` = `true`
- `$.message` 為非空字串，包含繁體中文
- `$.message` 不包含 `"HTTP"`、`"API"`、`"error"` 等技術術語
- `$.structured.sources` 為陣列（可為空，若無賽事符合）
- `$.structured.suggestions` 為陣列，長度 0–4
- `$.meta.toolCallCount` ≥ 1（表示確實查詢了後端）
- 若 `sources` 非空，每筆包含 `eventId`（有效 UUID）、`url`（以 `/events/` 開頭）

**驗證 eventId 不為捏造：**
```bash
# 取出 AI 回應中的 eventId，確認可在 /api/events/{id} 查到
SOURCE_ID=$(curl -s -X POST "http://localhost:3001/api/ai/chat" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: smoke-verify-$(date +%s)" \
  -d '{"message": "有什麼適合 9 歲小孩的活動？"}' \
  | jq -r '.structured.sources[0].eventId // empty')

if [ -n "$SOURCE_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:8080/api/events/${SOURCE_ID}")
  echo "Source event ${SOURCE_ID} → HTTP ${STATUS}"
  # 預期：200
fi
```

---

### ST-11：AI 查詢（經由 nginx 代理）

驗證 nginx `/api/ai/` → ai-agent 的代理設定正確：

```bash
curl -s -X POST "http://localhost/api/ai/chat" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: smoke-proxy-$(date +%s)" \
  -d '{
    "message": "你好，請問你能幫我做什麼？"
  }' | jq '{
    success: .success,
    has_response: (.message | length > 0)
  }'
```

**預期回應（HTTP 200）：**
```json
{
  "success": true,
  "has_response": true
}
```

**通過條件：**
- HTTP 狀態碼 = **200**（若 nginx 代理失敗會是 **502**）
- `$.success` = `true`
- 此測試不需要工具呼叫（問候語不觸發 searchEvents）

---

## 自動化腳本

將以下腳本存為 `scripts/smoke-test.sh` 並執行：

```bash
#!/usr/bin/env bash
# scripts/smoke-test.sh
# 執行方式：chmod +x scripts/smoke-test.sh && ./scripts/smoke-test.sh

set -euo pipefail

BACKEND="http://localhost:8080"
AI_AGENT="http://localhost:3001"
FRONTEND="http://localhost"
EVENT_ID="550e8400-e29b-41d4-a716-446655440000"
PASS=0
FAIL=0

check() {
  local id="$1" desc="$2" expected="$3" actual="$4"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ ${id} ${desc}"
    ((PASS++))
  else
    echo "  ✗ ${id} ${desc} — expected ${expected}, got ${actual}"
    ((FAIL++))
  fi
}

http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

echo "=== Sports Platform Smoke Tests ==="
echo ""

# ── Flow 0: Health ───────────────────────────────────────────────────────────
echo "Flow 0: Service Health"

check "ST-01" "Backend health" "200" \
  "$(http_code "${BACKEND}/health")"

check "ST-02" "AI Agent health" "200" \
  "$(http_code "${AI_AGENT}/health")"

check "ST-03" "Frontend accessible" "200" \
  "$(http_code "${FRONTEND}/")"

echo ""

# ── Flow A: Event Listing ─────────────────────────────────────────────────────
echo "Flow A: Event Listing"

check "ST-04" "GET /api/events" "200" \
  "$(http_code "${BACKEND}/api/events")"

check "ST-05" "GET /api/events?age=9" "200" \
  "$(http_code "${BACKEND}/api/events?age=9")"

check "ST-06" "GET /api/events/{id}" "200" \
  "$(http_code "${BACKEND}/api/events/${EVENT_ID}")"

# 確認 404 正確返回
check "ST-06b" "GET /api/events (invalid id → 404)" "404" \
  "$(http_code "${BACKEND}/api/events/00000000-0000-0000-0000-000000000000")"

echo ""

# ── Flow B: Order Creation ────────────────────────────────────────────────────
echo "Flow B: Order Creation"

ORDER_PAYLOAD='{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "parent": {"name": "Smoke Test Parent", "email": "smoke@example.com", "phone": "0912000001"},
  "child": {"name": "Smoke Test Child", "birthDate": "2017-06-15", "gender": "OTHER"},
  "emergencyContact": {"name": "Emergency", "phone": "0987000001"}
}'

check "ST-07" "POST /api/orders (success → 201)" "201" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" -d "${ORDER_PAYLOAD}")"

BAD_PAYLOAD='{"eventId":"550e8400-e29b-41d4-a716-446655440000","parent":{"name":"X","email":"bad","phone":"123"},"child":{"name":"Y","birthDate":"2099-01-01"}}'
check "ST-08" "POST /api/orders (validation → 400)" "400" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" -d "${BAD_PAYLOAD}")"

check "ST-09" "POST /api/orders (duplicate → 409)" "409" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" -d "${ORDER_PAYLOAD}")"

echo ""

# ── Flow C: AI Query ──────────────────────────────────────────────────────────
echo "Flow C: AI Query"

SESSION_ID="smoke-$(date +%s)"

check "ST-10" "POST /api/ai/chat (direct)" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${AI_AGENT}/api/ai/chat" \
    -H "Content-Type: application/json" \
    -H "X-Session-Id: ${SESSION_ID}-direct" \
    --max-time 60 \
    -d '{"message":"有什麼活動？"}')"

check "ST-11" "POST /api/ai/chat (via nginx proxy)" "200" \
  "$(curl -s -o /dev/null -w "%{http_code}" -X POST "${FRONTEND}/api/ai/chat" \
    -H "Content-Type: application/json" \
    -H "X-Session-Id: ${SESSION_ID}-proxy" \
    --max-time 60 \
    -d '{"message":"你好"}')"

echo ""

# ── Result ────────────────────────────────────────────────────────────────────
echo "=============================="
echo "  PASS: ${PASS}  |  FAIL: ${FAIL}"
echo "=============================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
```

執行方式：

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

**預期輸出（全部通過）：**
```
=== Sports Platform Smoke Tests ===

Flow 0: Service Health
  ✓ ST-01 Backend health
  ✓ ST-02 AI Agent health
  ✓ ST-03 Frontend accessible

Flow A: Event Listing
  ✓ ST-04 GET /api/events
  ✓ ST-05 GET /api/events?age=9
  ✓ ST-06 GET /api/events/{id}
  ✓ ST-06b GET /api/events (invalid id → 404)

Flow B: Order Creation
  ✓ ST-07 POST /api/orders (success → 201)
  ✓ ST-08 POST /api/orders (validation → 400)
  ✓ ST-09 POST /api/orders (duplicate → 409)

Flow C: AI Query
  ✓ ST-10 POST /api/ai/chat (direct)
  ✓ ST-11 POST /api/ai/chat (via nginx proxy)

==============================
  PASS: 12  |  FAIL: 0
==============================
```

---

## 常見失敗原因

| 失敗症狀 | 可能原因 | 排查指令 |
|---------|---------|---------|
| ST-01 backend 回 503 | DB 連線失敗 | `docker compose logs db` |
| ST-01 backend 回 200 但 `database.status=DOWN` | PostgreSQL 啟動中 | 等待 30 秒後重試 |
| ST-02 ai-agent 無回應 | `ANTHROPIC_API_KEY` 未設定 | `docker compose logs ai-agent` |
| ST-03 frontend 回 502 | nginx 啟動中 | `docker compose ps frontend` |
| ST-07 訂單建立回 409 (`REGISTRATION_CLOSED`) | 報名截止日已過 | 見附錄 |
| ST-10/ST-11 超時 (>60s) | Claude API 速率限制 | 等待 1 分鐘後重試 |
| ST-11 回 502 | nginx 代理設定錯誤 | `docker compose logs frontend` |
| 任何服務回 000 | 容器尚未啟動 | `docker compose ps` → 等待 healthy |

---

## 附錄：建立測試賽事

若種子賽事的報名截止日已過，可透過管理員 API 建立新賽事：

```bash
# 替換日期為未來日期
FUTURE_DATE=$(date -v +30d +%Y-%m-%d 2>/dev/null || date -d "+30 days" +%Y-%m-%d)
DEADLINE=$(date -v +20d +%Y-%m-%d 2>/dev/null || date -d "+20 days" +%Y-%m-%d)

curl -s -X POST "http://localhost:8080/api/admin/events" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: demo-admin-secret-2026" \
  -d "{
    \"name\": \"Smoke Test 籃球營\",
    \"description\": \"Smoke test 用賽事，可安全刪除\",
    \"ageMin\": 8,
    \"ageMax\": 12,
    \"strictAgeEnforcement\": true,
    \"startTime\": \"${FUTURE_DATE}T09:00:00+08:00\",
    \"endTime\": \"${FUTURE_DATE}T12:00:00+08:00\",
    \"location\": \"Smoke Test 體育館\",
    \"address\": \"測試市測試區測試路 1 號\",
    \"capacity\": 30,
    \"registrationDeadline\": \"${DEADLINE}T23:59:59+08:00\",
    \"fee\": 100,
    \"organizer\": \"QA Team\"
  }" | jq '.data.id'
# 複製輸出的 UUID，取代腳本中的 EVENT_ID
```
