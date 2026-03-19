#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] starting Next.js..."
exec node server.js
