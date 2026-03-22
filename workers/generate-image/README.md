# generate-image Worker

与 Next.js 约定：**POST** `Content-Type: application/json`，body：`{ "prompt": "…" }`；成功时返回 **`image/png` 二进制**（与当前 `frontend` 里 `cloudflare-worker.ts` 一致）。

**纯 JS 单文件（可粘贴控制台）：** 见同目录 **`worker.js`**。

## 推荐配置（`env.AI.run`）

本目录 `wrangler.toml` 已包含：

```toml
[ai]
binding = "AI"
```

部署后 Worker 内直接调用 `env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', { prompt, width, height })`，**不需要**在 Worker 里配置 `CF_API_TOKEN`。

```bash
npx wrangler deploy
```

### `env.AI.run is not a function`

说明 **`AI` 不是 Workers AI 绑定**：若在 Dashboard 的 **Environment variables** 里加了名为 `AI` 的**普通文本**，`env.AI` 没有 `.run`。

**处理：** 删掉该变量 → **Settings → Bindings → Add → Workers AI**，Variable name 填 **`AI`** → 保存并重新部署。用浏览器 **GET** 打开 Worker 地址，新版 `worker.js` 会返回 **`workersAiBindingOk: true`** 表示绑定正确。

**或** 不设 AI 绑定，只设 Secrets **`CF_ACCOUNT_ID` + `CF_API_TOKEN`**，代码会自动走 REST。

## 控制台部署（最省事）：只用 REST + Secrets

在 Worker **Settings → Variables → Secrets** 添加（名称必须一致）：

- `CF_ACCOUNT_ID` — 账户 ID  
- `CF_API_TOKEN` — API Token（权限含 **Workers AI → Edit**）

保存并部署后，**不必**配置 Workers AI Binding；代码会**优先走 REST**，避免误加「环境变量名叫 AI」导致 `env.AI.run is not a function`。

## 备选：仅 wrangler + `[ai]` 绑定

```bash
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_API_TOKEN
```

（同上 Token；**不要把 Account ID 写进仓库**。）

REST 返回一般是 **JSON**（`success` + `result`），不是整段 raw PNG；示例代码已按 JSON 解析 `result` 再转二进制。

## 安全（上线前）

```bash
npx wrangler secret put WORKER_SECRET
```

与 Next 的 `CLOUDFLARE_WORKER_SECRET` / `WORKER_SECRET` 一致。

## 你原稿里建议改的点

| 问题 | 说明 |
|------|------|
| 硬编码 Account ID | 用 `CF_ACCOUNT_ID` secret 或改用 `[ai]` 绑定 |
| 写死英文 prompt | 应使用请求体里的 `prompt`（Next 已传中文+场景） |
| `response.arrayBuffer()` | REST 多为 JSON 信封，需解析 `result` 再得到图片 |
| Token 暴露风险 | 仅 `wrangler secret put`，勿提交仓库；泄露后轮换 |
