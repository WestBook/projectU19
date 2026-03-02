# POST /api/orders 驗證規則規格

## 概覽

本文件定義 `POST /api/orders`（兒童體育賽事報名）的完整驗證規則、業務邏輯，以及所有可能的錯誤碼。

---

## 1. 驗證流程（依序執行）

系統依以下順序驗證請求，**任一步驟失敗即立即返回錯誤，不繼續後續驗證**：

```
步驟 1：欄位格式驗證
    ↓ 通過
步驟 2：出生日期合理性驗證
    ↓ 通過
步驟 3：賽事存在性驗證
    ↓ 通過
步驟 4：報名截止時間驗證
    ↓ 通過
步驟 5：名額容量驗證
    ↓ 通過
步驟 6：小孩年齡驗證（含嚴格/彈性模式）
    ↓ 通過（或彈性模式允許但加入 warning）
步驟 7：重複報名驗證
    ↓ 通過
建立訂單（HTTP 201）
```

---

## 2. 欄位驗證規則

### 2.1 請求欄位一覽

| 欄位 | 必填 | 類型 | 限制 | 錯誤碼 |
|------|------|------|------|--------|
| `eventId` | 是 | UUID | 有效 UUID 格式 | `VALIDATION_ERROR` |
| `parent.name` | 是 | string | 長度 2-50 字元 | `VALIDATION_ERROR` |
| `parent.email` | 是 | string | 有效 email 格式 | `VALIDATION_ERROR` |
| `parent.phone` | 是 | string | `^09\d{8}$`（台灣手機） | `VALIDATION_ERROR` |
| `child.name` | 是 | string | 長度 2-50 字元 | `VALIDATION_ERROR` |
| `child.birthDate` | 是 | date | YYYY-MM-DD，必須是過去日期 | `VALIDATION_ERROR` |
| `child.gender` | 否 | enum | `MALE` / `FEMALE` / `OTHER` | `VALIDATION_ERROR` |
| `emergencyContact.name` | 條件 | string | 若提供 emergencyContact 則必填，長度 2-50 字元 | `VALIDATION_ERROR` |
| `emergencyContact.phone` | 條件 | string | 若提供 emergencyContact 則必填，`^09\d{8}$` | `VALIDATION_ERROR` |
| `emergencyContact.relationship` | 否 | string | 長度上限 50 字元 | `VALIDATION_ERROR` |
| `notes` | 否 | string | 長度上限 500 字元 | `VALIDATION_ERROR` |

### 2.2 電話格式說明

```
pattern: ^09\d{8}$

有效範例：
  0912345678  ✓
  0987654321  ✓

無效範例：
  02-1234-5678  ✗ (市話格式，不接受)
  +886912345678 ✗ (國際格式，不接受)
  091234567     ✗ (9位數，不足)
```

---

## 3. 年齡驗證規則

### 3.1 年齡計算公式

```
childAgeAtEvent = 完整年數(event.startTime.date - child.birthDate)
```

採用「生日是否已過」的計算方式：
- 若賽事當日 **尚未** 過生日 → 年齡 = 今年年份差 - 1
- 若賽事當日 **已過** 生日 → 年齡 = 今年年份差

**計算範例：**

| child.birthDate | event.startTime | childAgeAtEvent | 說明 |
|----------------|-----------------|-----------------|------|
| 2016-05-15 | 2026-03-15 | **9** | 3月尚未過5月生日 |
| 2016-05-15 | 2026-06-01 | **10** | 6月已過5月生日 |
| 2016-05-15 | 2026-05-15 | **10** | 生日當天算已過 |
| 2014-12-31 | 2026-01-01 | **11** | 新年當天，去年12月尚未過 |

### 3.2 出生日期合理性限制

```
child.birthDate < today  （必須是過去日期）
```

- 今日或未來日期 → HTTP 400, `VALIDATION_ERROR`
- 不接受超過 19 年前（即小孩年齡 > 18 歲時）的出生日期 → HTTP 400, `VALIDATION_ERROR`

### 3.3 嚴格年齡驗證（strictAgeEnforcement = true）

預設行為：

```
必須滿足：event.ageMin <= childAgeAtEvent <= event.ageMax
```

- 年齡不符合 → HTTP 409, `AGE_NOT_ELIGIBLE`
- 錯誤詳情中說明實際年齡與允許範圍

**範例（ageMin=8, ageMax=12）：**
```json
{
  "code": "AGE_NOT_ELIGIBLE",
  "message": "小孩年齡不符合賽事年齡限制",
  "details": [
    {
      "field": "child.birthDate",
      "reason": "child age (6) is below minimum age requirement (8)"
    }
  ]
}
```

### 3.4 彈性年齡驗證（strictAgeEnforcement = false）

當主辦單位設定彈性驗證：
- 年齡不符合 → **仍允許報名**（HTTP 201 成功）
- 但回應中 `data.warnings` 陣列包含 `AGE_BOUNDARY_WARNING` 提示
- 前端/AI Agent 應顯示此警告訊息給家長確認

```json
{
  "success": true,
  "data": {
    "status": "PENDING",
    "warnings": [
      {
        "code": "AGE_BOUNDARY_WARNING",
        "message": "小孩年齡（13歲）超出賽事建議年齡範圍（8-12歲），已依主辦單位彈性規定允許報名，請確認參加意願"
      }
    ]
  }
}
```

---

## 4. 業務邏輯驗證

### 4.1 賽事報名狀態

**必須同時滿足：**
1. `event.registrationStatus == OPEN`（非 FULL / CLOSED）
2. `now < event.registrationDeadline`（尚未截止）

| 條件 | HTTP 狀態 | 錯誤碼 |
|------|-----------|--------|
| 賽事 ID 不存在 | 404 | `RESOURCE_NOT_FOUND` |
| 報名已截止（超過 deadline） | 409 | `REGISTRATION_CLOSED` |
| 賽事狀態為 FULL | 409 | `EVENT_FULL` |

### 4.2 名額驗證

```
必須滿足：event.registeredCount < event.capacity
```

- 已滿員 → HTTP 409, `EVENT_FULL`
- 錯誤詳情中說明當前容量（如 `30/30`）

### 4.3 重複報名驗證

重複性判斷依據：**同一賽事 + 同一小孩**

```
唯一索引：(event_id, child_name, child_birth_date)
```

- 已存在非 CANCELLED 狀態的相同報名 → HTTP 409, `DUPLICATE_REGISTRATION`
- 已取消（CANCELLED）的訂單不計入重複判斷（可重新報名）

---

## 5. 付款期限計算

```
paymentDeadline = min(
  event.registrationDeadline,
  訂單建立時間 + 72小時
)
```

**計算範例：**

| 訂單建立時間 | event.registrationDeadline | paymentDeadline |
|------------|---------------------------|-----------------|
| 2026-01-26T10:30 | 2026-03-10T23:59 | 2026-01-29T10:30（取 72h 較小值） |
| 2026-03-09T20:00 | 2026-03-10T23:59 | 2026-03-10T23:59（取 deadline 較小值） |

---

## 6. 訂單狀態生命週期

### 6.1 狀態定義

| 狀態 | 說明 | 進入條件 | 終態 |
|------|------|----------|------|
| `PENDING` | 待付款 | 訂單建立成功 | 否 |
| `CONFIRMED` | 已確認付款 | 付款成功（webhook 或手動確認） | 否 |
| `CANCELLED` | 已取消 | 使用者主動取消，或超過 paymentDeadline | 是 |
| `REFUNDED` | 已退款 | 退款申請通過，或賽事主辦方取消賽事 | 是 |
| `COMPLETED` | 已完成 | 賽事 endTime 到期後系統自動更新 | 是 |

### 6.2 狀態轉換規則

```
                   ┌─────────────────────┐
                   │                     │
  [建立訂單]       │    付款完成          │   賽事結束
      ↓            ↓                     ↓
  PENDING ─────→ CONFIRMED ──────────→ COMPLETED
      │                │
      │                │ 退款申請通過
      │ 逾期/取消       │ 或賽事取消
      ↓                ↓
  CANCELLED         REFUNDED
```

**轉換規則：**

| 當前狀態 | 目標狀態 | 觸發條件 |
|---------|---------|---------|
| PENDING | CONFIRMED | 付款成功（系統 webhook / 管理員手動） |
| PENDING | CANCELLED | 使用者取消 或 超過 paymentDeadline |
| CONFIRMED | COMPLETED | event.endTime 過後系統批次執行 |
| CONFIRMED | REFUNDED | 退款申請審核通過 或 賽事被取消 |

**注意：** CANCELLED / REFUNDED / COMPLETED 為終態，無法再轉換。

---

## 7. 錯誤碼完整對照表

| HTTP 狀態 | 錯誤碼 | 說明 | 觸發場景 |
|-----------|--------|------|---------|
| 400 | `VALIDATION_ERROR` | 欄位格式驗證失敗 | 必填欄位缺失、格式不符、出生日期為未來 |
| 404 | `RESOURCE_NOT_FOUND` | 資源不存在 | eventId 對應的賽事不存在 |
| 409 | `REGISTRATION_CLOSED` | 報名已截止 | 超過 registrationDeadline |
| 409 | `EVENT_FULL` | 名額已滿 | registeredCount >= capacity |
| 409 | `AGE_NOT_ELIGIBLE` | 年齡不符合限制 | 嚴格驗證模式下年齡超出範圍 |
| 409 | `DUPLICATE_REGISTRATION` | 重複報名 | 同小孩已有非 CANCELLED 訂單 |
| 500 | `INTERNAL_SERVER_ERROR` | 伺服器內部錯誤 | 資料庫異常等非預期錯誤 |

### 7.1 非錯誤的警告碼（出現在 response.data.warnings）

| 警告碼 | 說明 | 出現條件 |
|--------|------|---------|
| `AGE_BOUNDARY_WARNING` | 年齡超出建議範圍 | strictAgeEnforcement=false 且年齡不在 ageMin-ageMax 範圍內 |

---

## 8. AI Agent 使用指南

### 8.1 建議呼叫流程

```
1. 使用者描述需求（例：「幫我9歲小孩報名籃球活動」）
    ↓
2. 呼叫 GET /api/events?age=9 取得適合賽事
    ↓
3. 顯示賽事列表，確認使用者選擇
    ↓
4. 呼叫 GET /api/events/{id} 確認賽事詳情（名額、費用、截止日）
    ↓
5. 收集報名資料（家長資訊、小孩出生日期）
    ↓
6. 在呼叫 API 前預先驗證年齡（避免不必要的 API 錯誤）：
   childAgeAtEvent = 計算完整年數(event.startTime - child.birthDate)
   若 childAgeAtEvent < ageMin 或 > ageMax → 提前告知不符合
    ↓
7. 呼叫 POST /api/orders 建立訂單
    ↓
8. 解析回應：
   - 檢查 data.warnings 是否包含 AGE_BOUNDARY_WARNING → 告知家長
   - 顯示 paymentDeadline 讓家長知道付款期限
   - 確認訂單 ID 以便後續查詢
```

### 8.2 錯誤處理建議

| 錯誤碼 | AI Agent 建議回應 |
|--------|-----------------|
| `AGE_NOT_ELIGIBLE` | 告知具體年齡差距，推薦適合年齡的賽事 |
| `EVENT_FULL` | 告知名額已滿，詢問是否搜尋其他賽事 |
| `REGISTRATION_CLOSED` | 告知截止日期，詢問是否搜尋其他賽事 |
| `DUPLICATE_REGISTRATION` | 告知已有報名紀錄，詢問是否查詢現有訂單 |
| `VALIDATION_ERROR` | 請使用者確認並更正輸入資料 |

---

## 9. 實作注意事項

1. **年齡計算使用賽事開始日期**，不是報名日期
2. **birthDate 驗證需雙重確認**：格式驗證（框架層）+ 過去日期驗證（業務層）
3. **重複報名判斷排除 CANCELLED 狀態**，允許取消後重新報名
4. **paymentDeadline 在訂單建立時計算並儲存**，不動態計算
5. **非嚴格模式的 warnings** 需包含具體的年齡數字與範圍，方便家長理解
6. **所有時間以 Asia/Taipei (UTC+8) 呈現**
