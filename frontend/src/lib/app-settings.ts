import path from "node:path";
import { readJsonFile } from "@/lib/json-store";

/** 与「模型供应商」设置页、`.data/settings.json` 一致 */
export type TextLlmProvider = "template" | "ark";

export type AppSettings = {
  /** 文案/提示词：本地模板 或 火山方舟 Responses API */
  textLlmProvider: TextLlmProvider;
  /** Ark 文本模型端点 ID（如 doubao-seed-2-0-lite-260215） */
  arkTextModel: string;
  /** 可选，留空则用默认北京 endpoint */
  arkBaseUrl: string;
  /** 在 textLlmProvider=ark 时作为 API Key（生产建议用环境变量 ARK_API_KEY） */
  textModelKey: string;
  imageModelKey: string;
  videoModelKey: string;
  uploadDir: string;
  maxConcurrency: string;
  defaultRatios: string;
  brandName: string;
  watermark: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  textLlmProvider: "template",
  arkTextModel: "doubao-seed-2-0-lite-260215",
  arkBaseUrl: "",
  textModelKey: "",
  imageModelKey: "",
  videoModelKey: "",
  uploadDir: "",
  maxConcurrency: "3",
  defaultRatios: "1:1,3:4,16:9",
  brandName: "",
  watermark: "",
};

export const SETTINGS_FILE = path.join(process.cwd(), ".data", "settings.json");

export async function getAppSettings(): Promise<AppSettings> {
  const raw = await readJsonFile<Partial<AppSettings>>(SETTINGS_FILE, {});
  return { ...DEFAULT_APP_SETTINGS, ...raw };
}
