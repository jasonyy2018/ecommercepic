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

## 备选：REST + API Token

若暂时不用 `[ai]` 绑定，可：

```bash
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_API_TOKEN
```

Token 需具备 **Workers AI → Edit**。**不要把 Account ID 写死在仓库代码里**（你曾在别处贴出过 ID，建议在控制台轮换相关 Token）。

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
