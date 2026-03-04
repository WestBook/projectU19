#!/usr/bin/env bash
# scripts/smoke-test.sh
# 執行方式：chmod +x scripts/smoke-test.sh && ./scripts/smoke-test.sh
#
# 對應文件：SMOKE_TEST.md
# 涵蓋：ST-01 ~ ST-11（含 ST-06b）

set -euo pipefail

BACKEND="${BACKEND_URL:-http://localhost:8080}"
AI_AGENT="${AI_AGENT_URL:-http://localhost:3001}"
FRONTEND="${FRONTEND_URL:-http://localhost}"
EVENT_ID="550e8400-e29b-41d4-a716-446655440000"
PASS=0
FAIL=0

# ─── 輔助函式 ─────────────────────────────────────────────────────────────────

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
  curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$@"
}

http_code_slow() {
  # AI 查詢允許較長 timeout
  curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$@"
}

# ─── Flow 0: Health ──────────────────────────────────────────────────────────

echo "=== Sports Platform Smoke Tests ==="
echo ""
echo "Flow 0: Service Health"

check "ST-01" "Backend health" "200" \
  "$(http_code "${BACKEND}/health")"

check "ST-02" "AI Agent health" "200" \
  "$(http_code "${AI_AGENT}/health")"

check "ST-03" "Frontend accessible" "200" \
  "$(http_code "${FRONTEND}/")"

echo ""

# ─── Flow A: Event Listing ───────────────────────────────────────────────────

echo "Flow A: Event Listing"

check "ST-04" "GET /api/events" "200" \
  "$(http_code "${BACKEND}/api/events")"

check "ST-05" "GET /api/events?age=9" "200" \
  "$(http_code "${BACKEND}/api/events?age=9")"

check "ST-06" "GET /api/events/{id}" "200" \
  "$(http_code "${BACKEND}/api/events/${EVENT_ID}")"

check "ST-06b" "GET /api/events (invalid id → 404)" "404" \
  "$(http_code "${BACKEND}/api/events/00000000-0000-0000-0000-000000000000")"

echo ""

# ─── Flow B: Order Creation ──────────────────────────────────────────────────

echo "Flow B: Order Creation"

ORDER_PAYLOAD='{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "parent": {
    "name": "Smoke Test Parent",
    "email": "smoke@example.com",
    "phone": "0912000001"
  },
  "child": {
    "name": "Smoke Test Child",
    "birthDate": "2017-06-15",
    "gender": "OTHER"
  },
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "0987000001",
    "relationship": "親屬"
  }
}'

check "ST-07" "POST /api/orders (success → 201)" "201" \
  "$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" \
    -d "${ORDER_PAYLOAD}")"

BAD_PAYLOAD='{"eventId":"550e8400-e29b-41d4-a716-446655440000","parent":{"name":"X","email":"not-email","phone":"123"},"child":{"name":"Y","birthDate":"2099-01-01"}}'
check "ST-08" "POST /api/orders (validation → 400)" "400" \
  "$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" \
    -d "${BAD_PAYLOAD}")"

check "ST-09" "POST /api/orders (duplicate → 409)" "409" \
  "$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "${BACKEND}/api/orders" \
    -H "Content-Type: application/json" \
    -d "${ORDER_PAYLOAD}")"

echo ""

# ─── Flow C: AI Query ────────────────────────────────────────────────────────

echo "Flow C: AI Query"

SESSION_ID="smoke-$(date +%s)"

check "ST-10" "POST /api/ai/chat (direct)" "200" \
  "$(http_code_slow \
    -X POST "${AI_AGENT}/api/ai/chat" \
    -H "Content-Type: application/json" \
    -H "X-Session-Id: ${SESSION_ID}-direct" \
    -d '{"message":"有什麼活動？"}')"

check "ST-11" "POST /api/ai/chat (via nginx proxy)" "200" \
  "$(http_code_slow \
    -X POST "${FRONTEND}/api/ai/chat" \
    -H "Content-Type: application/json" \
    -H "X-Session-Id: ${SESSION_ID}-proxy" \
    -d '{"message":"你好"}')"

echo ""

# ─── Result ──────────────────────────────────────────────────────────────────

echo "=============================="
echo "  PASS: ${PASS}  |  FAIL: ${FAIL}"
echo "=============================="

if [ "$FAIL" -eq 0 ]; then
  echo "  All smoke tests PASSED"
  exit 0
else
  echo "  ${FAIL} test(s) FAILED — check SMOKE_TEST.md for troubleshooting"
  exit 1
fi
