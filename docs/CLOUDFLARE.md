# Cloudflare Worker + Next.js 对接说明

## MVP（当前默认）

- **只需**环境变量 **`CLOUDFLARE_WORKER_URL`** 或 **`WORKER_URL`**（二选一，指向 Worker 的 `https://…` 地址）。
- **`CLOUDFLARE_WORKER_SECRET`** / **`WORKER_SECRET` 可选**。若设置了，Next 会带 `Authorization: Bearer <密钥>`。
- Next → Worker：**`POST`**，`Content-Type: application/json`，body 为：
  ```json
  { "prompt": "【场景: door_mat】\n你的正文 prompt…" }
  ```
- Worker → Next 响应（二选一均可）：
  1. **`Content-Type: image/png`**（或 `image/jpeg` 等）+ **图片二进制正文**（推荐，与 `arrayBuffer()` 一致）；或  
  2. **`Content-Type: application/json`**，且 JSON 含 **`{ "data": "<base64图片>" }`**（**勿**返回空的 JSON 正文，否则会报错）。

若误把**图片二进制**标成 `application/json` 且正文非合法 JSON，也会失败；请改对 `Content-Type`。

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

## 仍然出现 HTTP 500 时怎么区分

| 报错里出现 | 含义 |
|------------|------|
| **`Worker HTTP 5xx`** + 后面一段 JSON | 问题在 **Cloudflare Worker**（Secret、Token、模型、API 返回格式） |
| **`数据库` / `Prisma` / `503`** | 问题在 **Next + Postgres**（`DATABASE_URL`、迁移） |
| **`EACCES` / `uploads`** | 问题在 **本机/容器上传目录权限** |

### Worker 侧自查（推荐顺序）

1. 浏览器 **GET** 打开 `WORKER_URL`：看 `secretsConfigured`、`cfApiTokenLength` 是否真为已配置（长度 > 0）。  
2. 本机执行（把地址换成你的）：

   ```bash
   curl.exe -X POST "https://xxx.workers.dev" -H "Content-Type: application/json" -d "{\"prompt\":\"a red apple\"}" -o out.png
   ```

   - 若得到 **PNG**：Worker 正常，再查 Next 的 `WORKER_URL` 与是否重启容器。  
   - 若 `out.png` 实为文本：打开看 `error` 字段（Token 权限、额度、`result` 解析失败等）。  
3. Worker 上若设置了 **`WORKER_SECRET`**，Next 的 `.env` 里 **`WORKER_SECRET` 必须一致**，否则会 **401**（不是 500）。

### 常见 Worker 500 原因

- Secret **名称拼错**（须 `CF_ACCOUNT_ID`、`CF_API_TOKEN`），或改完后 **未再 Deploy**。  
- API Token **没有 Workers AI → Edit**，或已过期。  
- 账户 **Workers AI 额度/计费** 未开通或超限（看 Cloudflare 控制台 AI 用量与报错 JSON）。
