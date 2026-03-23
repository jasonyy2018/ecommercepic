import path from "node:path";
import { readJsonFile } from "@/lib/json-store";

/** 与「模型供应商」设置页、`.data/settings.json` 一致 */
export type TextLlmProvider = "template" | "ark";

/** /generate 生图：自动规则 vs 强制某一路（环境变量 IMAGE_GENERATION_PROVIDER 仍优先） */
export type ImageGenerationProviderSetting = "auto" | "ark" | "cloudflare";

export type AppSettings = {
  /** 文案/提示词：本地模板 或 火山方舟 Responses API */
  textLlmProvider: TextLlmProvider;
  /** Ark 文本模型端点 ID（如 doubao-seed-2-0-lite-260215） */
  arkTextModel: string;
  /** 可选，留空则用默认北京 endpoint */
  arkBaseUrl: string;
  /** 火山方舟 API Key（文案；生图未单独填 imageModelKey 时与生图共用） */
  textModelKey: string;
  /** 生图专用 Key（可选；不填则用 textModelKey / 环境变量 ARK_API_KEY） */
  imageModelKey: string;
  /** Seedream 等生图模型端点 ID */
  arkImageModel: string;
  /** 如 1K / 2K / 4K */
  arkImageSize: string;
  /** 设为 true 时打水印 */
  arkImageWatermark: string;
  /** 生图走 Ark 还是 Cloudflare；auto 时若 .env 仍配了 WORKER_URL 会优先 Worker */
  imageGenerationProvider: ImageGenerationProviderSetting;
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
  arkImageModel: "",
  arkImageSize: "",
  arkImageWatermark: "",
  imageGenerationProvider: "auto",
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
