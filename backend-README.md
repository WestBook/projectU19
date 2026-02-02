# Sports Event Platform - Backend

AI 驅動的兒童體育賽事電商平台後端 API

## 技術棧

- **語言**: Kotlin 1.9.22
- **框架**: Spring Boot 3.2.2
- **資料庫**: PostgreSQL
- **建置工具**: Gradle 8.x
- **JDK**: 17

## 專案結構

```
src/
├── main/
│   ├── kotlin/com/sportsplatform/
│   │   ├── controller/      # REST API Controllers
│   │   ├── service/         # 業務邏輯層
│   │   ├── repository/      # 資料存取層
│   │   ├── domain/          # JPA Entities
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── config/          # 設定類別
│   │   └── exception/       # 例外處理
│   └── resources/
│       ├── application.yml       # 主設定檔
│       └── application-dev.yml   # 開發環境設定
└── test/
    └── kotlin/com/sportsplatform/
        ├── controller/      # Controller 測試
        ├── service/         # Service 測試
        └── repository/      # Repository 測試
```

## 前置需求

### 1. 安裝 JDK 17

```bash
# macOS (使用 Homebrew)
brew install openjdk@17

# 驗證安裝
java -version
```

### 2. 安裝 PostgreSQL

```bash
# macOS (使用 Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 建立資料庫
createdb sports_event_db
```

或使用 Docker：

```bash
docker run --name postgres-sports \
  -e POSTGRES_DB=sports_event_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```

## 快速開始

### 1. 啟動資料庫

確保 PostgreSQL 正在運行並且已建立資料庫 `sports_event_db`。

### 2. 建置專案

```bash
# 使用 Gradle Wrapper（不需要預先安裝 Gradle）
./gradlew build
```

### 3. 運行應用程式

```bash
# 使用開發環境設定
./gradlew bootRun --args='--spring.profiles.active=dev'
```

或直接運行：

```bash
./gradlew bootRun
```

### 4. 驗證 API

應用程式啟動後，訪問 Health Check 端點：

```bash
curl http://localhost:8080/api/health
```

預期回應：

```json
{
  "status": "OK",
  "service": "Sports Event Platform API",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

## 資料庫設定

### 預設設定 (application.yml)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/sports_event_db
    username: postgres
    password: postgres
```

### 自訂資料庫連線

建立 `src/main/resources/application-local.yml`：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://your-host:5432/your-db
    username: your-username
    password: your-password
```

然後使用：

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

## API 文件

完整的 API 規格請參考：

- [OpenAPI 規格](docs/api/openapi.yaml)
- [錯誤處理指南](docs/api/ERROR_HANDLING_GUIDE.md)
- [錯誤代碼參考](docs/api/ERROR_CODES_REFERENCE.md)

### 主要 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/health` | GET | Health Check |
| `/api/events` | GET | 查詢賽事列表 |
| `/api/events/{id}` | GET | 取得賽事詳情 |
| `/api/orders` | POST | 建立報名訂單 |
| `/api/admin/events` | GET | 管理員查詢賽事 |
| `/api/admin/events` | POST | 管理員建立賽事 |

## 開發

### 運行測試

```bash
# 運行所有測試
./gradlew test

# 運行特定測試
./gradlew test --tests "ControllerTests"
```

### 程式碼檢查

```bash
./gradlew check
```

### 清理建置

```bash
./gradlew clean
```

## 錯誤處理

所有 API 錯誤回應遵循統一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "使用者可讀的錯誤訊息",
    "details": [
      {
        "field": "欄位名稱",
        "reason": "具體錯誤原因"
      }
    ],
    "traceId": "唯一追蹤識別碼"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

詳細資訊請參考 [錯誤處理指南](docs/api/ERROR_HANDLING_GUIDE.md)。

## 疑難排解

### 資料庫連線失敗

```
Error: Connection to localhost:5432 refused
```

**解決方案**：
1. 確認 PostgreSQL 正在運行：`brew services list` 或 `docker ps`
2. 檢查連線設定：`application.yml` 中的 `datasource.url`
3. 測試連線：`psql -h localhost -U postgres -d sports_event_db`

### Port 8080 已被佔用

```
Error: Port 8080 is already in use
```

**解決方案**：
1. 修改 `application.yml` 中的 `server.port`
2. 或停止佔用該 port 的程式：`lsof -ti:8080 | xargs kill`

### Gradle 建置失敗

```
Error: Could not resolve dependencies
```

**解決方案**：
1. 清理快取：`./gradlew clean build --refresh-dependencies`
2. 檢查網路連線
3. 確認 JDK 版本：`java -version`

## 相關連結

- [Spring Boot 文件](https://spring.io/projects/spring-boot)
- [Kotlin 文件](https://kotlinlang.org/docs/home.html)
- [PostgreSQL 文件](https://www.postgresql.org/docs/)
- [專案 SDD](AI_Sports_Event_Platform_SDD.md)
