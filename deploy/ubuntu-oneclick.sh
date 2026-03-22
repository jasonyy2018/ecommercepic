#!/usr/bin/env bash
# =============================================================================
# ecommercepic — Ubuntu 生产环境 Docker 一键部署
# 使用：docker-compose.ubuntu.yml（PostgreSQL + Next.js + Nginx，本地卷存图）
#
# 用法：
#   chmod +x deploy/ubuntu-oneclick.sh
#   ./deploy/ubuntu-oneclick.sh              # 构建并启动
#   ./deploy/ubuntu-oneclick.sh --pull       # 先 git pull 再部署
#   ./deploy/ubuntu-oneclick.sh --no-build   # 不重建镜像，仅 up -d
#   ./deploy/ubuntu-oneclick.sh --down       # 停止并移除容器（保留卷）
#   ./deploy/ubuntu-oneclick.sh --logs     # 跟随日志
#
# 首次部署前：复制 .env.docker.example 为 .env 并修改 POSTGRES_PASSWORD 等。
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.ubuntu.yml"
ENV_FILE="${ENV_FILE:-.env}"

RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GRN}[deploy]${NC} $*"; }
warn() { echo -e "${YLW}[deploy]${NC} $*"; }
err() { echo -e "${RED}[deploy]${NC} $*" >&2; }

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
}

DO_PULL=0
NO_BUILD=0
DO_DOWN=0
DO_LOGS=0

for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --pull) DO_PULL=1 ;;
    --no-build) NO_BUILD=1 ;;
    --down) DO_DOWN=1 ;;
    --logs) DO_LOGS=1 ;;
    *) err "未知参数: $arg"; usage >&2; exit 1 ;;
  esac
done

if [[ ! -f "$ROOT/$COMPOSE_FILE" ]]; then
  err "未找到 $COMPOSE_FILE，请在项目仓库根目录执行本脚本。"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  err "未安装 Docker。请先安装：https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi

# Docker Compose V2（插件）
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  err "未找到「docker compose」或 docker-compose。请安装 Docker Compose V2。"
  exit 1
fi

compose() {
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

ensure_env() {
  if [[ ! -f "$ROOT/$ENV_FILE" ]]; then
    if [[ -f "$ROOT/.env.docker.example" ]]; then
      warn "未找到 $ENV_FILE，从 .env.docker.example 复制..."
      cp "$ROOT/.env.docker.example" "$ROOT/$ENV_FILE"
      warn "请编辑 $ENV_FILE，至少修改 POSTGRES_PASSWORD，然后重新执行本脚本。"
      exit 1
    else
      err "缺少 $ENV_FILE 且无 .env.docker.example，无法继续。"
      exit 1
    fi
  fi
}

if [[ "$DO_DOWN" -eq 1 ]]; then
  ensure_env
  log "停止服务（数据卷保留）..."
  compose down
  log "已完成 down。"
  exit 0
fi

if [[ "$DO_LOGS" -eq 1 ]]; then
  ensure_env
  compose logs -f --tail=200
  exit 0
fi

ensure_env

if [[ "$DO_PULL" -eq 1 ]]; then
  if [[ -d "$ROOT/.git" ]]; then
    log "git pull..."
    git -C "$ROOT" pull --ff-only
  else
    warn "当前目录不是 git 仓库，跳过 --pull"
  fi
fi

# 弱密码提示（不强制退出，避免阻碍测试环境）
if grep -q '^POSTGRES_PASSWORD=ecommercepic_change_me' "$ROOT/$ENV_FILE" 2>/dev/null; then
  warn "检测到默认数据库密码 ecommercepic_change_me，生产环境请务必修改 $ENV_FILE"
fi

log "构建镜像并启动（$COMPOSE_FILE）..."
if [[ "$NO_BUILD" -eq 1 ]]; then
  compose up -d
else
  compose up -d --build
fi

HTTP_PORT="$(grep -E '^UBUNTU_HTTP_PORT=' "$ROOT/$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d ' "\r' || true)"
HTTP_PORT="${HTTP_PORT:-80}"

if command -v curl >/dev/null 2>&1; then
  log "等待 HTTP 就绪（最多约 120s）..."
  start_ts=$(date +%s)
  while true; do
    if curl -sf "http://127.0.0.1:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
      log "健康检查通过。"
      break
    fi
    now=$(date +%s)
    if (( now - start_ts > 120 )); then
      warn "超时仍未响应 /api/health，请执行: $0 --logs"
      break
    fi
    sleep 3
  done
else
  warn "未安装 curl，跳过 HTTP 就绪检测。可安装: sudo apt install -y curl"
fi

compose ps

echo ""
log "部署完成。"
echo "  - 本机 HTTP: http://127.0.0.1:${HTTP_PORT}/"
echo "  - AI 场景页: http://127.0.0.1:${HTTP_PORT}/generate"
echo "  - 查看日志:  $0 --logs"
echo "  - 停止服务:  $0 --down"
echo ""
