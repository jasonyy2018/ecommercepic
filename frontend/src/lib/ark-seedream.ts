/**
 * 火山方舟 Ark — Doubao Seedream 图像生成（OpenAI 兼容 HTTP）
 *
 * 环境变量：
 *   ARK_API_KEY（必填）
 *   ARK_BASE_URL（可选，默认 https://ark.cn-beijing.volces.com/api/v3）
 *   ARK_IMAGE_MODEL（可选，默认 doubao-seedream-5-0-260128）
 *   ARK_IMAGE_SIZE（可选，默认 2K）
 *   ARK_WATERMARK=true 时打水印（默认 false）
 *
 * 参考图：使用 data URL（与官方示例的 HTTPS URL 二选一），把本地产品图一并传给模型。
 */

import type { WorkerGeneratePayload } from "@/lib/cloudflare-worker";

export function isArkImageConfigured(): boolean {
  return Boolean(process.env.ARK_API_KEY?.trim());
}

function combinedPrompt(payload: WorkerGeneratePayload): string {
  return `【场景: ${payload.scene}】\n${payload.prompt}\n\n请严格参考所给产品图，保持产品外观、包装与标识清晰可辨，生成适合电商详情页与广告投放的主图。`;
}

export async function callArkSeedreamGenerate(payload: WorkerGeneratePayload): Promise<Buffer> {
  const apiKey = process.env.ARK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("请配置环境变量 ARK_API_KEY（火山方舟 API Key）");
  }

  const baseUrl = (process.env.ARK_BASE_URL?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(
    /\/$/,
    "",
  );
  const model = process.env.ARK_IMAGE_MODEL?.trim() || "doubao-seedream-5-0-260128";
  const size = process.env.ARK_IMAGE_SIZE?.trim() || "2K";

  const imageRef = `data:${payload.sourceMime};base64,${payload.sourceImageBase64}`;

  const body: Record<string, unknown> = {
    model,
    prompt: combinedPrompt(payload),
    size,
    response_format: "b64_json",
    image: imageRef,
    watermark: process.env.ARK_WATERMARK === "true",
    sequential_image_generation: "disabled",
  };

  const res = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ark Seedream HTTP ${res.status}: ${text.slice(0, 1200)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Ark 返回非 JSON：${text.slice(0, 240)}`);
  }

  const errMsg = extractArkError(json);
  if (errMsg) {
    throw new Error(`Ark: ${errMsg.slice(0, 800)}`);
  }

  const b64 = extractB64OrUrl(json);
  if (b64) {
    return Buffer.from(b64, "base64");
  }

  const url = extractImageUrl(json);
  if (url) {
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      throw new Error(`Ark 返回的图片 URL 下载失败 HTTP ${imgRes.status}`);
    }
    return Buffer.from(await imgRes.arrayBuffer());
  }

  throw new Error(`Ark 响应中未找到图片数据：${JSON.stringify(json).slice(0, 500)}`);
}

function extractArkError(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.error === "string") return o.error;
  if (o.error && typeof o.error === "object") {
    const e = o.error as Record<string, unknown>;
    if (typeof e.message === "string") return e.message;
    if (typeof e.msg === "string") return e.msg;
  }
  return null;
}

function extractB64OrUrl(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  const d = first as Record<string, unknown>;
  if (typeof d.b64_json === "string") return d.b64_json;
  return null;
}

function extractImageUrl(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  const d = first as Record<string, unknown>;
  if (typeof d.url === "string") return d.url;
  return null;
}
