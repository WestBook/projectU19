# RUNBOOK — AI 兒童運動報名平台

> **更新日期：** 2026-03-06
> **對應版本：** docker-compose.yml（4 個服務：db / app / ai-agent / frontend）
> **Smoke Test：** `SMOKE_TEST.md` | **CI：** `.github/workflows/ci.yml`

---

## 目錄

1. [系統架構一覽](#1-系統架構一覽)
2. [前置條件](#2-前置條件)
3. [啟動服務](#3-啟動服務)
4. [Demo 流程](#4-demo-流程)
5. [常見生產問題排查](#5-常見生產問題排查)
6. [緊急操作](#6-緊急操作)
7. [有用指令速查](#7-有用指令速查)

---

## 1. 系統架構一覽

```
瀏覽器
  │
  │ :80 (HTTP)
  ▼
┌─────────────────────────────────────┐
│  frontend (nginx)                   │
│  /api/ai/*  → ai-agent:3001        │
│  /api/*     → app:8080             │
└─────────────────────────────────────┘
        │                   │
        ▼                   ▼
  ┌──────────┐       ┌──────────────┐
  │ ai-agent │ ───►  │  app         │
  │ Node.js  │       │  Spring Boot │
  │ :3001    │       │  :8080       │
  └──────────┘       └──────────────┘
                            │
                            ▼
                      ┌──────────┐
                      │   db     │
                      │ Postgres │
                      │ :5432    │
                      └──────────┘
```

| 服務 | 容器名稱 | 對外端口 | 角色 |
|------|---------|---------|------|
| db | sports_event_db | 5432 | PostgreSQL 資料庫 |
| app | sports_event_app | 8080 | Spring Boot API |
| ai-agent | sports_ai_agent | 3001 | Claude tool-calling 客服 |
| frontend | sports_event_frontend | 80 | React SPA + nginx 反向代理 |

---

## 2. 前置條件

### 必要工具

| 工具 | 最低版本 | 驗證指令 |
|------|---------|---------|
| Docker | 24.0 + | `docker --version` |
| Docker Compose | 2.20 + | `docker compose version` |
| Gradle Wrapper | — | `./gradlew --version` |
| curl | 7.0 + | `curl --version` |

### 環境變數設定

```bash
# 1. 複製範本
cp .env.example .env

# 2. 編輯 .env，填入以下必填值：
#    ANTHROPIC_API_KEY=sk-ant-xxxxxx  ← 必填，從 console.anthropic.com 取得
#    POSTGRES_PASSWORD=               ← 可留空（開發環境）
#    ADMIN_API_KEY=demo-admin-secret-2026  ← 預設值即可

vi .env   # 或使用任何編輯器
```

### 首次啟動前：編譯後端 JAR

```bash
# 僅首次或後端程式碼異動後需執行
./gradlew bootJar

# 驗證 JAR 存在
ls build/libs/*.jar
```

---

## 3. 啟動服務

### 完整啟動（首選）

```bash
docker compose up --build -d
```

### 等待所有服務就緒（最長約 90 秒）

```bash
# 持續觀察直到所有服務狀態變為 healthy
watch -n 3 docker compose ps

# 或手動確認（每 10 秒執行一次）
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

**預期輸出（全部就緒後）：**
```
NAME                     STATUS
sports_event_db          healthy
sports_event_app         healthy
sports_ai_agent          healthy
sports_event_frontend    healthy
```

### 快速健康驗證

```bash
# Backend
curl -s http://localhost:8080/health | python3 -m json.tool

# AI Agent
curl -s http://localhost:3001/health

# Frontend
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost/
```

### 執行 Smoke Test（完整驗證）

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
# 預期：PASS: 12  |  FAIL: 0
```

---

## 4. Demo 流程

> **建議 Demo 順序：** Frontend UI → 賽事列表 → 報名流程 → AI 客服

### Step 1：開啟前端

瀏覽器前往 **http://localhost**

應看到活動列表頁，顯示 5 筆種子賽事（含篩選器）。

---

### Step 2：展示賽事列表與篩選

**UI 操作路徑：** 首頁 → 輸入兒童年齡 `9` → 點擊「搜尋」

**後台驗證：**
```bash
# 確認 API 正確回傳年齡篩選結果
curl -s "http://localhost:8080/api/events?age=9" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'共 {d[\"page\"][\"totalElements\"]} 筆')"
```

預期：顯示 3 筆（ageMin ≤ 9 ≤ ageMax 的賽事）。

---

### Step 3：展示賽事詳情與報名

**UI 操作路徑：** 點擊「2026 春季兒童籃球營」→ 查看詳情頁 → 點擊「立即報名」

**填寫表單（示範用）：**

| 欄位 | 示範值 |
|------|-------|
| 家長姓名 | Demo 示範 |
| 家長 Email | demo@example.com |
| 家長電話 | 0912345678 |
| 兒童姓名 | 小明 |
| 兒童出生日期 | 2017-06-15 |
| 性別 | 男 |
| 緊急聯絡人 | 阿公 / 0987654321 |

**提交後**：後台應回傳 201 + 訂單編號。

**後台驗證：**
```bash
# 用 curl 直接觸發（確保後端 API 正確）
curl -s -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550e8400-e29b-41d4-a716-446655440000",
    "parent": {"name": "Demo 家長", "email": "demo@example.com", "phone": "0912345678"},
    "child": {"name": "Demo 小孩", "birthDate": "2017-06-15", "gender": "MALE"},
    "emergencyContact": {"name": "阿公", "phone": "0987654321", "relationship": "祖父母"}
  }' | python3 -m json.tool
```

---

### Step 4：展示 AI 客服

**UI 操作路徑：** 點擊右下角「客服」圖示 → 輸入問題

**建議 Demo 問題（按順序）：**

```
1. "有什麼適合 8 歲小孩的活動？"
   → 預期：AI 呼叫 searchEvents，列出符合賽事並附上連結

2. "我兒子 9 歲，對籃球有興趣，有推薦的活動嗎？"
   → 預期：AI 先呼叫 searchEvents 篩選，再呼叫 getEventDetail 取得詳情

3. "春季籃球營還有名額嗎？費用多少？"
   → 預期：AI 直接回答剩餘名額與費用，並引用 eventId

4. "請問可以報名 2030 年的活動嗎？"（測試防幻覺）
   → 預期：AI 回答「目前沒有找到符合的活動」，不捏造資料
```

**直接 API 驗證：**
```bash
curl -s -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: demo-$(date +%s)" \
  -d '{"message": "有什麼適合 8 歲小孩的活動？"}' | python3 -m json.tool
```

**注意事項：**
- AI 回應時間約 10–30 秒（視 Claude API 速度）
- 若 AI 查詢後的 `sources` 陣列有資料，點擊連結應能導向正確賽事詳情頁
- 若問題超出範疇（如「推薦餐廳」），AI 應禮貌拒絕

---

### Step 5：展示管理員功能（選用）

```bash
# 查看所有訂單（需 Admin Token）
curl -s http://localhost:8080/api/admin/orders \
  -H "X-Admin-Token: demo-admin-secret-2026" | python3 -m json.tool

# 建立新賽事
curl -s -X POST http://localhost:8080/api/admin/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: demo-admin-secret-2026" \
  -d '{
    "name": "Demo 足球夏令營",
    "description": "適合 7-12 歲兒童的足球訓練營",
    "ageMin": 7, "ageMax": 12, "strictAgeEnforcement": false,
    "startTime": "2026-07-01T09:00:00+08:00",
    "endTime": "2026-07-05T17:00:00+08:00",
    "location": "新北市立體育場",
    "address": "新北市板橋區中山路 1 號",
    "capacity": 25,
    "registrationDeadline": "2026-06-15T23:59:59+08:00",
    "fee": 3000,
    "organizer": "Demo 體育協會"
  }' | python3 -m json.tool
```

---

## 5. 常見生產問題排查

### P1：所有服務無回應（000 / Connection refused）

**症狀：** `curl: (7) Failed to connect`

```bash
# 確認容器狀態
docker compose ps

# 若有容器顯示 Exit 或 Restarting
docker compose logs --tail=50 <服務名稱>
```

**常見原因與處理：**

| 原因 | 判斷 | 處理 |
|------|------|------|
| 容器未啟動 | `docker compose ps` 顯示空白 | `docker compose up -d` |
| JAR 未編譯 | `docker compose logs app` 含 `No such file` | `./gradlew bootJar && docker compose up --build -d` |
| Port 被占用 | `lsof -i :8080` 有其他行程 | `kill <PID>` 或修改 docker-compose.yml 埠號 |

---

### P2：Backend 健康檢查失敗（`database.status: DOWN`）

**症狀：** `GET /health` 回傳 200 但 `database.status = "DOWN"`

```bash
# 檢查 DB 容器狀態
docker compose ps db
docker compose logs db --tail=30

# 確認 DB 可接受連線
docker compose exec db pg_isready -U bloodsword1147 -d sports_event_db

# 確認 Backend 環境變數設定正確
docker compose exec app env | grep SPRING_DATASOURCE
```

**處理步驟：**
```bash
# 1. 若 DB 容器未就緒，等待並重啟 app
docker compose restart app

# 2. 若 DB 資料損毀
docker compose down
docker volume rm projectu19_postgres_data   # 警告：清空所有資料
docker compose up -d
```

---

### P3：AI Agent 無法啟動（401 / ANTHROPIC_API_KEY 錯誤）

**症狀：** `docker compose logs ai-agent` 含 `ANTHROPIC_API_KEY is required` 或 AI 回應 503

```bash
# 確認 API Key 已設定
grep ANTHROPIC_API_KEY .env

# 確認 .env 已被讀取（Key 不應顯示真實值，只看是否有值）
docker compose exec ai-agent env | grep -c ANTHROPIC_API_KEY
# 輸出應為 1
```

**處理步驟：**
```bash
# 1. 編輯 .env 填入正確 Key
vi .env

# 2. 重新建立 ai-agent 容器（不影響其他服務）
docker compose up -d --no-deps --build ai-agent
```

---

### P4：AI 查詢逾時（ST-10 / ST-11 超過 60 秒）

**症狀：** `POST /api/ai/chat` 長時間無回應

```bash
# 確認 Claude API 速率限制
docker compose logs ai-agent --tail=20 | grep -i "429\|rate"
```

**處理步驟：**

| 狀況 | 處理 |
|------|------|
| HTTP 429（rate limited） | 等待 1 分鐘後重試 |
| 持續逾時 | 檢查 [Anthropic Status](https://status.anthropic.com/) |
| `CLAUDE_AUTH_ERROR` | 更換有效 API Key（見 P3）|

---

### P5：訂單建立回 409（REGISTRATION_CLOSED）

**症狀：** `POST /api/orders` 回傳 `{"error": {"code": "REGISTRATION_CLOSED"}}`

**原因：** 種子賽事報名截止日（2026-03-10）已過。

**處理：建立新測試賽事**
```bash
# 計算 30 天後的日期（macOS）
FUTURE=$(date -v +30d +%Y-%m-%dT09:00:00+08:00)
DEADLINE=$(date -v +20d +%Y-%m-%dT23:59:59+08:00)

curl -s -X POST http://localhost:8080/api/admin/events \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: demo-admin-secret-2026" \
  -d "{
    \"name\": \"測試籃球營 $(date +%m%d)\",
    \"description\": \"Smoke test 用，可安全刪除\",
    \"ageMin\": 8, \"ageMax\": 12, \"strictAgeEnforcement\": true,
    \"startTime\": \"${FUTURE}\",
    \"endTime\": \"${FUTURE}\",
    \"location\": \"測試體育館\",
    \"address\": \"測試市 1 號\",
    \"capacity\": 30,
    \"registrationDeadline\": \"${DEADLINE}\",
    \"fee\": 100,
    \"organizer\": \"QA Team\"
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])"
# 記下輸出的 UUID，更新 scripts/smoke-test.sh 中的 EVENT_ID
```

---

### P6：Frontend 回 502 Bad Gateway

**症狀：** 瀏覽器顯示 502，或 nginx proxy 相關端點無回應

```bash
# 確認 nginx 代理目標是否健康
docker compose ps app ai-agent

# 查看 nginx 錯誤日誌
docker compose logs frontend --tail=30

# 測試代理是否正確轉發
curl -v http://localhost/api/events 2>&1 | grep "< HTTP"
curl -v http://localhost/api/ai/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' 2>&1 | grep "< HTTP"
```

**常見原因：**

| 症狀 | 原因 | 處理 |
|------|------|------|
| `/api/*` 502 | `app` 容器未就緒 | `docker compose restart app` |
| `/api/ai/*` 502 | `ai-agent` 容器未就緒 | `docker compose restart ai-agent` |
| 全部 502 | nginx 啟動中 | 等待 10 秒後重試 |

---

### P7：CORS 錯誤（瀏覽器 Console）

**症狀：** 開發模式下 `Access-Control-Allow-Origin` 錯誤

```bash
# 確認是否在使用 Docker（生產模式）還是本地開發模式
# 生產模式（Docker）不會有 CORS 問題，nginx 統一代理
# 若在開發模式直接存取 :8080，需確認後端 CORS 設定

# 驗證後端 CORS headers
curl -v -H "Origin: http://localhost:5173" \
  http://localhost:8080/api/events 2>&1 | grep -i "access-control"
```

**開發模式 workaround（不更動後端）：**
```bash
# 在 frontend/ 目錄啟動 Vite dev server（已設定代理）
cd frontend && npm run dev
# Vite 自動將 /api/* 代理到 :8080，避免 CORS
```

---

### P8：資料庫 Migration 失敗

**症狀：** `docker compose logs app` 含 `Flyway migration failed`

```bash
# 查看詳細 migration 錯誤
docker compose logs app 2>&1 | grep -A 10 "Flyway\|migration"

# 查看已執行的 migration 版本（需 DB 可連）
docker compose exec db psql -U bloodsword1147 -d sports_event_db \
  -c "SELECT version, description, success FROM flyway_schema_history ORDER BY installed_on DESC LIMIT 5;"
```

**處理：**
```bash
# 若是開發環境，可清空資料重來
docker compose down
docker volume rm projectu19_postgres_data
docker compose up -d
```

> **警告：** 生產環境請勿清空 volume，應修正 migration 腳本。

---

## 6. 緊急操作

### 重啟單一服務（不影響其他服務）

```bash
docker compose restart <app|ai-agent|frontend|db>

# 若需重新建置（程式碼有變更）
docker compose up -d --no-deps --build <服務名稱>
```

### 完整重啟（保留資料）

```bash
docker compose down
docker compose up --build -d
```

### 完整重置（清空所有資料）

```bash
# 警告：會刪除所有 PostgreSQL 資料
docker compose down -v
docker compose up --build -d
```

### 即時查看日誌

```bash
# 全部服務
docker compose logs -f

# 單一服務
docker compose logs -f app
docker compose logs -f ai-agent

# 過濾錯誤
docker compose logs app 2>&1 | grep -i "error\|exception\|fatal"
```

### 進入容器除錯

```bash
# 進入後端容器
docker compose exec app sh

# 在 DB 容器執行 SQL
docker compose exec db psql -U bloodsword1147 -d sports_event_db
```

---

## 7. 有用指令速查

```bash
# ── 服務管理 ────────────────────────────────────────────────────
docker compose up --build -d          # 啟動（含重建）
docker compose down                   # 停止（保留資料）
docker compose down -v                # 停止（清空資料）
docker compose ps                     # 查看狀態
docker compose restart app            # 重啟單一服務

# ── 日誌 ────────────────────────────────────────────────────────
docker compose logs -f                # 全部服務即時日誌
docker compose logs --tail=100 app    # 後端最近 100 行
docker compose logs ai-agent | grep ERROR  # 過濾 AI Agent 錯誤

# ── 健康確認 ────────────────────────────────────────────────────
curl -s http://localhost:8080/health | python3 -m json.tool
curl -s http://localhost:3001/health
curl -s -o /dev/null -w "%{http_code}" http://localhost/

# ── Smoke Test ──────────────────────────────────────────────────
./scripts/smoke-test.sh               # 完整驗證（12 個測試）

# ── 後端重新編譯 ─────────────────────────────────────────────────
./gradlew bootJar
docker compose up -d --no-deps --build app

# ── 資料庫操作 ──────────────────────────────────────────────────
docker compose exec db psql -U bloodsword1147 -d sports_event_db
# \dt   → 列出所有資料表
# \q    → 離開

# ── CI 本地模擬 ─────────────────────────────────────────────────
cd frontend && npm ci && npm run lint && npm run test:run && npm run build
./gradlew test --no-daemon
./gradlew bootJar --no-daemon
```

---

*如遇本文未涵蓋的問題，請先查看 `docker compose logs` 輸出，並確認 `.env` 環境變數均已正確填寫。*
