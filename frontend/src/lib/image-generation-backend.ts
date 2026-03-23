/**
 * 生图后端选择：Cloudflare Worker / 火山方舟 Seedream / 占位（源图副本）
 */

import { isArkImageConfiguredAsync } from "@/lib/ark-image-config";
import { isWorkerConfigured } from "@/lib/cloudflare-worker";

export type ImageBackendId = "ark" | "cloudflare" | "placeholder";

export async function getImageBackendStatus(): Promise<{
  workerConfigured: boolean;
  arkConfigured: boolean;
  imageBackend: ImageBackendId;
}> {
  const workerConfigured = isWorkerConfigured();
  const arkConfigured = await isArkImageConfiguredAsync();
  const p = process.env.IMAGE_GENERATION_PROVIDER?.trim().toLowerCase();

  let imageBackend: ImageBackendId;
  if (p === "ark") {
    imageBackend = arkConfigured ? "ark" : "placeholder";
  } else if (p === "cloudflare" || p === "worker") {
    imageBackend = workerConfigured ? "cloudflare" : "placeholder";
  } else {
    // 默认：优先 Cloudflare（兼容已有部署）；否则 Ark；再否则占位
    if (workerConfigured) imageBackend = "cloudflare";
    else if (arkConfigured) imageBackend = "ark";
    else imageBackend = "placeholder";
  }

  return { workerConfigured, arkConfigured, imageBackend };
}
