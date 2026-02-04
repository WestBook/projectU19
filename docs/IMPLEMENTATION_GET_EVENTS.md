# GET /api/events 實作文件

## 概述

本文件記錄 GET /api/events API 端點的實作細節。

## 實作日期

2026-02-04

## 實作內容

### 1. Domain Layer

#### Event Entity (`src/main/kotlin/com/sportsplatform/domain/Event.kt`)
- 對應 `events` 資料表
- 使用 JPA annotations 進行 ORM 映射
- 包含完整的賽事資訊欄位

### 2. Repository Layer

#### EventRepository (`src/main/kotlin/com/sportsplatform/repository/EventRepository.kt`)
- 繼承 `JpaRepository` 提供基本 CRUD 操作
- 實作 `JpaSpecificationExecutor` 支援動態查詢

#### EventSpecifications (`src/main/kotlin/com/sportsplatform/repository/EventSpecifications.kt`)
- 使用 JPA Criteria API 實作動態查詢條件
- 支援以下篩選條件：
  - `hasAge`: 依參賽者年齡篩選（age_min <= age <= age_max）
  - `startTimeFrom`: 依賽事開始日期篩選（起始日期）
  - `startTimeTo`: 依賽事開始日期篩選（結束日期）
  - `hasLocation`: 依地點模糊比對篩選

### 3. Service Layer

#### EventService (`src/main/kotlin/com/sportsplatform/service/EventService.kt`)
- 處理賽事查詢業務邏輯
- 組合多個查詢條件
- 處理分頁與排序
- 轉換 Entity 為 DTO

主要方法：
- `getEvents()`: 查詢賽事列表，支援過濾、分頁與排序
- `parseSort()`: 解析排序參數（startTime,asc 或 startTime,desc）

### 4. Controller Layer

#### EventController (`src/main/kotlin/com/sportsplatform/controller/EventController.kt`)
- 處理 HTTP 請求
- 請求參數驗證
- 調用 Service 層

#### 請求參數

**篩選參數：**
- `age`: 參賽者年齡（1-18）
- `dateFrom`: 賽事開始日期區間起點（ISO 8601 date format）
- `dateTo`: 賽事開始日期區間終點（ISO 8601 date format）
- `location`: 地點（模糊比對）

**分頁參數：**
- `page`: 頁碼（從 0 開始，預設 0）
- `size`: 每頁筆數（1-100，預設 10）

**排序參數：**
- `sort`: 排序方式（startTime,asc 或 startTime,desc，預設 startTime,asc）

#### 參數驗證規則

- age: 必須介於 1 到 18 之間
- dateFrom/dateTo: 結束日期不可早於開始日期
- page: 必須 >= 0
- size: 必須介於 1 到 100 之間
- sort: 只能是 startTime,asc 或 startTime,desc

### 5. DTO Layer

#### DTOs (`src/main/kotlin/com/sportsplatform/dto/EventDto.kt`)

**EventDto：**
- 對應 OpenAPI Event schema
- 包含基本賽事資訊（id, name, ageMin, ageMax, startTime, location）

**PageInfo：**
- 對應 OpenAPI PageInfo schema
- 包含分頁元資訊（page, size, totalElements, totalPages, hasNext, hasPrevious）

**EventPageResponse：**
- 對應 OpenAPI EventPageResponse schema
- 統一的 API 回應格式（success, data, page, timestamp）

### 6. Testing

#### Integration Test (`src/test/kotlin/com/sportsplatform/controller/EventControllerH2Test.kt`)

使用 H2 內存資料庫進行整合測試，涵蓋以下測試案例：

**成功案例：**
1. 查詢所有賽事（預設分頁）
2. 依年齡篩選賽事
3. 依日期區間篩選賽事
4. 依地點篩選賽事
5. 分頁功能測試（第一頁、第二頁、第三頁）
6. 排序測試（升序、降序）
7. 組合多個篩選條件
8. 查詢結果為空

**錯誤案例：**
1. 無效的年齡參數（超出範圍）
2. 無效的日期區間（結束日期早於開始日期）
3. 無效的 page 參數（負數）
4. 無效的 size 參數（超出範圍）
5. 無效的 sort 參數

**測試結果：** ✅ 所有 14 個測試案例通過

## API 回應範例

### 成功回應

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "2026 春季兒童籃球營",
      "ageMin": 8,
      "ageMax": 12,
      "startTime": "2026-03-15T09:00:00+08:00",
      "location": "台北市大安運動中心"
    }
  ],
  "page": {
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "timestamp": "2026-02-04T15:30:00+08:00"
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "年齡參數必須介於 1 到 18 之間",
    "details": [
      {
        "field": "age",
        "reason": "must be between 1 and 18"
      }
    ],
    "traceId": "abc123def456"
  },
  "timestamp": "2026-02-04T15:30:00+08:00"
}
```

## 技術實作細節

### 動態查詢實作

使用 Spring Data JPA Specification 模式：
1. 定義各個查詢條件的 Specification
2. 使用 `Specification.where()` 和 `.and()` 組合多個條件
3. 支援 null 參數（當參數為 null 時，該條件不生效）

### 日期處理

- 使用 `java.time.Instant` 儲存時間戳記
- 使用 `java.time.LocalDate` 接收前端日期參數
- 在 Specification 中轉換為 Instant 並考慮時區（Asia/Taipei）
- dateTo 參數會包含當天所有時間（加一天後再比較）

### 排序實作

- 支援 `startTime,asc` 和 `startTime,desc` 兩種格式
- 解析字串並轉換為 Spring Data Sort 物件
- 預設排序為 startTime 升序

### 錯誤處理

- Controller 層進行參數驗證
- 驗證失敗時拋出 `ValidationException`
- 由 `GlobalExceptionHandler` 統一處理並返回標準錯誤格式

## 符合 OpenAPI 規格

✅ 所有請求參數符合 openapi.yaml 定義
✅ 回應格式符合 EventPageResponse schema
✅ 錯誤格式符合 ErrorResponse schema
✅ 參數驗證規則符合規格
✅ HTTP 狀態碼符合規格（200, 400, 500）

## 效能考量

1. **資料庫索引：** 已在 migration 中建立適當的索引
   - `idx_events_start_time`: 支援時間範圍查詢
   - `idx_events_location`: 支援地點查詢
   - `idx_events_age_range`: 支援年齡範圍查詢

2. **分頁：** 使用 Spring Data Pageable 避免一次載入過多資料

3. **DTO 轉換：** 只返回必要欄位，減少資料傳輸量

## 未來改進建議

1. 新增快取機制（Redis）減少資料庫查詢
2. 支援更多排序欄位（name, location, fee 等）
3. 支援更複雜的篩選條件（費用範圍、容量範圍等）
4. 新增全文搜尋功能
5. 支援地理位置查詢（依距離排序）

## 相關檔案

- OpenAPI 規格：`docs/api/openapi.yaml`
- 資料庫 Schema：`docs/SCHEMA.md`
- Migration 檔案：`src/main/resources/db/migration/V1__create_events_and_orders_tables.sql`
