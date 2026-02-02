# API 錯誤處理指南

## 統一錯誤回應格式

所有 API 錯誤回應遵循統一格式，確保前端、AI Agent 與除錯工具能一致處理。

### 基本結構

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

### 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `success` | boolean | ✓ | 固定為 `false` |
| `error.code` | string | ✓ | 錯誤代碼（大寫，底線分隔）|
| `error.message` | string | ✓ | 使用者可讀的錯誤訊息（繁體中文）|
| `error.details` | array | | 詳細錯誤資訊陣列（參數驗證時提供）|
| `error.traceId` | string | ✓ | 追蹤識別碼（用於 log 查詢與除錯）|
| `timestamp` | string | ✓ | ISO 8601 格式的回應時間戳 |

---

## 錯誤代碼規範

### 分類與命名規則

錯誤代碼採用 `CATEGORY_SPECIFIC_ERROR` 格式：

| 類別 | 前綴 | 說明 | HTTP Status |
|------|------|------|-------------|
| 參數驗證 | `INVALID_` / `VALIDATION_` | 請求參數格式或邏輯錯誤 | 400 |
| 資源不存在 | `RESOURCE_NOT_FOUND` / `*_NOT_FOUND` | 找不到指定資源 | 404 |
| 業務邏輯衝突 | 業務相關 | 違反業務規則 | 409 |
| 認證問題 | `UNAUTHORIZED` | 未認證或認證失效 | 401 |
| 授權問題 | `FORBIDDEN` | 權限不足 | 403 |
| 伺服器錯誤 | `INTERNAL_SERVER_ERROR` / `SERVICE_*` | 系統內部錯誤 | 500 |

### 標準錯誤代碼列表

#### 400 Bad Request - 參數驗證錯誤

| 錯誤代碼 | 說明 | 使用時機 |
|----------|------|----------|
| `INVALID_PARAMETER` | 參數值不符合規則 | 參數超出範圍、格式錯誤 |
| `VALIDATION_ERROR` | 參數驗證失敗 | 多個欄位驗證失敗 |
| `INVALID_DATE_FORMAT` | 日期格式錯誤 | 日期不符合 YYYY-MM-DD 格式 |
| `INVALID_EMAIL_FORMAT` | Email 格式錯誤 | Email 格式不正確 |
| `INVALID_PHONE_FORMAT` | 電話格式錯誤 | 電話格式不符合規則 |
| `MISSING_REQUIRED_FIELD` | 缺少必填欄位 | 請求缺少必要參數 |

#### 404 Not Found - 資源不存在

| 錯誤代碼 | 說明 |
|----------|------|
| `RESOURCE_NOT_FOUND` | 找不到指定資源 |
| `EVENT_NOT_FOUND` | 找不到指定賽事 |
| `ORDER_NOT_FOUND` | 找不到指定訂單 |

#### 409 Conflict - 業務邏輯衝突

| 錯誤代碼 | 說明 | 使用場景 |
|----------|------|----------|
| `AGE_NOT_ELIGIBLE` | 年齡不符合限制 | 小孩年齡不在賽事年齡範圍內 |
| `EVENT_FULL` | 賽事名額已滿 | 無法報名已額滿的賽事 |
| `REGISTRATION_CLOSED` | 報名已截止 | 超過報名截止時間 |
| `DUPLICATE_REGISTRATION` | 重複報名 | 同一小孩已報名該賽事 |
| `INVALID_STATUS_TRANSITION` | 狀態轉換不合法 | 訂單狀態轉換違反生命週期 |

#### 401 Unauthorized - 認證問題

| 錯誤代碼 | 說明 |
|----------|------|
| `UNAUTHORIZED` | 未認證或認證失效 |
| `TOKEN_EXPIRED` | Token 已過期 |
| `INVALID_CREDENTIALS` | 認證憑證無效 |

#### 403 Forbidden - 授權問題

| 錯誤代碼 | 說明 |
|----------|------|
| `FORBIDDEN` | 權限不足 |
| `INSUFFICIENT_PERMISSIONS` | 權限不足（更具體）|

#### 500 Internal Server Error - 伺服器錯誤

| 錯誤代碼 | 說明 |
|----------|------|
| `INTERNAL_SERVER_ERROR` | 系統內部錯誤 |
| `SERVICE_UNAVAILABLE` | 服務暫時無法使用 |
| `DATABASE_ERROR` | 資料庫錯誤 |

---

## 錯誤回應範例

### 1. 參數驗證錯誤（單一欄位）

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "年齡參數必須介於 1 到 18 之間",
    "details": [
      {
        "field": "age",
        "reason": "must be between 1 and 18"
      }
    ],
    "traceId": "abc123def456"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 2. 參數驗證錯誤（多個欄位）

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求參數驗證失敗",
    "details": [
      {
        "field": "parent.name",
        "reason": "must not be blank"
      },
      {
        "field": "child.birthDate",
        "reason": "must not be null"
      },
      {
        "field": "parent.email",
        "reason": "must be a valid email address"
      }
    ],
    "traceId": "abc123def789"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 3. 資源不存在

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "找不到指定的賽事",
    "details": [
      {
        "field": "id",
        "reason": "event with the specified ID does not exist"
      }
    ],
    "traceId": "abc123def471"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 4. 業務邏輯衝突

```json
{
  "success": false,
  "error": {
    "code": "AGE_NOT_ELIGIBLE",
    "message": "小孩年齡不符合賽事年齡限制",
    "details": [
      {
        "field": "child.birthDate",
        "reason": "child age (6) is below minimum age requirement (8)"
      }
    ],
    "traceId": "ord123def004"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 5. 認證/授權錯誤

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的認證憑證",
    "traceId": "auth123def001"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "您沒有權限執行此操作（需要管理員權限）",
    "traceId": "auth123def002"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

### 6. 伺服器錯誤（不提供 details）

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "系統發生非預期錯誤，請稍後再試",
    "traceId": "xyz789abc123"
  },
  "timestamp": "2026-01-26T10:30:00+08:00"
}
```

---

## 前端使用指南

### 錯誤處理流程

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      reason: string;
    }>;
    traceId: string;
  };
  timestamp: string;
}

async function handleApiCall() {
  try {
    const response = await fetch('/api/events', options);
    const data = await response.json();

    if (!data.success) {
      handleError(data as ErrorResponse);
      return;
    }

    // 處理成功回應
    handleSuccess(data);

  } catch (error) {
    // 處理網路錯誤
    handleNetworkError(error);
  }
}

function handleError(errorResponse: ErrorResponse) {
  const { code, message, details, traceId } = errorResponse.error;

  // 1. 依錯誤代碼分類處理
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_PARAMETER':
      // 顯示欄位驗證錯誤
      showFieldErrors(details);
      break;

    case 'RESOURCE_NOT_FOUND':
    case 'EVENT_NOT_FOUND':
      // 顯示 404 頁面或提示
      showNotFoundMessage(message);
      break;

    case 'AGE_NOT_ELIGIBLE':
    case 'EVENT_FULL':
    case 'REGISTRATION_CLOSED':
      // 顯示業務邏輯錯誤提示
      showBusinessError(message);
      break;

    case 'UNAUTHORIZED':
      // 導向登入頁面
      redirectToLogin();
      break;

    case 'FORBIDDEN':
      // 顯示權限不足訊息
      showPermissionDenied(message);
      break;

    case 'INTERNAL_SERVER_ERROR':
    case 'SERVICE_UNAVAILABLE':
      // 顯示系統錯誤，提供 traceId 供使用者回報
      showSystemError(message, traceId);
      break;

    default:
      // 未知錯誤
      showGenericError(message, traceId);
  }
}

function showFieldErrors(details?: Array<{field: string; reason: string}>) {
  if (!details) return;

  // 將錯誤訊息對應到表單欄位
  details.forEach(({ field, reason }) => {
    const fieldElement = document.querySelector(`[name="${field}"]`);
    if (fieldElement) {
      // 顯示欄位錯誤訊息
      showFieldError(fieldElement, reason);
    }
  });
}
```

### 錯誤訊息顯示建議

| 錯誤類型 | 顯示位置 | 建議呈現方式 |
|----------|----------|--------------|
| 參數驗證錯誤 | 表單欄位下方 | 紅色文字，顯示 `reason` |
| 資源不存在 | 頁面中央 | 404 頁面或 Toast 提示 |
| 業務邏輯衝突 | Modal 或 Toast | 顯示 `message`，提供解決建議 |
| 認證失效 | 全域 | 自動導向登入頁 |
| 權限不足 | 頁面中央 | 403 頁面 |
| 系統錯誤 | Modal 或 Toast | 顯示 `message` + `traceId`（供回報）|

---

## AI Agent 使用指南

### 錯誤解析與回應

AI Agent 應根據錯誤代碼與訊息，提供適當的使用者回應：

#### 1. 參數驗證錯誤

```
User: 我想幫我 20 歲的小孩報名
AI Tool Call: searchEvents(age=20)
API Response: {
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "年齡參數必須介於 1 到 18 之間"
  }
}

AI Response:
"抱歉，我們的賽事系統目前僅支援 1 到 18 歲的兒童與青少年活動。
您提到的小孩已經 20 歲，可能不符合我們平台的活動範圍。
如果需要成人運動活動資訊，建議您查詢其他成人運動中心。"
```

#### 2. 業務邏輯衝突

```
User: 我要幫 6 歲的小孩報名籃球營
AI Tool Call: getEventDetail(eventId="...")
API Response: event.ageRestriction = {minAge: 8, maxAge: 12}
AI Tool Call: createOrder(childAge=6, ...)
API Response: {
  "error": {
    "code": "AGE_NOT_ELIGIBLE",
    "message": "小孩年齡不符合賽事年齡限制",
    "details": [{
      "field": "child.birthDate",
      "reason": "child age (6) is below minimum age requirement (8)"
    }]
  }
}

AI Response:
"很抱歉，這個籃球營的年齡限制是 8 到 12 歲，您 6 歲的小孩目前還不符合參加資格。

我可以幫您找其他適合 6 歲小朋友的活動嗎？例如：
- 幼兒體適能課程
- 親子運動課程
- 兒童游泳班"
```

#### 3. 賽事名額已滿

```
API Response: {
  "error": {
    "code": "EVENT_FULL",
    "message": "賽事名額已滿，無法報名",
    "details": [{
      "field": "eventId",
      "reason": "event has reached maximum capacity (30/30)"
    }]
  }
}

AI Response:
"很抱歉，這個活動的名額已經滿了（30/30）。

我可以為您：
1. 查詢相似的其他活動
2. 記錄您的聯絡方式，若有人取消時通知您
3. 推薦其他時段的同類型活動

您希望我怎麼協助您呢？"
```

### AI Agent 錯誤處理原則

1. **永遠顯示友善的訊息**：不要直接顯示技術錯誤代碼給使用者
2. **提供替代方案**：當無法完成請求時，主動建議其他選項
3. **保留 traceId**：在 AI 的 context 中記錄 traceId，供使用者回報問題時使用
4. **判斷是否重試**：
   - `INTERNAL_SERVER_ERROR`, `SERVICE_UNAVAILABLE` → 可建議稍後再試
   - `VALIDATION_ERROR`, `AGE_NOT_ELIGIBLE` → 不應重試，需修正參數
5. **學習使用者意圖**：從錯誤中理解使用者需求，調整後續查詢

---

## 後端實作指南

### Spring Boot 實作範例

```kotlin
// 1. 定義統一錯誤回應 DTO
data class ErrorResponse(
    val success: Boolean = false,
    val error: ErrorDetail,
    val timestamp: String = Instant.now().toString()
)

data class ErrorDetail(
    val code: String,
    val message: String,
    val details: List<ErrorFieldDetail>? = null,
    val traceId: String
)

data class ErrorFieldDetail(
    val field: String,
    val reason: String
)

// 2. 全域例外處理器
@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(
        ex: MethodArgumentNotValidException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId(request)

        val details = ex.bindingResult.fieldErrors.map {
            ErrorFieldDetail(
                field = it.field,
                reason = it.defaultMessage ?: "validation failed"
            )
        }

        return ResponseEntity
            .badRequest()
            .body(ErrorResponse(
                error = ErrorDetail(
                    code = "VALIDATION_ERROR",
                    message = "請求參數驗證失敗",
                    details = details,
                    traceId = traceId
                )
            ))
    }

    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleResourceNotFound(
        ex: ResourceNotFoundException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId(request)

        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse(
                error = ErrorDetail(
                    code = ex.errorCode,
                    message = ex.message ?: "找不到指定的資源",
                    details = listOf(ErrorFieldDetail(
                        field = ex.field,
                        reason = ex.reason
                    )),
                    traceId = traceId
                )
            ))
    }

    @ExceptionHandler(BusinessLogicException::class)
    fun handleBusinessLogicException(
        ex: BusinessLogicException,
        request: HttpServletRequest
    ): ResponseEntity<ErrorResponse> {
        val traceId = generateTraceId(request)

        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ErrorResponse(
                error = ErrorDetail(
                    code = ex.errorCode,
                    message = ex.message ?: "業務邏輯錯誤",
                    details = ex.details,
                    traceId = traceId
                )
            ))
    }

    private fun generateTraceId(request: HttpServletRequest): String {
        // 生成唯一追蹤 ID（可整合 MDC 或分散式追蹤系統）
        return UUID.randomUUID().toString().substring(0, 12)
    }
}

// 3. 自訂例外類別
class ResourceNotFoundException(
    val errorCode: String = "RESOURCE_NOT_FOUND",
    override val message: String,
    val field: String,
    val reason: String
) : RuntimeException(message)

class BusinessLogicException(
    val errorCode: String,
    override val message: String,
    val details: List<ErrorFieldDetail>? = null
) : RuntimeException(message)

// 4. 使用範例
@Service
class EventService {
    fun getEventById(id: UUID): EventDetail {
        return eventRepository.findById(id)
            ?: throw ResourceNotFoundException(
                errorCode = "EVENT_NOT_FOUND",
                message = "找不到指定的賽事",
                field = "id",
                reason = "event with the specified ID does not exist"
            )
    }

    fun createOrder(request: CreateOrderRequest): Order {
        val event = getEventById(request.eventId)

        // 年齡驗證
        val childAge = calculateAge(request.child.birthDate, event.startTime)
        if (childAge < event.ageRestriction.minAge ||
            childAge > event.ageRestriction.maxAge) {
            throw BusinessLogicException(
                errorCode = "AGE_NOT_ELIGIBLE",
                message = "小孩年齡不符合賽事年齡限制",
                details = listOf(ErrorFieldDetail(
                    field = "child.birthDate",
                    reason = "child age ($childAge) is not within event age range " +
                            "(${event.ageRestriction.minAge}-${event.ageRestriction.maxAge})"
                ))
            )
        }

        // 名額檢查
        if (event.registeredCount >= event.capacity) {
            throw BusinessLogicException(
                errorCode = "EVENT_FULL",
                message = "賽事名額已滿，無法報名",
                details = listOf(ErrorFieldDetail(
                    field = "eventId",
                    reason = "event has reached maximum capacity " +
                            "(${event.registeredCount}/${event.capacity})"
                ))
            )
        }

        // 建立訂單...
    }
}
```

---

## 測試指南

### 錯誤回應測試檢查清單

- [ ] 所有錯誤回應包含 `success: false`
- [ ] 所有錯誤回應包含 `error.code`
- [ ] 所有錯誤回應包含 `error.message`（繁體中文）
- [ ] 所有錯誤回應包含 `error.traceId`
- [ ] 參數驗證錯誤包含 `error.details` 陣列
- [ ] HTTP status code 與錯誤代碼對應正確
- [ ] `traceId` 在 log 中可被追蹤
- [ ] 錯誤訊息不包含敏感資訊（如完整 SQL、內部路徑）
- [ ] 系統錯誤 (5xx) 不暴露內部實作細節

### 單元測試範例

```kotlin
@Test
fun `should return validation error when age is out of range`() {
    val response = mockMvc.perform(
        get("/api/events")
            .param("age", "25")
    )
        .andExpect(status().isBadRequest)
        .andReturn()
        .response
        .contentAsString

    val error = objectMapper.readValue<ErrorResponse>(response)

    assertThat(error.success).isFalse()
    assertThat(error.error.code).isEqualTo("INVALID_PARAMETER")
    assertThat(error.error.message).contains("年齡參數")
    assertThat(error.error.traceId).isNotBlank()
    assertThat(error.error.details).hasSize(1)
    assertThat(error.error.details!![0].field).isEqualTo("age")
}
```

---

## Logging 與監控

### TraceId 使用建議

1. **生成方式**：
   - 使用 UUID 或分散式追蹤 ID（如 Zipkin）
   - 在 Request Filter 層生成並存入 MDC (Mapped Diagnostic Context)

2. **Log 記錄**：
   ```kotlin
   // 設定 MDC
   MDC.put("traceId", traceId)

   // Log 會自動包含 traceId
   logger.error("Failed to process order", exception)

   // 清理 MDC
   MDC.clear()
   ```

3. **監控告警**：
   - 監控特定錯誤代碼的發生頻率
   - 設定 `INTERNAL_SERVER_ERROR` 的告警閾值
   - 追蹤高頻錯誤並分析根因

---

## 版本控制

本文件版本：v1.0
最後更新：2026-01-26
OpenAPI 規格版本：1.0.0

### 變更記錄

- 2026-01-26: 初版建立
