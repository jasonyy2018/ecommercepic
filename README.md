# ecommercepic

地毯行业 **AI 出图** 全栈应用（Next.js + PostgreSQL）。

> **许可**：本仓库为**非开源专有软件**，详见根目录 **[LICENSE](./LICENSE)**。未获书面授权不得复制、分发或用于商业用途。

## Docker 一键部署

```bash
copy .env.docker.example .env
# 编辑 .env，修改 POSTGRES_PASSWORD

docker compose up -d --build
```

浏览器访问：<http://localhost:3000>

详细说明见 **[docs/DOCKER.md](./docs/DOCKER.md)**。

### Ubuntu：Nginx + 本地存图（无 MinIO）

一键部署：

```bash
chmod +x deploy/ubuntu-oneclick.sh
./deploy/ubuntu-oneclick.sh
```

或手动：`docker compose -f docker-compose.ubuntu.yml --env-file .env up -d --build`  
默认通过 **80** 访问。详见 **[docs/UBUNTU.md](./docs/UBUNTU.md)**。

前端 **MVP 流程**：侧边栏 **「AI 场景生成」**（`/generate`）→ 上传产品图 → 选场景 → 生成 → 本地下载；历史记录在页面底部表格。

## 生产级 Docker 部署

```bash
copy .env.prod.example .env.prod
# 编辑 .env.prod：配置域名、邮箱、数据库强密码

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

生产部署默认使用 Caddy 反向代理 + HTTPS（Let's Encrypt）。

## 包管理与本地开发

使用 **pnpm**（Node 20+，建议先执行 `corepack enable` 启用自带 pnpm）。

```bash
# 仓库根目录：安装 workspace（frontend + backend）
pnpm install

# 仅跑前端
pnpm --filter frontend dev

# 或进入 frontend
cd frontend
pnpm run db:migrate:deploy
pnpm dev
```

Docker 构建已改为：**context = 项目根目录**，`frontend/Dockerfile` 内用 `pnpm install --filter frontend...`，需提交根目录 **`pnpm-lock.yaml`**。

Cloudflare Worker 与 `WORKER_SECRET` 配置见 **[docs/CLOUDFLARE.md](./docs/CLOUDFLARE.md)**（勿把 `cfut_` API Token 与 Bearer 密钥混用）。

更多见 [frontend/README.md](./frontend/README.md)。
