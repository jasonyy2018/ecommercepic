/**
 * 火山方舟生图（Seedream）配置：环境变量优先，其次系统设置。
 * Key 优先级：ARK_API_KEY → imageModelKey（生图专用）→ textModelKey（与文案共用）
 */

import { getAppSettings } from "@/lib/app-settings";

export type ResolvedArkImageConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  size: string;
  watermark: boolean;
};

export async function resolveArkImageConfig(): Promise<ResolvedArkImageConfig> {
  const s = await getAppSettings();
  const apiKey =
    process.env.ARK_API_KEY?.trim() ||
    s.imageModelKey?.trim() ||
    s.textModelKey?.trim() ||
    "";
  const baseUrl = (
    process.env.ARK_BASE_URL?.trim() ||
    s.arkBaseUrl?.trim() ||
    "https://ark.cn-beijing.volces.com/api/v3"
  ).replace(/\/$/, "");
  const model =
    process.env.ARK_IMAGE_MODEL?.trim() ||
    s.arkImageModel?.trim() ||
    "doubao-seedream-5-0-260128";
  const size =
    process.env.ARK_IMAGE_SIZE?.trim() || s.arkImageSize?.trim() || "2K";
  const watermark =
    process.env.ARK_WATERMARK === "true" || s.arkImageWatermark === "true";

  return { apiKey, baseUrl, model, size, watermark };
}

export async function isArkImageConfiguredAsync(): Promise<boolean> {
  const { apiKey } = await resolveArkImageConfig();
  return Boolean(apiKey);
}
