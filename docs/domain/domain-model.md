# 核心領域模型定義 (Domain Models)

本文件定義「AI 驅動的兒童體育賽事電商與營運後台平台」的核心領域模型。

---

## 1. Event（賽事）

| 欄位 | 資料型別 | 必填 | 說明 |
|------|----------|------|------|
| id | UUID | ✓ | 主鍵 |
| name | VARCHAR(200) | ✓ | 賽事名稱 |
| description | TEXT | ✗ | 賽事說明 |
| sport_type | VARCHAR(50) | ✓ | 運動類型（籃球、足球、游泳等） |
| age_min | INT | ✓ | 最小年齡限制 |
| age_max | INT | ✓ | 最大年齡限制 |
| start_time | TIMESTAMP | ✓ | 開始時間 |
| end_time | TIMESTAMP | ✗ | 結束時間 |
| registration_deadline | TIMESTAMP | ✓ | 報名截止時間 |
| location | VARCHAR(300) | ✓ | 地點 |
| capacity | INT | ✓ | 名額上限 |
| price | DECIMAL(10,2) | ✓ | 報名費用 |
| status | ENUM | ✓ | 狀態：DRAFT / PUBLISHED / CLOSED / CANCELLED |
| partner_id | UUID | ✓ | 主辦方 ID（FK） |
| created_at | TIMESTAMP | ✓ | 建立時間 |
| updated_at | TIMESTAMP | ✓ | 更新時間 |

---

## 2. Order（訂單）

| 欄位 | 資料型別 | 必填 | 說明 |
|------|----------|------|------|
| id | UUID | ✓ | 主鍵 |
| order_number | VARCHAR(20) | ✓ | 訂單編號（人類可讀） |
| event_id | UUID | ✓ | 賽事 ID（FK） |
| parent_id | UUID | ✓ | 家長用戶 ID（FK，未來擴充） |
| parent_name | VARCHAR(100) | ✓ | 家長姓名 |
| parent_phone | VARCHAR(20) | ✓ | 家長電話 |
| parent_email | VARCHAR(100) | ✓ | 家長 Email |
| total_amount | DECIMAL(10,2) | ✓ | 訂單總金額 |
| status | ENUM | ✓ | 狀態：PENDING / PAID / CANCELLED / REFUNDED |
| payment_method | VARCHAR(50) | ✗ | 付款方式（未來擴充） |
| notes | TEXT | ✗ | 備註 |
| created_at | TIMESTAMP | ✓ | 建立時間 |
| updated_at | TIMESTAMP | ✓ | 更新時間 |

---

## 3. Participant（參賽者/選手）

| 欄位 | 資料型別 | 必填 | 說明 |
|------|----------|------|------|
| id | UUID | ✓ | 主鍵 |
| order_id | UUID | ✓ | 所屬訂單 ID（FK） |
| event_id | UUID | ✓ | 賽事 ID（FK，冗餘欄位方便查詢） |
| child_name | VARCHAR(100) | ✓ | 孩童姓名 |
| child_birth_date | DATE | ✓ | 孩童出生日期 |
| child_gender | ENUM | ✓ | 性別：MALE / FEMALE / OTHER |
| emergency_contact | VARCHAR(100) | ✓ | 緊急聯絡人 |
| emergency_phone | VARCHAR(20) | ✓ | 緊急聯絡電話 |
| medical_notes | TEXT | ✗ | 健康/醫療注意事項 |
| created_at | TIMESTAMP | ✓ | 建立時間 |

---

## 4. Partner（主辦方）

| 欄位 | 資料型別 | 必填 | 說明 |
|------|----------|------|------|
| id | UUID | ✓ | 主鍵 |
| name | VARCHAR(200) | ✓ | 主辦方名稱 |
| contact_name | VARCHAR(100) | ✓ | 聯絡人姓名 |
| contact_email | VARCHAR(100) | ✓ | 聯絡 Email |
| contact_phone | VARCHAR(20) | ✓ | 聯絡電話 |
| status | ENUM | ✓ | 狀態：ACTIVE / INACTIVE |
| created_at | TIMESTAMP | ✓ | 建立時間 |
| updated_at | TIMESTAMP | ✓ | 更新時間 |

---

## 領域關聯圖 (Entity Relationships)

```
┌─────────────┐       1:N       ┌─────────────┐
│   Partner   │ ───────────────▶│    Event    │
│  (主辦方)   │                 │   (賽事)    │
└─────────────┘                 └──────┬──────┘
                                       │
                                       │ 1:N
                                       ▼
                                ┌─────────────┐
                                │    Order    │
                                │   (訂單)    │
                                └──────┬──────┘
                                       │
                                       │ 1:N
                                       ▼
                              ┌───────────────┐
                              │  Participant  │
                              │  (參賽者)     │
                              └───────────────┘
```

### 關聯說明

| 關聯 | 類型 | 說明 |
|------|------|------|
| Partner → Event | 1:N | 一個主辦方可以舉辦多場賽事 |
| Event → Order | 1:N | 一場賽事可以有多筆報名訂單 |
| Order → Participant | 1:N | 一筆訂單可包含多位參賽者（兄弟姐妹同報） |

---

## 設計決策說明

### 1. Participant 獨立於 Order
- 一筆訂單可報名多位孩童（常見情境：兄弟姐妹一起報名）
- 方便主辦方依賽事查詢所有參賽者名單

### 2. Event 的 `status` 欄位
- `DRAFT`：草稿，尚未公開
- `PUBLISHED`：已發布，可接受報名
- `CLOSED`：報名截止或額滿
- `CANCELLED`：已取消

### 3. 使用 `birth_date` 而非 `age`
- 年齡會隨時間變化，儲存出生日期更準確
- 系統可依賽事規則動態計算是否符合年齡限制

### 4. `order_number` 人類可讀編號
- UUID 適合系統內部使用，但客服查詢需要簡短易讀的編號
- 格式建議：`ORD-20260126-001`

### 5. 冗餘欄位 `Participant.event_id`
- 雖然可透過 Order 查詢，但主辦方常需「依賽事列出所有參賽者」
- 冗餘欄位大幅簡化此類查詢

### 6. AdminEvent 不另建模型
- Admin/Partner 管理賽事的視角可透過 DTO 區隔
- 後台 API 回傳額外統計欄位（報名人數、收入等），不需另建 Entity

---

## 狀態機 (State Machines)

### Event Status

```
DRAFT → PUBLISHED → CLOSED
          ↓
      CANCELLED
```

### Order Status

```
PENDING → PAID → REFUNDED
    ↓
CANCELLED
```

---

## 版本紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.0 | 2026-01-26 | 初版建立 |
