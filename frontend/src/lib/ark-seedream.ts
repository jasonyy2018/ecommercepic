/**
 * 火山方舟 Ark — Doubao Seedream 图像生成（OpenAI 兼容 HTTP）
 *
 * 配置来源见 `ark-image-config.ts`（环境变量 + 系统设置）。
 * 参考图：data URL，把本地产品图一并传给模型。
 */

import type { WorkerGeneratePayload } from "@/lib/cloudflare-worker";
import { resolveArkImageConfig } from "@/lib/ark-image-config";

function combinedPrompt(payload: WorkerGeneratePayload): string {
  return `【场景: ${payload.scene}】\n${payload.prompt}\n\n请严格参考所给产品图，保持产品外观、包装与标识清晰可辨，生成适合电商详情页与广告投放的主图。`;
}

export async function callArkSeedreamGenerate(payload: WorkerGeneratePayload): Promise<Buffer> {
  const cfg = await resolveArkImageConfig();
  if (!cfg.apiKey) {
    throw new Error(
      "未配置火山方舟生图 Key：请设置环境变量 ARK_API_KEY，或在系统设置填写「文本 API Key」或「生图 API Key」",
    );
  }

  const imageRef = `data:${payload.sourceMime};base64,${payload.sourceImageBase64}`;

  const body: Record<string, unknown> = {
    model: cfg.model,
    prompt: combinedPrompt(payload),
    size: cfg.size,
    response_format: "b64_json",
    image: imageRef,
    watermark: cfg.watermark,
    sequential_image_generation: "disabled",
  };

  const res = await fetch(`${cfg.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
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
