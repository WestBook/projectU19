# 錯誤代碼速查表

快速參考指南，列出所有 API 錯誤代碼與對應的 HTTP 狀態碼。

## 速查表

| HTTP Status | 錯誤代碼 | 訊息範例 | 使用場景 |
|-------------|----------|----------|----------|
| **400** | **INVALID_PARAMETER** | 年齡參數必須介於 1 到 18 之間 | 單一參數值不符合規則 |
| **400** | **VALIDATION_ERROR** | 請求參數驗證失敗 | 多個欄位驗證失敗 |
| **400** | **INVALID_DATE_FORMAT** | 日期格式錯誤，請使用 YYYY-MM-DD 格式 | 日期格式不正確 |
| **400** | **INVALID_EMAIL_FORMAT** | 電子郵件格式不正確 | Email 格式錯誤 |
| **400** | **INVALID_PHONE_FORMAT** | 電話格式不正確 | 電話格式錯誤 |
| **400** | **MISSING_REQUIRED_FIELD** | 缺少必填欄位 | 請求缺少必要參數 |
| **401** | **UNAUTHORIZED** | 未提供有效的認證憑證 | 未認證或 token 無效 |
| **401** | **TOKEN_EXPIRED** | Token 已過期 | JWT token 過期 |
| **401** | **INVALID_CREDENTIALS** | 認證憑證無效 | 帳號密碼錯誤 |
| **403** | **FORBIDDEN** | 您沒有權限執行此操作 | 權限不足（非管理員）|
| **403** | **INSUFFICIENT_PERMISSIONS** | 權限不足 | 更具體的權限錯誤 |
| **404** | **RESOURCE_NOT_FOUND** | 找不到指定的資源 | 通用資源不存在 |
| **404** | **EVENT_NOT_FOUND** | 找不到指定的賽事 | 賽事不存在 |
| **404** | **ORDER_NOT_FOUND** | 找不到指定的訂單 | 訂單不存在 |
| **409** | **AGE_NOT_ELIGIBLE** | 小孩年齡不符合賽事年齡限制 | 年齡不在允許範圍 |
| **409** | **EVENT_FULL** | 賽事名額已滿，無法報名 | 賽事名額已滿 |
| **409** | **REGISTRATION_CLOSED** | 賽事報名已截止 | 超過報名截止時間 |
| **409** | **DUPLICATE_REGISTRATION** | 此小孩已報名該賽事 | 重複報名 |
| **409** | **INVALID_STATUS_TRANSITION** | 狀態轉換不合法 | 訂單狀態轉換違規 |
| **500** | **INTERNAL_SERVER_ERROR** | 系統發生非預期錯誤，請稍後再試 | 系統內部錯誤 |
| **500** | **SERVICE_UNAVAILABLE** | 服務暫時無法使用 | 服務暫時不可用 |
| **500** | **DATABASE_ERROR** | 資料庫錯誤 | 資料庫連線或操作失敗 |

## 按 API 分類

### GET /api/events

| 狀態碼 | 錯誤代碼 | 說明 |
|--------|----------|------|
| 400 | INVALID_PARAMETER | 年齡/分頁參數錯誤 |
| 400 | INVALID_DATE_FORMAT | 日期格式錯誤 |
| 500 | INTERNAL_SERVER_ERROR | 系統錯誤 |

### GET /api/events/{id}

| 狀態碼 | 錯誤代碼 | 說明 |
|--------|----------|------|
| 400 | INVALID_PARAMETER | ID 格式不正確 |
| 404 | RESOURCE_NOT_FOUND | 賽事不存在 |
| 500 | INTERNAL_SERVER_ERROR | 系統錯誤 |

### POST /api/orders

| 狀態碼 | 錯誤代碼 | 說明 |
|--------|----------|------|
| 400 | VALIDATION_ERROR | 參數驗證失敗 |
| 400 | INVALID_EMAIL_FORMAT | Email 格式錯誤 |
| 400 | INVALID_PHONE_FORMAT | 電話格式錯誤 |
| 404 | EVENT_NOT_FOUND | 賽事不存在 |
| 409 | AGE_NOT_ELIGIBLE | 年齡不符合限制 |
| 409 | EVENT_FULL | 名額已滿 |
| 409 | REGISTRATION_CLOSED | 報名已截止 |
| 409 | DUPLICATE_REGISTRATION | 重複報名 |
| 500 | INTERNAL_SERVER_ERROR | 系統錯誤 |

### GET /api/admin/events

| 狀態碼 | 錯誤代碼 | 說明 |
|--------|----------|------|
| 401 | UNAUTHORIZED | 未認證 |
| 403 | FORBIDDEN | 非管理員 |
| 500 | INTERNAL_SERVER_ERROR | 系統錯誤 |

### POST /api/admin/events

| 狀態碼 | 錯誤代碼 | 說明 |
|--------|----------|------|
| 400 | VALIDATION_ERROR | 參數驗證失敗 |
| 401 | UNAUTHORIZED | 未認證 |
| 403 | FORBIDDEN | 非管理員 |
| 500 | INTERNAL_SERVER_ERROR | 系統錯誤 |

## 錯誤處理決策樹

```
收到 API 錯誤
    │
    ├─ HTTP 400 (Bad Request)
    │   ├─ VALIDATION_ERROR → 顯示欄位錯誤訊息
    │   ├─ INVALID_PARAMETER → 顯示參數錯誤提示
    │   └─ INVALID_*_FORMAT → 顯示格式錯誤說明
    │
    ├─ HTTP 401 (Unauthorized)
    │   └─ UNAUTHORIZED → 導向登入頁面
    │
    ├─ HTTP 403 (Forbidden)
    │   └─ FORBIDDEN → 顯示權限不足頁面
    │
    ├─ HTTP 404 (Not Found)
    │   └─ *_NOT_FOUND → 顯示 404 頁面
    │
    ├─ HTTP 409 (Conflict)
    │   ├─ AGE_NOT_ELIGIBLE → 建議其他適合年齡的活動
    │   ├─ EVENT_FULL → 提供候補或其他活動
    │   ├─ REGISTRATION_CLOSED → 建議其他時段活動
    │   └─ DUPLICATE_REGISTRATION → 查看已報名的訂單
    │
    └─ HTTP 500 (Internal Server Error)
        └─ INTERNAL_SERVER_ERROR → 顯示錯誤訊息與 traceId
```

## 前端錯誤訊息建議

### 一般使用者可見訊息

| 錯誤代碼 | 建議顯示訊息 |
|----------|--------------|
| INVALID_PARAMETER | 「{欄位}的值不正確，{reason}」|
| VALIDATION_ERROR | 「請檢查以下欄位：{列出錯誤欄位}」|
| EVENT_NOT_FOUND | 「找不到這個活動，可能已被刪除或連結有誤」|
| AGE_NOT_ELIGIBLE | 「您的小孩年齡（{age}歲）不符合本活動的年齡限制（{min}-{max}歲）」|
| EVENT_FULL | 「很抱歉，本活動名額已滿」|
| REGISTRATION_CLOSED | 「報名已於 {deadline} 截止」|
| DUPLICATE_REGISTRATION | 「您已經為這位小朋友報名過此活動」|
| UNAUTHORIZED | 「請先登入」|
| FORBIDDEN | 「您沒有權限進行此操作」|
| INTERNAL_SERVER_ERROR | 「系統發生錯誤，請稍後再試或聯繫客服（錯誤代碼：{traceId}）」|

### AI Agent 回應建議

| 錯誤代碼 | AI 回應模板 |
|----------|-------------|
| AGE_NOT_ELIGIBLE | 「這個活動適合 {min}-{max} 歲的小朋友，您提到的小孩 {age} 歲暫時不符合資格。我可以幫您找其他適合的活動嗎？」|
| EVENT_FULL | 「很抱歉，這個活動目前已額滿。我可以為您：1) 查詢其他時段 2) 推薦類似活動」|
| REGISTRATION_CLOSED | 「這個活動的報名已在 {deadline} 截止。讓我為您找找其他即將開始的活動吧！」|
| EVENT_NOT_FOUND | 「找不到這個活動，可能資訊已過期。讓我重新為您搜尋最新的活動清單。」|

## 實作範例

### Kotlin (Spring Boot)

```kotlin
enum class ErrorCode(val code: String, val httpStatus: HttpStatus) {
    // 400 errors
    INVALID_PARAMETER("INVALID_PARAMETER", HttpStatus.BAD_REQUEST),
    VALIDATION_ERROR("VALIDATION_ERROR", HttpStatus.BAD_REQUEST),

    // 401 errors
    UNAUTHORIZED("UNAUTHORIZED", HttpStatus.UNAUTHORIZED),

    // 403 errors
    FORBIDDEN("FORBIDDEN", HttpStatus.FORBIDDEN),

    // 404 errors
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND),
    EVENT_NOT_FOUND("EVENT_NOT_FOUND", HttpStatus.NOT_FOUND),

    // 409 errors
    AGE_NOT_ELIGIBLE("AGE_NOT_ELIGIBLE", HttpStatus.CONFLICT),
    EVENT_FULL("EVENT_FULL", HttpStatus.CONFLICT),
    REGISTRATION_CLOSED("REGISTRATION_CLOSED", HttpStatus.CONFLICT),
    DUPLICATE_REGISTRATION("DUPLICATE_REGISTRATION", HttpStatus.CONFLICT),

    // 500 errors
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", HttpStatus.INTERNAL_SERVER_ERROR);
}
```

### TypeScript (Frontend)

```typescript
export enum ErrorCode {
  // 400 errors
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 401 errors
  UNAUTHORIZED = 'UNAUTHORIZED',

  // 403 errors
  FORBIDDEN = 'FORBIDDEN',

  // 404 errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',

  // 409 errors
  AGE_NOT_ELIGIBLE = 'AGE_NOT_ELIGIBLE',
  EVENT_FULL = 'EVENT_FULL',
  REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
  DUPLICATE_REGISTRATION = 'DUPLICATE_REGISTRATION',

  // 500 errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export function getErrorMessage(code: ErrorCode, message: string): string {
  // 可根據 code 客製化訊息
  const customMessages: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.UNAUTHORIZED]: '請先登入以繼續操作',
    [ErrorCode.FORBIDDEN]: '您沒有權限進行此操作',
    [ErrorCode.INTERNAL_SERVER_ERROR]: '系統發生錯誤，請稍後再試',
  };

  return customMessages[code] || message;
}
```

## 相關文件

- [完整錯誤處理指南](./ERROR_HANDLING_GUIDE.md) - 詳細的實作指南與範例
- [OpenAPI 規格](./openapi.yaml) - API 規格定義
- [API 範例](./examples/) - 各端點的請求/回應範例

## 版本

文件版本：v1.0
最後更新：2026-01-26
