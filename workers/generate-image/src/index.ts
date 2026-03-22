/**
 * Next.js → Worker：POST JSON { prompt } → Workers AI 出图 → 返回 image/png（与当前 Next 端一致）
 *
 * 推荐：使用 wrangler 的 [ai] 绑定调用 env.AI.run（同账号下无需 CF_API_TOKEN）。
 * 备选：设置 CF_ACCOUNT_ID + CF_API_TOKEN（secret）走 REST（勿把账号 ID 写死在代码里）。
 */

export interface Env {
  AI?: AiBinding;
  WORKER_SECRET?: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

/** Wrangler [ai] binding = "AI" 时的最小类型 */
type AiBinding = {
  run(
    model: string,
    args: Record<string, unknown>,
  ): Promise<Uint8Array | { image?: string } | ArrayBuffer>;
};

type Body = {
  prompt?: string;
  width?: number;
  height?: number;
};

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

function hasRealWorkersAi(env: Env): boolean {
  return Boolean(env.AI && typeof (env.AI as { run?: unknown }).run === "function");
}

function toPngResponse(bytes: Uint8Array): Response {
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

/** 统一把 AI 返回值变成 PNG 字节（与 worker.js 逻辑对齐） */
function normalizeImageOutput(raw: unknown): Uint8Array {
  if (raw == null) {
    throw new Error("Cloudflare API 的 result 为空");
  }
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);

  if (typeof raw === "string" && raw.length > 64) {
    try {
      const bin = atob(raw.trim());
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      if (out.length > 0) return out;
    } catch {
      /* 非 base64 */
    }
  }

  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "number") {
    return Uint8Array.from(raw);
  }

  if (raw && typeof raw === "object") {
    if ("image" in raw) {
      const img = (raw as { image: unknown }).image;
      if (typeof img === "string") {
        const bin = atob(img);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      if (img instanceof Uint8Array) return img;
      if (img instanceof ArrayBuffer) return new Uint8Array(img);
      if (Array.isArray(img) && img.length && typeof img[0] === "number") {
        return Uint8Array.from(img);
      }
    }
    if ("data" in raw && typeof (raw as { data: unknown }).data === "string") {
      const bin = atob((raw as { data: string }).data);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
  }

  const preview =
    typeof raw === "object" ? JSON.stringify(raw).slice(0, 240) : String(raw).slice(0, 240);
  throw new Error(`无法解析图片 result，预览：${preview}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return Response.json({ ok: true, service: "generate-image", model: MODEL });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (env.WORKER_SECRET) {
      const auth = request.headers.get("Authorization") ?? "";
      if (auth !== `Bearer ${env.WORKER_SECRET}`) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return Response.json({ error: "prompt required" }, { status: 400 });
    }

    const width = Math.min(2048, Math.max(256, Number(body.width) || 1024));
    const height = Math.min(2048, Math.max(256, Number(body.height) || 1024));

    try {
      let png: Uint8Array;

      const accountId = env.CF_ACCOUNT_ID?.trim();
      const token = env.CF_API_TOKEN?.trim();

      // 有 Token 时优先 REST，避免误配「环境变量 AI」时仍去调 env.AI.run
      if (accountId && token) {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
      const cfRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, width, height }),
      });

      const ct = cfRes.headers.get("content-type") ?? "";

      // REST 一般为 JSON 信封；少数场景可能是二进制
      if (ct.includes("application/json")) {
        const json = (await cfRes.json()) as {
          success?: boolean;
          errors?: { message?: string }[];
          result?: unknown;
        };
        if (!cfRes.ok || json.success === false) {
          const msg =
            json.errors?.map((e) => e.message).join("; ") ||
            `Cloudflare API HTTP ${cfRes.status}`;
          return Response.json({ error: msg }, { status: 502 });
        }
        png = normalizeImageOutput(json.result);
        return toPngResponse(png);
      }

      const buf = new Uint8Array(await cfRes.arrayBuffer());
      if (!cfRes.ok) {
        const text = new TextDecoder().decode(buf.slice(0, 500));
        return Response.json({ error: `AI HTTP ${cfRes.status}: ${text}` }, { status: 502 });
      }
      return toPngResponse(buf);
      }

      if (hasRealWorkersAi(env)) {
        const out = await env.AI!.run(MODEL, {
          prompt,
          width,
          height,
        });
        png = normalizeImageOutput(out);
        return toPngResponse(png);
      }

      if (env.AI != null) {
        return Response.json(
          {
            error:
              "名为 AI 的配置不是 Workers AI 绑定：请用 wrangler [ai] binding 或 Dashboard Bindings 添加「Workers AI」；勿在 Environment variables 里加名为 AI 的文本。或删除误配并设置 CF_ACCOUNT_ID + CF_API_TOKEN 走 REST。",
          },
          { status: 500 },
        );
      }

      return Response.json(
        {
          error:
            "未配置 AI：wrangler.toml 增加 [ai] binding = \"AI\"，或设置 secret CF_ACCOUNT_ID + CF_API_TOKEN",
        },
        { status: 500 },
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json({ error: message.slice(0, 500) }, { status: 500 });
    }
  },
};
