# Database Schema 說明文件

## 概述

本文件說明 AI Sports Event Platform 的資料庫 schema 設計，包含表格結構、關聯關係、索引策略和約束條件。

## 技術棧

- **資料庫**: PostgreSQL 14+
- **Migration 工具**: Flyway
- **ORM**: Spring Data JPA with Hibernate

## Migration 管理

### Migration 檔案位置
```
src/main/resources/db/migration/
├── V1__create_events_and_orders_tables.sql
└── V2__seed_events_data.sql
```

### 執行 Migration

Migration 會在應用程式啟動時自動執行。Flyway 設定如下：

```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
    validate-on-migrate: true
```

## 資料表結構

### 1. Events Table (賽事資訊表)

儲存所有體育賽事的基本資訊、報名規則和聯絡資料。

#### 表格定義

| 欄位名稱 | 資料型別 | 約束 | 說明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY | 賽事唯一識別碼 (自動生成) |
| name | VARCHAR(100) | NOT NULL | 賽事名稱 |
| description | TEXT | NOT NULL | 賽事詳細說明 |
| age_min | INTEGER | NOT NULL, CHECK (1-18) | 最小參賽年齡 |
| age_max | INTEGER | NOT NULL, CHECK (1-18) | 最大參賽年齡 |
| age_restriction_note | VARCHAR(200) | NULLABLE | 年齡限制說明文字 |
| strict_age_enforcement | BOOLEAN | NOT NULL, DEFAULT true | 是否嚴格執行年齡限制 |
| start_time | TIMESTAMP WITH TIME ZONE | NOT NULL | 賽事開始時間 |
| end_time | TIMESTAMP WITH TIME ZONE | NOT NULL | 賽事結束時間 |
| registration_deadline | TIMESTAMP WITH TIME ZONE | NOT NULL | 報名截止時間 |
| location | VARCHAR(100) | NOT NULL | 賽事地點名稱 |
| address | VARCHAR(200) | NULLABLE | 詳細地址 |
| capacity | INTEGER | NOT NULL, CHECK (> 0) | 最大參加人數 |
| fee | DECIMAL(10, 2) | NOT NULL, CHECK (>= 0) | 報名費用（新台幣） |
| organizer | VARCHAR(100) | NOT NULL | 主辦單位 |
| contact_email | VARCHAR(255) | NOT NULL | 聯絡信箱 |
| contact_phone | VARCHAR(20) | NOT NULL | 聯絡電話 |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 最後更新時間 |

#### 約束條件

- **chk_age_range**: `age_min <= age_max`
- **chk_time_range**: `start_time < end_time`
- **chk_registration_before_event**: `registration_deadline < start_time`

#### 索引

| 索引名稱 | 欄位 | 用途 |
|---------|------|------|
| idx_events_start_time | start_time | 依時間查詢賽事 |
| idx_events_location | location | 依地點篩選 |
| idx_events_age_range | age_min, age_max | 年齡範圍查詢優化 |
| idx_events_registration_deadline | registration_deadline | 查詢報名狀態 |

#### 觸發器

- **update_events_updated_at**: 每次更新記錄時自動更新 `updated_at` 欄位

---

### 2. Orders Table (報名訂單表)

儲存使用者的賽事報名資訊，包含家長、小孩和緊急聯絡人資料。

#### 表格定義

| 欄位名稱 | 資料型別 | 約束 | 說明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY | 訂單唯一識別碼 (自動生成) |
| event_id | UUID | NOT NULL, FOREIGN KEY | 關聯的賽事 ID |
| status | VARCHAR(20) | NOT NULL, CHECK (ENUM) | 訂單狀態 |
| parent_name | VARCHAR(50) | NOT NULL | 家長姓名 |
| parent_email | VARCHAR(255) | NOT NULL | 家長電子郵件 |
| parent_phone | VARCHAR(10) | NOT NULL | 家長聯絡電話 (格式: 09xxxxxxxx) |
| child_name | VARCHAR(50) | NOT NULL | 小孩姓名 |
| child_birth_date | DATE | NOT NULL | 小孩出生日期 |
| child_gender | VARCHAR(10) | NULLABLE, CHECK (ENUM) | 小孩性別 (MALE/FEMALE/OTHER) |
| child_age_at_event | INTEGER | NOT NULL | 小孩於賽事當日的年齡 |
| emergency_contact_name | VARCHAR(50) | NULLABLE | 緊急聯絡人姓名 |
| emergency_contact_phone | VARCHAR(10) | NULLABLE | 緊急聯絡人電話 |
| emergency_contact_relationship | VARCHAR(50) | NULLABLE | 與小孩關係 |
| notes | TEXT | NULLABLE | 備註（如過敏資訊） |
| fee | DECIMAL(10, 2) | NOT NULL, CHECK (>= 0) | 報名費用 |
| payment_deadline | TIMESTAMP WITH TIME ZONE | NULLABLE | 付款期限 |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 建立時間 |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 最後更新時間 |

#### 訂單狀態 (status)

| 狀態值 | 說明 |
|-------|------|
| PENDING | 待付款（訂單建立後的初始狀態） |
| CONFIRMED | 已確認（付款完成） |
| CANCELLED | 已取消（使用者主動取消或逾期未付款） |
| REFUNDED | 已退款（賽事取消或申請退款成功） |
| COMPLETED | 已完成（賽事結束） |

#### 外鍵約束

- **fk_orders_event_id**:
  - 參考 `events(id)`
  - `ON DELETE CASCADE` - 當賽事被刪除時，相關訂單也會被刪除

#### 索引

| 索引名稱 | 欄位 | 用途 |
|---------|------|------|
| idx_orders_event_id | event_id | 查詢特定賽事的所有訂單 |
| idx_orders_status | status | 依訂單狀態篩選 |
| idx_orders_parent_email | parent_email | 查詢特定家長的訂單 |
| idx_orders_created_at | created_at | 依建立時間排序 |

#### 觸發器

- **update_orders_updated_at**: 每次更新記錄時自動更新 `updated_at` 欄位

---

## 資料關聯圖

```
┌─────────────────────────┐
│       Events            │
│  (賽事資訊表)            │
├─────────────────────────┤
│ PK: id (UUID)           │
│     name                │
│     description         │
│     age_min             │
│     age_max             │
│     start_time          │
│     end_time            │
│     location            │
│     capacity            │
│     fee                 │
│     ...                 │
└───────────┬─────────────┘
            │
            │ 1:N
            │
            │ ON DELETE CASCADE
            ▼
┌─────────────────────────┐
│       Orders            │
│  (報名訂單表)            │
├─────────────────────────┤
│ PK: id (UUID)           │
│ FK: event_id            │ ───┐
│     status              │    │
│     parent_name         │    │
│     parent_email        │    │
│     child_name          │    │
│     child_birth_date    │    │
│     fee                 │    │
│     ...                 │    │
└─────────────────────────┘    │
                               │
                    參考 events(id)
```

## 種子資料 (Seed Data)

系統包含 8 筆預先建立的賽事資料，涵蓋不同運動項目和地區：

1. **2026 春季兒童籃球營** - 台北市大安運動中心 (8-12 歲)
2. **兒童游泳體驗班** - 台北市信義運動中心 (6-10 歲)
3. **2026 兒童足球夏令營** - 新北市板橋體育場 (9-14 歲)
4. **兒童羽球初階班** - 桃園市立體育館 (7-13 歲)
5. **幼兒體操啟蒙課程** - 台中市體操訓練中心 (4-6 歲)
6. **兒童網球入門班** - 高雄市網球場 (10-15 歲)
7. **兒童跆拳道體驗營** - 台南市武術館 (6-12 歲)
8. **2026 親子路跑嘉年華** - 新竹市青草湖環湖步道 (5-16 歲)

這些種子資料提供了豐富的測試場景，涵蓋：
- 不同年齡層 (4-16 歲)
- 各種運動類型
- 台灣各主要城市
- 不同價格區間 (500-3500 元)
- 不同容量規模 (15-200 人)

## 資料完整性保證

### 1. 參照完整性
- Orders 表格透過 `event_id` 外鍵確保每筆訂單都對應到有效的賽事
- 使用 `ON DELETE CASCADE` 確保賽事刪除時清理相關訂單

### 2. 資料驗證
- 年齡範圍限制 (1-18 歲)
- 時間邏輯驗證 (報名截止 < 賽事開始 < 賽事結束)
- 費用非負值檢查
- 容量正整數檢查

### 3. 自動時間戳記
- `created_at` 在記錄建立時自動設定
- `updated_at` 透過觸發器在每次更新時自動更新

## 查詢優化建議

### 常見查詢模式

1. **依年齡查詢賽事**
   ```sql
   SELECT * FROM events
   WHERE age_min <= ? AND age_max >= ?
   ```
   使用索引: `idx_events_age_range`

2. **依地點和時間查詢**
   ```sql
   SELECT * FROM events
   WHERE location LIKE ?
   AND start_time BETWEEN ? AND ?
   ```
   使用索引: `idx_events_location`, `idx_events_start_time`

3. **查詢賽事的訂單統計**
   ```sql
   SELECT event_id, status, COUNT(*), SUM(fee)
   FROM orders
   WHERE event_id = ?
   GROUP BY event_id, status
   ```
   使用索引: `idx_orders_event_id`, `idx_orders_status`

### 效能考量

- 所有時間欄位使用 `TIMESTAMP WITH TIME ZONE` 確保時區正確性
- 外鍵建立適當索引避免 join 效能問題
- `created_at` 和 `updated_at` 建立索引支援時間範圍查詢

## 未來擴充建議

考慮未來可能的功能需求，建議新增以下表格：

1. **users** - 使用者帳號系統
2. **payments** - 付款記錄
3. **event_images** - 賽事圖片
4. **reviews** - 賽事評價
5. **notifications** - 通知記錄

## 維護注意事項

1. **Migration 版本控制**
   - 絕不修改已執行的 migration 檔案
   - 新增變更時建立新的 migration (V3, V4...)
   - 在生產環境部署前先在測試環境驗證

2. **資料備份**
   - 執行 migration 前務必備份資料庫
   - 重要更新建議先在測試環境驗證

3. **索引維護**
   - 定期檢查查詢效能
   - 根據實際使用模式調整索引策略
   - 避免過度索引影響寫入效能

## 相關文件

- [API 規格](../docs/api/openapi.yaml)
- [專案結構](../PROJECT_STRUCTURE.md)
- [設定指南](../SETUP.md)
