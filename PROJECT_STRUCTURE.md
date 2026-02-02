# 專案結構

## 目錄結構

```
projectU19/
├── build.gradle.kts              # Gradle 建置設定
├── settings.gradle.kts           # Gradle 專案設定
├── gradle.properties             # Gradle 屬性設定
├── gradlew                       # Gradle Wrapper (Unix/Mac)
├── gradlew.bat                   # Gradle Wrapper (Windows)
├── gradle/
│   └── wrapper/
│       └── gradle-wrapper.properties
│
├── src/
│   ├── main/
│   │   ├── kotlin/com/sportsplatform/
│   │   │   ├── SportsEventPlatformApplication.kt   # 主應用程式
│   │   │   ├── config/
│   │   │   │   ├── JpaConfig.kt                    # JPA 設定
│   │   │   │   └── WebConfig.kt                    # Web/CORS 設定
│   │   │   ├── controller/
│   │   │   │   └── HealthCheckController.kt        # Health Check API
│   │   │   ├── service/                            # 業務邏輯層（待實作）
│   │   │   ├── repository/                         # 資料存取層（待實作）
│   │   │   ├── domain/                             # JPA Entities（待實作）
│   │   │   ├── dto/
│   │   │   │   └── ErrorResponse.kt                # 錯誤回應 DTO
│   │   │   └── exception/
│   │   │       ├── Exceptions.kt                   # 自訂例外類別
│   │   │       └── GlobalExceptionHandler.kt       # 全域例外處理
│   │   └── resources/
│   │       ├── application.yml                     # 主設定檔
│   │       └── application-dev.yml                 # 開發環境設定
│   └── test/
│       └── kotlin/com/sportsplatform/
│           ├── controller/                         # Controller 測試
│           ├── service/                            # Service 測試
│           └── repository/                         # Repository 測試
│
├── docs/                                           # API 文件
│   └── api/
│       ├── openapi.yaml                           # OpenAPI 規格
│       ├── ERROR_HANDLING_GUIDE.md                # 錯誤處理指南
│       ├── ERROR_CODES_REFERENCE.md               # 錯誤代碼參考
│       ├── error-codes.json                       # 錯誤代碼定義
│       └── examples/                              # API 範例
│           ├── events-api-examples.json
│           ├── event-detail-api-examples.json
│           ├── orders-api-examples.json
│           └── admin-events-api-examples.json
│
├── .gitignore                                     # Git 忽略設定
├── backend-README.md                              # 後端 README
├── SETUP.md                                       # 設定指南
├── PROJECT_STRUCTURE.md                           # 本檔案
└── AI_Sports_Event_Platform_SDD.md               # 系統設計文件
```

## 已實作模組

### 1. 應用程式主體
- **SportsEventPlatformApplication.kt**: Spring Boot 主應用程式

### 2. 設定 (config/)
- **JpaConfig.kt**: JPA 設定，啟用 Repository 和 Auditing
- **WebConfig.kt**: CORS 設定，允許前端跨域請求

### 3. Controller (controller/)
- **HealthCheckController.kt**: Health Check API
  - `GET /api/health` - 驗證服務是否運行

### 4. DTO (dto/)
- **ErrorResponse.kt**: 統一錯誤回應格式
  - 對應 API 契約定義
  - 包含 `success`, `error`, `timestamp` 欄位

### 5. Exception (exception/)
- **Exceptions.kt**: 自訂例外類別
  - `ResourceNotFoundException`: 資源不存在
  - `BusinessLogicException`: 業務邏輯錯誤
  - `ValidationException`: 參數驗證錯誤

- **GlobalExceptionHandler.kt**: 全域例外處理器
  - 處理所有例外並轉換為統一錯誤格式
  - 自動生成 traceId
  - 記錄適當的 log level

## 待實作模組

以下模組目錄已建立，等待實作：

### 1. Domain (domain/)
JPA Entity 類別：
- `Event`: 賽事實體
- `Order`: 訂單實體
- 相關的 embedded 類別（如 `AgeRestriction`）

### 2. Repository (repository/)
Spring Data JPA Repository：
- `EventRepository`
- `OrderRepository`

### 3. Service (service/)
業務邏輯層：
- `EventService`
- `OrderService`
- `AdminService`

### 4. Controller (controller/)
REST API Controllers：
- `EventController`: `/api/events`
- `OrderController`: `/api/orders`
- `AdminEventController`: `/api/admin/events`

### 5. 測試 (test/)
單元測試和整合測試：
- Controller 測試
- Service 測試
- Repository 測試

## 設定檔說明

### application.yml
主設定檔，包含：
- 資料庫連線設定
- JPA/Hibernate 設定
- Server port 設定
- Logging 設定
- Jackson JSON 設定

### application-dev.yml
開發環境設定，覆寫：
- 資料庫 DDL 策略（使用 `update`）
- 更詳細的 logging
- 顯示 SQL

## 依賴項 (build.gradle.kts)

### Spring Boot Starters
- `spring-boot-starter-web`: REST API 支援
- `spring-boot-starter-data-jpa`: JPA/Hibernate
- `spring-boot-starter-validation`: Bean Validation

### Kotlin
- `kotlin-reflect`: Kotlin 反射
- `kotlin-stdlib-jdk8`: Kotlin 標準庫
- `jackson-module-kotlin`: JSON 序列化

### 資料庫
- `postgresql`: PostgreSQL JDBC Driver

### 測試
- `spring-boot-starter-test`: Spring Boot 測試
- `spring-boot-testcontainers`: Testcontainers 整合
- `testcontainers:postgresql`: PostgreSQL Testcontainers
- `testcontainers:junit-jupiter`: JUnit 5 整合

## 錯誤處理機制

### 統一錯誤格式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "使用者可讀訊息",
    "details": [
      {
        "field": "欄位名稱",
        "reason": "錯誤原因"
      }
    ],
    "traceId": "追蹤識別碼"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 例外處理流程
1. Controller/Service 拋出自訂例外
2. GlobalExceptionHandler 捕獲例外
3. 轉換為 ErrorResponse 格式
4. 記錄 log（含 traceId）
5. 回傳適當的 HTTP status code

## API 契約

完整的 API 規格定義在 `docs/api/` 目錄：

- **openapi.yaml**: OpenAPI 3.0 規格
- **ERROR_HANDLING_GUIDE.md**: 錯誤處理詳細指南
- **ERROR_CODES_REFERENCE.md**: 錯誤代碼速查表
- **examples/**: 各 API 的請求/回應範例

## 下一步開發

### 1. 資料庫 Schema（優先）
- 建立 Flyway migration
- 定義 `events` 和 `orders` 表結構

### 2. Domain Layer
- 實作 JPA Entity 類別
- 定義 Entity 關聯

### 3. Repository Layer
- 實作 Spring Data JPA Repository
- 定義自訂查詢方法

### 4. Service Layer
- 實作業務邏輯
- 處理資料驗證
- 拋出適當的例外

### 5. Controller Layer
- 實作 REST API 端點
- 對應 OpenAPI 規格
- 加入參數驗證

### 6. 測試
- 單元測試（Service）
- 整合測試（Controller + DB）
- 使用 Testcontainers 進行 DB 測試

## 技術棧

- **語言**: Kotlin 1.9.22
- **框架**: Spring Boot 3.2.2
- **資料庫**: PostgreSQL 15+
- **建置工具**: Gradle 8.5
- **JDK**: 17

## 開發工具

建議使用：
- **IntelliJ IDEA**: 最佳 Kotlin/Spring 支援
- **DBeaver**: 資料庫管理工具
- **Postman**: API 測試工具
- **Docker**: 本地資料庫環境

## 相關文件

- [backend-README.md](backend-README.md): 如何運行專案
- [SETUP.md](SETUP.md): 環境設定指南
- [SDD](AI_Sports_Event_Platform_SDD.md): 系統設計文件
- [API 文件](docs/api/): 完整 API 規格
