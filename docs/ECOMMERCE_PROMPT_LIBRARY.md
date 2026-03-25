# 电商提示词库说明

结构化词库源码：`frontend/src/lib/ecommerce-prompt-library.ts`。

## 包含内容

| 类型 | 说明 |
|------|------|
| `ECOMMERCE_PRESET_PACKAGES` | 一键套餐（覆盖卖点 + 商用/家用场景 + 人群） |
| `ECOMMERCE_PROMPT_GROUPS` | 分组词条，可逐条追加到创建页对应字段 |
| `DOORMAT_LONG_PROMPT_VARIANTS` | `/generate` 门口地垫场景的 4 条长提示（镜位变体） |

## 在界面中的位置

- **创建任务**（`/create`）：区块「2a. 电商提示词库」— 套餐按钮 + 折叠分组 +「追加到…」「复制全文」。
- **场景图生成**（`/generate`）：选择「门口地垫 / 商铺门面」时，Prompt 上方出现 4 个词库快捷按钮。

## 扩展方式

1. 在 `ecommerce-prompt-library.ts` 中新增 `EcommercePromptEntry` 或整包 `EcommercePresetPackage`。
2. 若需新品类专用长提示，可仿照 `DOORMAT_LONG_PROMPT_VARIANTS` 增加常量，并在 `generate/page.tsx` 中按 `scene` 挂载快捷按钮。

## 与方舟文案模型的关系

使用火山方舟生成 26 条时，`prompt-llm-ark.ts` 中已增加对「商用地毯/门垫」的英文 text 约束（抠图保真、门头构图等），与本地词库原则对齐。
