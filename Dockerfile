FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 複製 Gradle 建置產物
COPY build/libs/*.jar app.jar

# 安裝 curl（供 Docker healthcheck 使用）
RUN apk add --no-cache curl

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
