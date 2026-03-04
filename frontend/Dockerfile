# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite env vars are baked in at build time via build args
ARG VITE_API_BASE_URL=http://localhost
ARG VITE_ADMIN_TOKEN=demo-admin-secret-2026
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ADMIN_TOKEN=$VITE_ADMIN_TOKEN

RUN npm run build

# ── Stage 2: Serve via nginx ───────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
