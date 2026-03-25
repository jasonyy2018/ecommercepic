import { getAppSettings, SETTINGS_FILE } from "@/lib/app-settings";
import { resolveTextLlmConfig } from "@/lib/text-llm-provider";

/** 仅用于排查「Key 是否生效」，不返回任何密钥内容 */
export type SettingsDiagnosticSafe = {
  settingsFile: string;
  /** 环境变量 TEXT_LLM_PROVIDER 原始值；未设置则为 null */
  textLlmProviderEnv: string | null;
  /** 实际用于文案/Prompt 的模式（环境变量优先于界面） */
  effectiveTextLlmProvider: "ark" | "template";
  /** 方舟 Key 是否已解析到非空（含环境变量或设置文件） */
  arkKeyConfigured: boolean;
  /** Key 解析自何处（与 resolveTextLlmConfig 顺序一致） */
  arkKeySource: "env" | "textModelKey" | "imageModelKey" | "none";
};

export async function getSettingsDiagnosticSafe(): Promise<SettingsDiagnosticSafe> {
  const settings = await getAppSettings();
  const cfg = await resolveTextLlmConfig();

  const envP = process.env.TEXT_LLM_PROVIDER;
  const textLlmProviderEnv =
    envP !== undefined && String(envP).trim() !== "" ? String(envP).trim().toLowerCase() : null;

  const envK = process.env.ARK_API_KEY?.trim();
  const tk = settings.textModelKey?.trim();
  const ik = settings.imageModelKey?.trim();

  let arkKeySource: SettingsDiagnosticSafe["arkKeySource"] = "none";
  if (envK) arkKeySource = "env";
  else if (tk) arkKeySource = "textModelKey";
  else if (ik) arkKeySource = "imageModelKey";

  return {
    settingsFile: SETTINGS_FILE,
    textLlmProviderEnv,
    effectiveTextLlmProvider: cfg.provider,
    arkKeyConfigured: Boolean(cfg.apiKey),
    arkKeySource,
  };
}
