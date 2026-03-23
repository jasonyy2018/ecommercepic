# 火山方舟 — 文案 / 提示词（Responses API）

`/api/prompts/generate`（创建任务页「批量生成」）与 **`/api/prompts/regenerate-one`**（单条「重新生成」）支持：

- **本地模板**（默认）：不调用外网，规则拼接 26 条提示词。
- **火山方舟**：`POST {ARK_BASE_URL}/responses`，与官方 Python `OpenAI(base_url=..., api_key=...).responses.create(...)` 一致。

## 优先级（「强制」环境变量优先）

| 项 | 优先 | 其次 | 默认 |
|----|------|------|------|
| 供应商 | `TEXT_LLM_PROVIDER`（`ark` / `template`） | 系统设置「文案来源」 | `template` |
| API Key | `ARK_API_KEY` | 设置页「文本 API Key」 | — |
| 文本模型 ID | `ARK_TEXT_MODEL` | 设置页「Ark 文本模型端点 ID」 | `doubao-seed-2-0-lite-260215` |
| Base URL | `ARK_BASE_URL` | 设置页「Ark Base URL」 | `https://ark.cn-beijing.volces.com/api/v3` |

在 Docker / 服务器上设置 `TEXT_LLM_PROVIDER=ark` 可**强制**走方舟，无需改 `.data/settings.json`。

## 系统设置页

路径：**系统设置 → 模型供应商**

- **文案 / 提示词来源**：选「火山方舟」后，需配置 Key（或环境变量 `ARK_API_KEY`）。
- **文本模型端点 ID**：与控制台开通的推理接入点一致（如 `doubao-seed-2-0-lite-260215`）。

## 可选：多模态参考图

POST body 可增加 **`referenceImageUrl`**（公网 `http(s)` 图链）。本地 `/api/files/...` 对方服务不可访问，需对象存储等公网 URL。

## 单条重新生成

`POST /api/prompts/regenerate-one`：body 与批量生成相同的商品字段 + `prompt: { index, type, title, text }`，可选 `referenceImageUrl`。  
- 供应商为 **ark** 时：调用方舟重写该条。  
- 供应商为 **template** 时：按 `index` 取本地模板该条（与当前编辑内容无关）。

## 相关代码

- `frontend/src/lib/ark-responses.ts` — HTTP 调用 `/responses`
- `frontend/src/lib/prompt-llm-ark.ts` — 拼装 input、解析 JSON（含单条 `regenerateOnePromptWithArk`）
- `frontend/src/lib/text-llm-provider.ts` — 供应商与模型解析
- `frontend/src/lib/prompt-template.ts` — 本地模板（含 `getTemplatePromptByIndex`）

## 密钥说明

设置页将 Key 写入 `.data/settings.json`，**仅适合内网 / 开发**。生产请用 **环境变量** `ARK_API_KEY`，且勿把该文件提交到 Git。
