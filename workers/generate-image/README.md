# generate-image Worker

与 Next.js 配合：MVP 只需 Next 侧配置 `CLOUDFLARE_WORKER_URL` 或 `WORKER_URL`。可选：`CLOUDFLARE_WORKER_SECRET` / `WORKER_SECRET` 与 Worker 内 `WORKER_SECRET` 一致；未设置 `WORKER_SECRET` 时本示例 Worker **不校验** Bearer（仅测跑）。

## 配置密钥

```bash
cd workers/generate-image
npx wrangler secret put WORKER_SECRET
```

## 部署

```bash
npx wrangler deploy
```

将输出的 `https://....workers.dev` 填入服务器环境变量 `CLOUDFLARE_WORKER_URL`。

## 接入 Workers AI

在 `wrangler.toml` 中增加 AI 绑定（以官方文档为准），在 `src/index.ts` 的 TODO 处调用模型，把生成结果的 PNG 转为 base64 放入 `data` 字段返回。
