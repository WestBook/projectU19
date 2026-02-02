# 專案設定指南

## 環境需求

### 必要軟體

1. **JDK 17**
   ```bash
   # macOS
   brew install openjdk@17

   # 設定 JAVA_HOME
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)

   # 驗證
   java -version  # 應顯示 17.x.x
   ```

2. **PostgreSQL 15+**
   ```bash
   # 方式一：使用 Homebrew
   brew install postgresql@15
   brew services start postgresql@15

   # 方式二：使用 Docker
   docker run --name postgres-sports \
     -e POSTGRES_DB=sports_event_db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 \
     -d postgres:15
   ```

## 初始化專案

### 1. 建立資料庫

```bash
# 連線到 PostgreSQL
psql -U postgres

# 建立資料庫
CREATE DATABASE sports_event_db;

# 驗證
\l
\q
```

### 2. 下載 Gradle Wrapper（首次執行）

專案已包含 Gradle Wrapper，首次執行時會自動下載 Gradle：

```bash
./gradlew --version
```

預期輸出：
```
Gradle 8.5
Kotlin: 1.9.22
JVM: 17.x.x
```

### 3. 建置專案

```bash
# 清理並建置
./gradlew clean build

# 僅建置（不執行測試）
./gradlew build -x test
```

### 4. 運行應用程式

```bash
# 使用開發環境設定
./gradlew bootRun --args='--spring.profiles.active=dev'
```

應用程式會在 http://localhost:8080 啟動。

### 5. 驗證安裝

```bash
# Health Check
curl http://localhost:8080/api/health

# 預期回應
{
  "status": "OK",
  "service": "Sports Event Platform API",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

## 開發環境設定

### IDE 設定

#### IntelliJ IDEA（推薦）

1. 開啟專案：File → Open → 選擇專案根目錄
2. 等待 Gradle sync 完成
3. 設定 JDK：File → Project Structure → Project SDK → 選擇 Java 17
4. 啟用 Annotation Processing：Settings → Build → Compiler → Annotation Processors

#### VS Code

安裝以下擴充套件：
- Extension Pack for Java
- Kotlin Language
- Spring Boot Extension Pack

### 資料庫設定

#### 預設設定

應用程式預設使用以下資料庫設定：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/sports_event_db
    username: postgres
    password: postgres
```

#### 自訂設定

建立 `src/main/resources/application-local.yml`：

```yaml
spring:
  datasource:
    url: jdbc:postgresql://your-host:5432/your-db
    username: your-username
    password: your-password

logging:
  level:
    com.sportsplatform: DEBUG
```

啟動時指定 profile：

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

## 常用指令

### Gradle 指令

```bash
# 清理建置
./gradlew clean

# 編譯
./gradlew compileKotlin

# 執行測試
./gradlew test

# 檢查程式碼
./gradlew check

# 查看依賴樹
./gradlew dependencies

# 查看可用任務
./gradlew tasks
```

### 應用程式指令

```bash
# 啟動（預設 profile）
./gradlew bootRun

# 啟動（開發 profile）
./gradlew bootRun --args='--spring.profiles.active=dev'

# 背景執行
./gradlew bootRun &

# 停止背景執行
pkill -f 'spring-boot'
```

### 資料庫指令

```bash
# 連線到資料庫
psql -h localhost -U postgres -d sports_event_db

# 列出所有表
\dt

# 查看表結構
\d table_name

# 執行 SQL
SELECT * FROM events;

# 退出
\q
```

## 疑難排解

### 問題：Port 8080 已被佔用

**錯誤訊息**：
```
Port 8080 is already in use
```

**解決方案**：
```bash
# 找出佔用 port 的程式
lsof -ti:8080

# 終止該程式
lsof -ti:8080 | xargs kill

# 或修改 application.yml 中的 port
server:
  port: 8081
```

### 問題：無法連線到資料庫

**錯誤訊息**：
```
Connection to localhost:5432 refused
```

**解決方案**：
1. 檢查 PostgreSQL 是否運行
   ```bash
   # Homebrew
   brew services list

   # Docker
   docker ps
   ```

2. 測試資料庫連線
   ```bash
   psql -h localhost -U postgres -d sports_event_db
   ```

3. 檢查防火牆設定

### 問題：Gradle 建置失敗

**錯誤訊息**：
```
Could not resolve dependencies
```

**解決方案**：
```bash
# 清理並重新下載依賴
./gradlew clean build --refresh-dependencies

# 清理 Gradle 快取
rm -rf ~/.gradle/caches/

# 重新建置
./gradlew build
```

### 問題：Java 版本不符

**錯誤訊息**：
```
Unsupported class file major version 61
```

**解決方案**：
```bash
# 檢查 Java 版本
java -version

# 設定 JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# 驗證
echo $JAVA_HOME
```

## 下一步

1. 閱讀 [backend-README.md](backend-README.md) 了解專案結構
2. 查看 [API 文件](docs/api/openapi.yaml) 了解 API 規格
3. 參考 [SDD 文件](AI_Sports_Event_Platform_SDD.md) 了解系統架構

## 需要協助？

- 檢查 [backend-README.md](backend-README.md) 的疑難排解章節
- 查看 [錯誤處理指南](docs/api/ERROR_HANDLING_GUIDE.md)
- 參考 Spring Boot 官方文件：https://spring.io/projects/spring-boot
