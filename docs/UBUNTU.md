# Ubuntu 部署（本地存储 + Nginx + 可选 Cloudflare AI）

架构：**Next.js（同机）+ PostgreSQL + 本地磁盘 `UPLOAD_DIR` 存上传图与生成结果**；**AI 生图**由 **Cloudflare Worker + Workers AI** 完成；域名与 CDN 可放在 Cloudflare。

## 1. 目录与数据流

- 上传与生成结果均写入 `UPLOAD_DIR`（Compose 中为卷 `uploads` → 容器内 `/data/uploads`）。
- 上传路径：`{taskId}/{filename}` → 公网 URL：`/api/files/{taskId}/{filename}`。
- 生成结果：`generations/{generationId}/result.png` → `/api/files/generations/{generationId}/result.png`。

## 2. 一键部署脚本（推荐）

在仓库根目录执行：

```bash
chmod +x deploy/ubuntu-oneclick.sh
./deploy/ubuntu-oneclick.sh
```

首次运行若不存在 `.env`，会从 `.env.docker.example` 复制一份并提示你编辑密码后再运行。

常用参数：`--pull`（先 git pull）、`--no-build`（仅重启）、`--down`（停止容器保留卷）、`--logs`（看日志）。详见脚本头部注释。

## 3. 手动 Docker Compose（Nginx 反代）

```bash
# 配置数据库密码等可放在 .env
docker compose -f docker-compose.ubuntu.yml --env-file .env up -d --build
```

- 对外 **80** 端口由 **Nginx** 反代到 **app:3000**。
- 如需本机直连 Next 调试，可临时在 `docker-compose.ubuntu.yml` 的 `app` 上增加 `ports: - "3000:3000"`。

## 4. Cloudflare Worker 环境变量（服务器）

在运行 Next 的环境中设置：

| 变量 | 说明 |
|------|------|
| `CLOUDFLARE_WORKER_URL` | Worker 的 HTTPS 地址 |
| `CLOUDFLARE_WORKER_SECRET` | 与 Worker 内 `WORKER_SECRET` 一致；请求头 `Authorization: Bearer ...` |

未配置时，应用仍可走通「上传 → 生成任务 → 写结果文件」链路，**结果文件为源图副本**（占位），用于联调存储与下载。

Worker 示例代码见仓库 `workers/generate-image/`。

## 5. 数据库迁移

首次部署或更新表结构后，镜像入口脚本会执行 `prisma migrate deploy`。本地可手动：

```bash
cd frontend
npm run db:migrate:deploy
```

## 6. CDN（可选）

将静态/图片域名指向站点或单独缓存 `/api/files/*` 的路径规则，由 Cloudflare CDN 加速（注意缓存策略与鉴权需求）。
