/**
 * 调用部署在 Cloudflare 上的 Worker（内部再调 Workers AI 生图）。
 * 在 .env 中配置 CLOUDFLARE_WORKER_URL + CLOUDFLARE_WORKER_SECRET。
 */

const url = process.env.CLOUDFLARE_WORKER_URL?.trim();
const secret = process.env.CLOUDFLARE_WORKER_SECRET?.trim();

export function isWorkerConfigured(): boolean {
  return Boolean(url && secret);
}

export type WorkerGeneratePayload = {
  scene: string;
  prompt: string;
  sourceImageBase64: string;
  sourceMime: string;
};

export type WorkerGenerateResult = {
  data: string;
  format: string;
};

export async function callGenerateImageWorker(
  payload: WorkerGeneratePayload,
): Promise<WorkerGenerateResult> {
  if (!url || !secret) {
    throw new Error("CLOUDFLARE_WORKER_URL / CLOUDFLARE_WORKER_SECRET 未配置");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Worker HTTP ${res.status}: ${text.slice(0, 800)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Worker 返回非 JSON");
  }

  const obj = json as { data?: string; format?: string; error?: string };
  if (obj.error) throw new Error(String(obj.error).slice(0, 500));
  if (!obj.data || typeof obj.data !== "string") {
    throw new Error("Worker 未返回 data（base64 图片）");
  }
  return { data: obj.data, format: typeof obj.format === "string" ? obj.format : "png" };
}
