# syntax=docker/dockerfile:1
# Next.js 全栈生产镜像（standalone）+ 启动时 prisma migrate deploy

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---------- 依赖 ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 构建 ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# prisma generate 不连库，占位即可满足 schema 解析
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"
ENV DATABASE_URL=$DATABASE_URL

RUN npx prisma generate
RUN npm run build

# ---------- 运行 ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# entrypoint 先以 root 修正 UPLOAD_DIR 权限，再 su-exec 到 nextjs
RUN apk add --no-cache su-exec

# 与 package.json 中 @prisma/client 主版本对齐，用于 migrate deploy
RUN npm install -g prisma@6.16.0

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
# Windows 检出时可能为 CRLF，避免 shebang 解析失败
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

# 由 entrypoint 修正卷权限后以 nextjs 运行（勿在此 USER nextjs，否则无法 chown /data/uploads）
USER root

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
