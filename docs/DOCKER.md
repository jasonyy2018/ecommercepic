# Docker 部署说明

全栈 **Next.js（App Router + API Routes）** + **PostgreSQL**，上传文件持久化到 **命名卷** `uploads`。

## 快速启动

1. 在项目根目录创建环境文件：

   ```bash
   copy .env.docker.example .env
   ```

   编辑 `.env`，**务必修改** `POSTGRES_PASSWORD` 为强密码。

2. 构建并启动：

   ```bash
   docker compose up -d --build
   ```

3. 浏览器访问：`http://localhost:3000`（默认端口见 `.env` 中 `APP_PORT`）

## 生产部署（推荐）

使用 `docker-compose.prod.yml` + Caddy 反向代理（自动 TLS）：

1. 准备生产环境变量：

```bash
copy .env.prod.example .env.prod
```

编辑 `.env.prod`，至少配置：

- `APP_DOMAIN`（真实域名）
- `LETSENCRYPT_EMAIL`
- `POSTGRES_PASSWORD`（强密码）

2. 启动生产栈：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

3. 验证健康检查：

- 应用健康检查：`/api/health`
- 容器状态：`docker compose -f docker-compose.prod.yml ps`

4. 升级发布（无状态滚动方式）：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 行为说明

- **数据库**：`db` 服务健康后，`app` 容器启动时会执行 `prisma migrate deploy` 应用 `frontend/prisma/migrations` 中的迁移。
- **上传目录**：容器内 `UPLOAD_DIR=/data/uploads`，对应卷 `uploads`，重启不丢图。
- **PostgreSQL 数据**：卷 `pgdata`。

## 可选：Redis

```bash
docker compose --profile with-redis up -d
```

## 常用命令

```bash
# 查看日志
docker compose logs -f app

# 仅数据库
docker compose up -d db

# 进入应用容器（调试）
docker compose exec app sh

# 停止
docker compose down

# 停止并删除数据卷（慎用）
docker compose down -v
```

生产环境建议用对应文件：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

## 本地开发（非 Docker）

仍在 `frontend/` 下使用 `npm run dev`，并配置 `frontend/.env` 的 `DATABASE_URL`，执行：

```bash
npm run db:migrate
```

生产/容器内迁移使用：`npm run db:migrate:deploy`（已由 `docker-entrypoint.sh` 自动执行）。

## 故障：上传报 `EACCES: permission denied, mkdir '/data/uploads/...'`

应用进程以 **`nextjs`（uid 1001）** 运行；若挂载目录属主为 **root**，会无法建子目录。

- **命名卷**（默认 `docker-compose.yml`）：镜像已在 **`docker-entrypoint.sh`** 里对 `UPLOAD_DIR` 执行 `mkdir` + `chown nextjs:nodejs`，**重建镜像并重启**即可：

  ```bash
  docker compose build --no-cache app
  docker compose up -d
  ```

- **本机目录 bind mount**（例如把宿主机路径挂到 `/data/uploads`）：在宿主机上执行一次（Linux）：

  ```bash
  sudo mkdir -p /你的挂载路径
  sudo chown -R 1001:1001 /你的挂载路径
  ```

  Windows Docker Desktop 若仍异常，优先改用**命名卷**，避免把 NTFS 目录直接 bind 为上传根目录。

## 安全建议（生产）

- 不要暴露数据库端口到公网（`docker-compose.prod.yml` 默认未暴露）。
- 使用强密码并定期轮换。
- 通过 Caddy + TLS 对外暴露，仅开放 `80/443`。
- 备份 `pgdata` 与 `uploads` 卷（快照/对象存储）。
