/**
 * 生图后端选择：Cloudflare Worker / 火山方舟 Seedream / 占位（源图副本）
 *
 * 优先级：
 * 1) 环境变量 IMAGE_GENERATION_PROVIDER=ark | cloudflare | worker
 * 2) 系统设置 imageGenerationProvider（自动 / 强制方舟 / 强制 Worker）
 * 3) auto：已配置 Worker URL 则优先 Cloudflare，否则 Ark，否则占位
 */

import { getAppSettings, type ImageGenerationProviderSetting } from "@/lib/app-settings";
import { isArkImageConfiguredAsync } from "@/lib/ark-image-config";
import { isWorkerConfigured } from "@/lib/cloudflare-worker";

export type ImageBackendId = "ark" | "cloudflare" | "placeholder";

export type ImageProviderResolution = "env" | "settings" | "auto";

/**
 * 解析「想用哪条生图链路」（不含是否已配好 Key）。
 * - 环境变量始终覆盖界面
 */
export async function resolveImageProviderChoice(): Promise<{
  mode: "ark" | "cloudflare" | "auto";
  source: ImageProviderResolution;
}> {
  const env = process.env.IMAGE_GENERATION_PROVIDER?.trim().toLowerCase();
  if (env === "ark") {
    return { mode: "ark", source: "env" };
  }
  if (env === "cloudflare" || env === "worker") {
    return { mode: "cloudflare", source: "env" };
  }

  const s = await getAppSettings();
  const raw = (s.imageGenerationProvider ?? "auto").trim().toLowerCase();
  let ui: ImageGenerationProviderSetting = "auto";
  if (raw === "ark") ui = "ark";
  else if (raw === "cloudflare") ui = "cloudflare";

  if (ui === "ark") {
    return { mode: "ark", source: "settings" };
  }
  if (ui === "cloudflare") {
    return { mode: "cloudflare", source: "settings" };
  }

  return { mode: "auto", source: "auto" };
}

export async function getImageBackendStatus(): Promise<{
  workerConfigured: boolean;
  arkConfigured: boolean;
  imageBackend: ImageBackendId;
  providerMode: "ark" | "cloudflare" | "auto";
  providerSource: ImageProviderResolution;
}> {
  const workerConfigured = isWorkerConfigured();
  const arkConfigured = await isArkImageConfiguredAsync();
  const { mode, source } = await resolveImageProviderChoice();

  let imageBackend: ImageBackendId;
  if (mode === "ark") {
    imageBackend = arkConfigured ? "ark" : "placeholder";
  } else if (mode === "cloudflare") {
    imageBackend = workerConfigured ? "cloudflare" : "placeholder";
  } else {
    // auto：兼容旧部署——同时存在 Worker 与 Ark 时优先 Worker
    if (workerConfigured) imageBackend = "cloudflare";
    else if (arkConfigured) imageBackend = "ark";
    else imageBackend = "placeholder";
  }

  return {
    workerConfigured,
    arkConfigured,
    imageBackend,
    providerMode: mode,
    providerSource: source,
  };
}
