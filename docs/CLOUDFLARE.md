# Cloudflare Worker + Next.js 对接说明

## MVP（当前默认）

- **只需**环境变量 **`CLOUDFLARE_WORKER_URL`** 或 **`WORKER_URL`**（二选一，指向 Worker 的 `https://…` 地址）。
- **`CLOUDFLARE_WORKER_SECRET`** / **`WORKER_SECRET` 可选**。若设置了，Next 会带 `Authorization: Bearer <密钥>`。
- Next → Worker：**`POST`**，`Content-Type: application/json`，body 为：
  ```json
  { "prompt": "【场景: door_mat】\n你的正文 prompt…" }
  ```
- Worker → Next 响应（二选一均可）：
  1. **`Content-Type: application/json`**，且 JSON 含 **`{ "data": "<base64图片>" }`**；或  
  2. **图片二进制**（例如 `image/png`），与 `fetch().arrayBuffer()` 一致。

> 公网 `*.workers.dev` 无鉴权时任何人可调用，MVP 测跑可以，**上线前请加 Bearer 或其它门禁**。

## 生产升级（推荐）

1. 在 Worker 中校验 `Authorization: Bearer …`（与 `env.WORKER_SECRET` 一致）。
2. `npx wrangler secret put WORKER_SECRET`，在 Next / Docker 的 `.env` 里配置 **`CLOUDFLARE_WORKER_SECRET`**（或 `WORKER_SECRET`）为**同一串**。

## API Token（`cfut_…`）不要混用

| 类型 | 用途 |
|------|------|
| **API Token**（`cfut_` 等） | `wrangler deploy`、Cloudflare 账户 API |
| **WORKER_SECRET** | 仅用于 Next ↔ Worker 的 Bearer，需与 Worker 内变量一致 |

不要把 API Token 当成 `WORKER_SECRET` 填进 Next（除非 Worker 刻意按该方式校验，且你接受风险）。

## 环境变量示例

`frontend/.env` 或项目根 `.env`（Docker）：

```env
# 二选一
CLOUDFLARE_WORKER_URL=https://your-worker.workers.dev
# WORKER_URL=https://your-worker.workers.dev

# 可选（MVP 可不配）
# CLOUDFLARE_WORKER_SECRET=your-long-random-string
```

修改 Docker 所用 `.env` 后：`docker compose up -d`。

## 验证

- `/generate` 在未配 URL 时有黄色提示；**只配 URL** 后提示消失，`workerConfigured: true`。
- `GET /api/generations` 的 JSON 中 `workerConfigured` 同理。
