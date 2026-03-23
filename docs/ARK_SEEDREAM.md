# 火山方舟（Ark）Doubao Seedream 接入说明

Next.js **服务端**在生成任务中调用方舟 **OpenAI 兼容**图像接口，把本地产品图编码为 **`data:image/...;base64,...`** 作为 `image` 参考字段（与官方示例中的 HTTPS 图片 URL 等价一类用法）。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `ARK_API_KEY` | 是（使用 Ark 时） | 方舟 API Key |
| `ARK_BASE_URL` | 否 | 默认 `https://ark.cn-beijing.volces.com/api/v3`，可按地域调整 |
| `ARK_IMAGE_MODEL` | 否 | 默认 `doubao-seedream-5-0-260128` |
| `ARK_IMAGE_SIZE` | 否 | 默认 `2K` |
| `ARK_WATERMARK` | 否 | 设为 `true` 时打水印 |
| `IMAGE_GENERATION_PROVIDER` | 否 | `ark`：只用 Ark；`cloudflare`：只用 Worker；**不设置**时：若配置了 Worker URL 则优先 Worker，否则有 `ARK_API_KEY` 则用 Ark，否则占位（源图副本） |

## 与 Cloudflare Worker 同时配置时

未设置 `IMAGE_GENERATION_PROVIDER` 时 **默认优先 Cloudflare**，避免已有部署行为变化。  
若要用 Seedream，请设置：

```env
IMAGE_GENERATION_PROVIDER=ark
ARK_API_KEY=...
```

## 请求说明

- 接口：`POST {ARK_BASE_URL}/images/generations`
- 正文字段：`model`、`prompt`、`size`、`response_format: b64_json`、`image`（data URL）、`sequential_image_generation: disabled` 等。
- 若方舟返回 JSON 中首图为 `url` 而非 `b64_json`，服务端会自动再请求该 URL 拉取图片。

## 若报错与参考图相关

部分账号/模型对 `image` 仅接受 **公网 HTTPS URL**。若 `data:` 被拒绝：

1. 将产品图上传到对象存储并得到可访问 URL；或  
2. 自行扩展代码：在 `ark-seedream.ts` 中把 `image` 改为你的 URL（需对公网可读）。

官方 Python 示例见火山文档（`OpenAI` 客户端 + `extra_body.image`）。

## 相关代码

- `frontend/src/lib/ark-seedream.ts` — 调用方舟  
- `frontend/src/lib/image-generation-backend.ts` — 后端选择逻辑  
- `frontend/src/lib/generation-runner.ts` — 读本地产品图 → 调用生图 → 写入 `generations/{id}/result.png`

文案 / 提示词（Responses API，与 Seedream 可共用 `ARK_API_KEY`）见 **[ARK_TEXT_LLM.md](./ARK_TEXT_LLM.md)**。
