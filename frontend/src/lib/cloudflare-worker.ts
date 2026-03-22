/**
 * 调用 Cloudflare Worker（Workers AI 等）。
 *
 * MVP（测跑）：
 * - 只需配置 URL：`CLOUDFLARE_WORKER_URL` 或 `WORKER_URL`
 * - `CLOUDFLARE_WORKER_SECRET` / `WORKER_SECRET` 可选；有则带 `Authorization: Bearer`
 * - POST JSON：`{ prompt }`（prompt 内会拼上场景说明）
 * - 响应：优先识别 `application/json` + `{ data: base64 }`；否则按**图片二进制**（arrayBuffer）
 *
 * 以后若要强制鉴权，给 Worker 校验 Bearer 并始终配置 SECRET 即可。
 */

function getWorkerUrl(): string | undefined {
  const a = process.env.CLOUDFLARE_WORKER_URL?.trim();
  const b = process.env.WORKER_URL?.trim();
  return a || b || undefined;
}

function getWorkerSecret(): string | undefined {
  const a = process.env.CLOUDFLARE_WORKER_SECRET?.trim();
  const b = process.env.WORKER_SECRET?.trim();
  const v = a || b;
  return v || undefined;
}

export function isWorkerConfigured(): boolean {
  return Boolean(getWorkerUrl());
}

export type WorkerGeneratePayload = {
  scene: string;
  prompt: string;
  sourceImageBase64: string;
  sourceMime: string;
};

/**
 * 返回生成图的 PNG/JPEG 等原始字节（已解码）。
 */
export async function callGenerateImageWorker(payload: WorkerGeneratePayload): Promise<Buffer> {
  const url = getWorkerUrl();
  if (!url) {
    throw new Error("请配置 CLOUDFLARE_WORKER_URL 或 WORKER_URL");
  }

  const secret = getWorkerSecret();
  const combinedPrompt = `【场景: ${payload.scene}】\n${payload.prompt}`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (secret) {
    headers.authorization = `Bearer ${secret}`;
  }

  const res = await fetch(url.replace(/\/$/, ""), {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: combinedPrompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker HTTP ${res.status}: ${text.slice(0, 800)}`);
  }

  const raw = Buffer.from(await res.arrayBuffer());
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();

  // 部分 Worker/CDN 把 PNG 标成 json 或漏标 Content-Type：先按魔数识别二进制图
  if (raw.length >= 8 && raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47) {
    return raw;
  }
  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xd8) {
    return raw;
  }

  if (ct.includes("application/json")) {
    const text = raw.toString("utf8").trim();
    if (!text) {
      throw new Error(
        "Worker 声明 Content-Type 为 JSON 但正文为空。请让 Worker 返回图片二进制，或返回 JSON：{ \"data\": \"<base64>\" }",
      );
    }
    let json: { data?: string; format?: string; error?: string };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      // 部分 Worker 误标为 json 实为图片/文本
      if (raw.length > 0 && raw[0] === 0x89 && raw[1] === 0x50) {
        return raw;
      }
      throw new Error(
        `Worker 声明为 JSON 但无法解析。正文开头：${text.slice(0, 120)}`,
      );
    }
    if (json.error) throw new Error(String(json.error).slice(0, 500));
    if (!json.data || typeof json.data !== "string") {
      throw new Error(
        "Worker 返回 JSON 但缺少 data（base64）。若直接返回图片，请改用 Content-Type: image/png（勿用 application/json）。",
      );
    }
    return Buffer.from(json.data, "base64");
  }

  if (raw.length === 0) {
    throw new Error("Worker 返回空内容");
  }
  return raw;
}
