# syntax=docker/dockerfile:1
# Next.js 生产镜像（standalone）+ pnpm workspace（构建 context = 仓库根目录）
# 用法：docker compose 中 context: . dockerfile: frontend/Dockerfile

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

# ---------- 依赖（仅安装 frontend 及其依赖） ----------
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter frontend...

# ---------- 构建 ----------
FROM base AS builder
COPY --from=deps /app /app
WORKDIR /app
COPY frontend ./frontend

WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm exec prisma generate
RUN pnpm run build

# ---------- 运行 ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

RUN apk add --no-cache su-exec

# 与 frontend/package.json 中 prisma 版本一致
RUN npm install -g prisma@6.19.2

COPY --from=builder /app/frontend/prisma ./prisma
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static

COPY --chown=nextjs:nodejs frontend/docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER root

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
