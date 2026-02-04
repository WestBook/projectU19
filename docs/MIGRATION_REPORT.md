# Database Migration 完成報告

**日期**: 2026-02-03
**執行者**: Backend Agent
**專案**: AI Sports Event Platform

---

## 執行摘要

成功完成 PostgreSQL 資料庫 schema 建立和初始資料種子，包含：
- ✅ Flyway Migration 工具整合
- ✅ Events 和 Orders 兩個主要資料表
- ✅ 8 筆賽事種子資料
- ✅ 完整的索引、約束和觸發器設定

---

## 完成項目

### 1. Flyway 整合

#### 依賴更新
在 `build.gradle.kts` 中加入 Flyway 依賴：
```kotlin
implementation("org.flywaydb:flyway-core")
```

#### 配置設定
在 `application.yml` 中啟用 Flyway：
```yaml
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
    validate-on-migrate: true
```

### 2. Migration Scripts

#### V1__create_events_and_orders_tables.sql
建立兩個主要資料表，執行時間：53ms

**Events 表格特點**:
- 19 個欄位，包含賽事基本資訊、時間、地點、費用等
- 5 個索引 (start_time, location, age_range, registration_deadline)
- 7 個約束條件 (年齡範圍、時間邏輯驗證、費用/容量檢查)
- 自動更新 `updated_at` 的觸發器

**Orders 表格特點**:
- 18 個欄位，包含訂單狀態、家長資訊、小孩資訊、緊急聯絡人
- 4 個索引 (event_id, status, parent_email, created_at)
- 3 個約束條件 (狀態枚舉、性別枚舉、費用檢查)
- 外鍵關聯到 Events (ON DELETE CASCADE)
- 自動更新 `updated_at` 的觸發器

#### V2__seed_events_data.sql
插入 8 筆賽事種子資料，執行時間：7ms

種子資料涵蓋：
1. 2026 春季兒童籃球營 - 台北 (8-12歲, $1,500)
2. 兒童游泳體驗班 - 台北 (6-10歲, $1,800)
3. 2026 兒童足球夏令營 - 新北 (9-14歲, $3,500)
4. 兒童羽球初階班 - 桃園 (7-13歲, $2,200)
5. 幼兒體操啟蒙課程 - 台中 (4-6歲, $1,200)
6. 兒童網球入門班 - 高雄 (10-15歲, $2,800)
7. 兒童跆拳道體驗營 - 台南 (6-12歲, $980)
8. 2026 親子路跑嘉年華 - 新竹 (5-16歲, $500)

### 3. Schema 文件

建立詳細的 schema 說明文件：`docs/SCHEMA.md`

內容包含：
- 表格結構完整說明
- 欄位定義與用途
- 索引策略
- 約束條件說明
- 資料關聯圖
- 查詢優化建議
- 維護注意事項

---

## 資料庫驗證結果

### Flyway Migration 歷史
```
installed_rank | version |           description           | success | execution_time
----------------+---------+---------------------------------+---------+----------------
              1 | 1       | create events and orders tables | t       |             53
              2 | 2       | seed events data                | t       |              7
```

### 建立的資料表
```
Schema |         Name          | Type
--------+-----------------------+-------
public | events                | table
public | orders                | table
public | flyway_schema_history | table
```

### Events 表格統計
- **總記錄數**: 8 筆
- **年齡範圍**: 4-16 歲
- **費用範圍**: $500 - $3,500
- **地點分布**: 台北(2)、新北(1)、桃園(1)、台中(1)、台南(1)、高雄(1)、新竹(1)

---

## Schema 設計亮點

### 1. 資料完整性保證
- **參照完整性**: Orders 透過外鍵關聯 Events，確保訂單對應到有效賽事
- **資料驗證**: 年齡、費用、容量都有適當的 CHECK 約束
- **時間邏輯**: 確保報名截止時間 < 賽事開始 < 賽事結束

### 2. 查詢效能優化
- **複合索引**: age_min + age_max 支援年齡範圍查詢
- **外鍵索引**: event_id 加速 JOIN 操作
- **時間索引**: start_time, created_at 支援時間範圍查詢

### 3. 自動化機制
- **UUID 主鍵**: 自動生成，避免 ID 衝突
- **時間戳記**: created_at, updated_at 自動維護
- **觸發器**: 更新時自動更新 updated_at

### 4. 彈性設計
- **可選欄位**: 緊急聯絡人、備註等欄位設為 NULLABLE
- **年齡限制**: 支援嚴格/非嚴格執行模式
- **訂單狀態**: 完整的生命週期狀態管理

---

## 測試建議

### 1. 資料完整性測試
```sql
-- 測試年齡範圍約束
INSERT INTO events (name, age_min, age_max, ...)
VALUES ('Test Event', 15, 10, ...); -- 應該失敗 (age_min > age_max)

-- 測試時間邏輯約束
INSERT INTO events (registration_deadline, start_time, ...)
VALUES ('2026-03-15', '2026-03-10', ...); -- 應該失敗 (deadline > start)
```

### 2. 外鍵約束測試
```sql
-- 測試 CASCADE DELETE
DELETE FROM events WHERE id = '550e8400-e29b-41d4-a716-446655440000';
-- 應該同時刪除關聯的訂單
```

### 3. 觸發器測試
```sql
-- 測試 updated_at 自動更新
UPDATE events SET capacity = 40
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

SELECT updated_at FROM events
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
-- updated_at 應該是當前時間
```

---

## 後續開發建議

### 1. Entity 類別建立
需要建立對應的 JPA Entity 類別：
- `Event.kt` - 對應 events 表格
- `Order.kt` - 對應 orders 表格

### 2. Repository 層
```kotlin
interface EventRepository : JpaRepository<Event, UUID>
interface OrderRepository : JpaRepository<Order, UUID>
```

### 3. 自定義查詢
根據 OpenAPI 規格實作查詢方法：
- 依年齡範圍查詢賽事
- 依地點和日期篩選
- 統計賽事訂單資訊

### 4. 未來擴充
考慮新增以下表格：
- `users` - 使用者帳號系統
- `payments` - 付款記錄
- `event_images` - 賽事圖片
- `reviews` - 賽事評價

---

## 檔案清單

### Migration Scripts
- ✅ `src/main/resources/db/migration/V1__create_events_and_orders_tables.sql`
- ✅ `src/main/resources/db/migration/V2__seed_events_data.sql`

### 文件
- ✅ `docs/SCHEMA.md` - 完整 Schema 說明文件
- ✅ `docs/MIGRATION_REPORT.md` - 此報告

### 配置更新
- ✅ `build.gradle.kts` - 加入 Flyway 依賴
- ✅ `application.yml` - Flyway 配置與資料庫連線設定
- ✅ `application-dev.yml` - 開發環境資料庫設定

---

## 驗證步驟

### 查看所有表格
```bash
psql -h localhost -d sports_event_db -c "\dt"
```

### 查看 Events 資料
```bash
psql -h localhost -d sports_event_db -c "SELECT id, name, location, age_min, age_max, fee FROM events;"
```

### 查看 Migration 歷史
```bash
psql -h localhost -d sports_event_db -c "SELECT * FROM flyway_schema_history;"
```

### 檢查表格結構
```bash
psql -h localhost -d sports_event_db -c "\d events"
psql -h localhost -d sports_event_db -c "\d orders"
```

---

## 注意事項

1. **資料庫用戶設定**:
   - 配置檔案已更新為使用本地用戶 `bloodsword1147`
   - 生產環境部署時需更新為適當的資料庫用戶和密碼

2. **Migration 版本控制**:
   - 已執行的 migration 檔案絕對不可修改
   - 未來的 schema 變更需建立新的 migration (V3, V4...)

3. **資料備份**:
   - 執行 migration 前建議先備份資料庫
   - 生產環境部署時務必先在測試環境驗證

4. **索引維護**:
   - 隨著資料量增長，需定期監控查詢效能
   - 可能需要根據實際使用模式調整索引策略

---

## 結論

✅ **任務完成**: PostgreSQL schema 和 migrations 已成功建立並驗證

**下一步**:
1. 建立 JPA Entity 類別 (Event, Order)
2. 實作 Repository 和 Service 層
3. 根據 OpenAPI 規格實作 Controller
4. 撰寫單元測試和整合測試

**相關文件**:
- [Schema 詳細說明](./SCHEMA.md)
- [OpenAPI 規格](./api/openapi.yaml)
- [專案結構](../PROJECT_STRUCTURE.md)
