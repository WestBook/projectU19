# ── Stage 1: Install dependencies ─────────────────────────────────────────────
# Build context: 專案根目錄（docker-compose build context: .）
FROM node:20-alpine AS deps

WORKDIR /app/ai-agent
COPY ai-agent/package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: Build TypeScript ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/ai-agent
COPY ai-agent/package*.json ./
RUN npm ci

# 複製 ai-agent 原始碼
COPY ai-agent/tsconfig.json ./
COPY ai-agent/src ./src

# 複製 orchestrator 程式碼（共享自 frontend）
COPY frontend/src/features/chat/orchestrator ./src/orchestrator

# 複製 system prompt 文件
COPY docs/ai/prompt.md ./docs/ai/prompt.md

RUN npm run build

# ── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup -S aiagent && adduser -S aiagent -G aiagent

WORKDIR /app

COPY --from=deps    /app/ai-agent/node_modules ./node_modules
COPY --from=builder /app/ai-agent/dist         ./dist
COPY --from=builder /app/ai-agent/docs         ./docs

USER aiagent

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
