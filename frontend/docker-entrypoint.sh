#!/bin/sh
set -e

# Docker 命名卷挂载到 /data/uploads 时常为 root 属主，nextjs(1001) 无法 mkdir → EACCES
UPLOAD_DIR="${UPLOAD_DIR:-/data/uploads}"
if [ -n "$UPLOAD_DIR" ]; then
  echo "[entrypoint] Ensuring upload dir exists and is writable: $UPLOAD_DIR"
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs "$UPLOAD_DIR" || true
  chmod -R u+rwX "$UPLOAD_DIR" || true
fi

echo "[entrypoint] Running Prisma migrations..."
su-exec nextjs prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting Next.js..."
if [ -f "./server.js" ]; then
  exec su-exec nextjs node ./server.js
fi

if [ -f "./frontend/server.js" ]; then
  # pnpm workspace + standalone 产物可能落在 /app/frontend/server.js
  exec su-exec nextjs node ./frontend/server.js
fi

echo "[entrypoint] ERROR: server.js not found at ./server.js or ./frontend/server.js"
ls -la .
exit 1
