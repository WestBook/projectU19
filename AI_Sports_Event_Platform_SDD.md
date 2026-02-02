# Software Design Document (SDD)

## AI 驅動的兒童體育賽事電商與營運後台平台

---

## 1. 文件目的 (Purpose)

本文件描述「AI 驅動的兒童體育賽事電商與營運後台平台」之系統架構、模組設計、資料流與技術決策，作為開發、維護與面試說明之依據。

此系統為模擬實務專案，設計目標對齊真實 Production 環境需求。

---

## 2. 系統目標 (System Goals)

- 提供家長可使用的賽事瀏覽與報名電商平台
- 提供賽事主辦方後台管理功能
- 整合 AI 客服（AI Agent）協助即時查詢賽事與報名資訊
- 採用可維護、可擴充的前後端分離架構

---

## 3. 使用者角色 (User Roles)

| 角色               | 說明                   |
| ------------------ | ---------------------- |
| 家長 (Parent)      | 瀏覽賽事、報名、諮詢   |
| 主辦方 (Partner)   | 建立與管理賽事         |
| 系統管理者 (Admin) | 平台維運（示意）       |
| AI Agent           | 虛擬客服，協助資料查詢 |

---

## 4. 系統架構總覽 (System Architecture)

```
[ React Frontend ]
        |
        v
[ RESTful API - Spring Boot ]
        |
        v
[ PostgreSQL Database ]

[ AI Agent ]
   |        |
   v        v
Spring Boot API + DB
```

### 架構說明

- 前端與後端完全解耦（Frontend / Backend Separation）
- AI Agent 不直接存取 DB，僅透過 API
- API 設計符合 RESTful 規範

---

## 5. 技術選型 (Technology Stack)

### 前端

- React + TypeScript
- Vite
- HTML5 / CSS3
- Responsive Web Design (RWD)
- Fetch / Axios

### 後端

- Kotlin
- Spring Boot
- Spring Web MVC
- JPA / Hibernate

### 資料庫

- PostgreSQL

### AI

- OpenAI API（或同類 LLM）
- AI Agent（Function Calling / Tool Calling）

### DevOps / Tooling

- Git + Git Flow
- ESLint / Prettier
- JUnit / MockMVC

---

## 6. 前端設計 (Frontend Design)

### 6.1 架構方式

```
src/
 ├─ features/
 │   ├─ events/
 │   ├─ orders/
 │   ├─ admin/
 │   └─ ai-chat/
 ├─ components/
 ├─ hooks/
 ├─ services/
 └─ pages/
```

### 6.2 主要頁面

- 賽事列表頁
- 賽事詳情頁
- 報名 / 購物車頁
- 主辦方後台頁
- AI 客服聊天視窗

### 6.3 狀態管理

- React Hooks
- 表單狀態本地管理
- API 狀態（loading / error / retry）

---

## 7. 後端設計 (Backend Design)

### 7.1 模組分層

```
controller/
service/
repository/
domain/
dto/
```

### 7.2 API 範例

#### 賽事查詢

```
GET /api/events
GET /api/events/{id}
```

#### 報名

```
POST /api/orders
```

#### 主辦方管理

```
POST /api/admin/events
GET /api/admin/events/{id}/participants
```

---

## 8. 資料庫設計 (Database Design)

### 8.1 資料表

#### events

| 欄位       | 型別      |
| ---------- | --------- |
| id         | UUID      |
| name       | varchar   |
| age_min    | int       |
| age_max    | int       |
| start_time | timestamp |
| location   | varchar   |

#### orders

| 欄位        | 型別    |
| ----------- | ------- |
| id          | UUID    |
| event_id    | UUID    |
| parent_name | varchar |
| child_age   | int     |
| status      | varchar |

---

## 9. AI 客服設計 (AI Agent Design)

### 9.1 功能

- 自然語言理解
- 根據使用者問題呼叫 API
- 整理結構化回應

### 9.2 流程

1. 使用者提問
2. AI 判斷意圖
3. 呼叫對應 API
4. 整理並回傳答案

### 9.3 安全設計

- API 白名單
- 回傳資料限制
- Timeout 與 fallback 設計

---

## 10. 錯誤處理與穩定性 (Error Handling)

- API 統一錯誤格式
- Retry 機制
- 前端 graceful degradation
- Log 與 exception tracking（示意）

---

## 11. 測試策略 (Testing Strategy)

### 前端

- Component 測試（基本）

### 後端

- Unit Test
- API Integration Test

---

## 12. 未來擴充 (Future Enhancements)

- 真實金流串接
- 身分驗證與權限系統
- 高流量快取（Redis）
- 多語系支援

---
