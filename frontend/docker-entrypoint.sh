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
exec su-exec nextjs node server.js
