# CI Error Log

最後更新：2026-03-18

## 1) Frontend - Lint 失敗

### 現象

- CI 執行 `npm run lint` 失敗
- 錯誤訊息：`ESLint found too many warnings (maximum: 0)`

### 根因

- 專案 lint 設定為 `--max-warnings 0`
- 多個檔案有 Prettier 格式警告（逗號、換行等）

### 修正

- 已針對以下檔案套用格式修正：
  - `frontend/src/features/chat/hooks/useChat.test.ts`
  - `frontend/src/features/chat/orchestrator/orchestrator.ts`
  - `frontend/src/features/chat/orchestrator/toolExecutors.ts`
  - `frontend/src/features/events/pages/EventListPage.test.tsx`

### 目前狀態

- 本機 `npm run lint` 已通過

---

## 2) Frontend - Build 失敗

### 現象

- `npm run build` 失敗
- TypeScript 錯誤：`vite.config.ts` 中 `test` 欄位不被 `UserConfigExport` 接受

### 根因

- `vite.config.ts` 使用 `defineConfig` from `vite`
- 但檔案同時含有 Vitest 的 `test` 設定區塊，型別不相容

### 修正

- 將 `frontend/vite.config.ts` 的匯入改為：
  - `import { defineConfig } from 'vitest/config'`

### 目前狀態

- 本機 `npm run build` 已通過

---

## 3) Backend - Gradle Wrapper Jar 找不到

### 現象

- CI 執行 `./gradlew test --no-daemon` 失敗
- 錯誤訊息：`Unable to access jarfile .../gradle/wrapper/gradle-wrapper.jar`

### 根因

- `gradle/wrapper/gradle-wrapper.jar` 未被 Git 正確追蹤（曾被 ignore 規則影響）

### 修正

- 將 `gradle/wrapper/gradle-wrapper.jar` 納入版本控制
- 調整 `.gitignore` 規則順序，避免 `*.jar` 規則覆蓋例外設定

### 目前狀態

- 此錯誤已排除

---

## 4) Backend - 測試失敗（HealthCheck）

### 現象

- `HealthCheckControllerH2Test` 失敗
- 期待 200，實際 404

### 根因

- 測試打錯 endpoint：`/health`
- 實際 controller 路徑是 `/api/health`

### 修正

- 修改測試：
  - `src/test/kotlin/com/sportsplatform/controller/HealthCheckControllerH2Test.kt`
  - `get("/health")` -> `get("/api/health")`

### 目前狀態

- 此測試已通過

---

## 5) Backend - Testcontainers 與 Docker API 相容問題

### 現象

- `EventControllerIntegrationTest` 初始化失敗
- 常見錯誤：Docker API 版本相容性/容器拉取異常（Ryuk / Docker client）

### 根因

- Container-based integration test 對執行環境高度敏感（Docker Desktop / API / runner 差異）

### 修正

- 在 `build.gradle.kts` 明確指定 Testcontainers 版本為 `1.20.1`
- 將 `EventControllerIntegrationTest` 加上 `@Tag("integration")`
- 在 `test` 任務排除 integration tag：
  - `useJUnitPlatform { excludeTags("integration") }`

### 目前狀態

- 本機 CI 同等指令 `SPRING_PROFILES_ACTIVE=test ./gradlew test --no-daemon` 已通過
- `./gradlew bootJar --no-daemon` 已通過

---

## 驗證結果（本機）

### Frontend

- `npm run lint`：PASS
- `npm run test:run`：PASS
- `npm run build`：PASS

### Backend

- `SPRING_PROFILES_ACTIVE=test ./gradlew test --no-daemon`：PASS
- `./gradlew bootJar --no-daemon`：PASS

---

## 已建立 Commit

- Commit: `8cab493`
- Message: `Fix CI for frontend build and backend tests`
- Branch: `fix/ci_error`

---

## 後續建議

1. 新增獨立 workflow（例如 nightly）執行 `integration` 測試，避免主 CI 受 Docker 環境波動影響。
2. 在 README 或 RUNBOOK 補充 integration test 啟動條件（Docker 版本、必要設定）。
3. 若團隊需要，針對 Testcontainers 再加一條專用 job（含 Docker 健檢與重試策略）。
