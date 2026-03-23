import { getAppSettings, type TextLlmProvider } from "@/lib/app-settings";

/**
 * 文案模型供应商解析顺序：
 * - TEXT_LLM_PROVIDER 环境变量（ark | template）优先于设置文件
 * - API Key：ARK_API_KEY 优先于设置页「文本 API Key」
 * - 模型 ID：ARK_TEXT_MODEL 优先于设置页「Ark 文本模型 ID」
 * - Base URL：ARK_BASE_URL 优先于设置页「Ark API Base URL」
 */
export async function resolveTextLlmConfig(): Promise<{
  provider: TextLlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string | undefined;
}> {
  const settings = await getAppSettings();
  const envP = process.env.TEXT_LLM_PROVIDER?.trim().toLowerCase();
  let provider: TextLlmProvider;
  if (envP === "ark" || envP === "template") {
    provider = envP;
  } else {
    provider = settings.textLlmProvider === "ark" ? "ark" : "template";
  }

  const apiKey = process.env.ARK_API_KEY?.trim() || settings.textModelKey?.trim() || "";
  const model =
    process.env.ARK_TEXT_MODEL?.trim() ||
    settings.arkTextModel?.trim() ||
    "doubao-seed-2-0-lite-260215";
  const fromEnvBase = process.env.ARK_BASE_URL?.trim();
  const fromSettingsBase = settings.arkBaseUrl?.trim();
  const baseUrl = fromEnvBase || fromSettingsBase || undefined;

  return { provider, apiKey, model, baseUrl };
}
