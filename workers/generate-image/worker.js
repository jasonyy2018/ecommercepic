/**
 * ecommercepic — 生图 Worker（纯 JS，可粘贴到 Cloudflare 控制台 Quick Edit）
 *
 * 与 Next.js 约定：
 *   POST + Content-Type: application/json
 *   body: { "prompt": "必填", "width": 1024, "height": 1024 可选 }
 *   成功：返回 image/png 二进制
 *
 * Cloudflare 里请配置（二选一）：
 *   A) 推荐：Workers AI 绑定，变量名 AI（与 wrangler [ai] binding = "AI" 一致）
 *   B) 备选：Secrets — CF_ACCOUNT_ID、CF_API_TOKEN（Workers AI Edit 权限）
 *
 * 可选 Secret：WORKER_SECRET — 若设置，请求须带 Header: Authorization: Bearer <同值>
 */

const MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

function toPngResponse(bytes) {
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeImageOutput(raw) {
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);

  if (raw && typeof raw === "object" && "image" in raw) {
    const img = raw.image;
    if (typeof img === "string") {
      const bin = atob(img);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    if (img instanceof Uint8Array) return img;
    if (img instanceof ArrayBuffer) return new Uint8Array(img);
  }

  throw new Error("Workers AI 返回格式无法识别为图片");
}

export default {
  /**
   * @param {Request} request
   * @param { { AI?: { run: (m: string, a: object) => Promise<unknown> }, WORKER_SECRET?: string, CF_ACCOUNT_ID?: string, CF_API_TOKEN?: string } } env
   */
  async fetch(request, env) {
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

    let body;
    try {
      body = await request.json();
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
      /** @type {Uint8Array} */
      let png;

      if (env.AI) {
        const out = await env.AI.run(MODEL, { prompt, width, height });
        png = normalizeImageOutput(out);
        return toPngResponse(png);
      }

      const accountId = (env.CF_ACCOUNT_ID || "").trim();
      const token = (env.CF_API_TOKEN || "").trim();
      if (!accountId || !token) {
        return Response.json(
          {
            error:
              '请绑定 Workers AI（变量名 AI）或设置 Secrets：CF_ACCOUNT_ID、CF_API_TOKEN',
          },
          { status: 500 },
        );
      }

      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
      const cfRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, width, height }),
      });

      const ct = cfRes.headers.get("content-type") || "";

      if (ct.includes("application/json")) {
        const json = await cfRes.json();
        if (!cfRes.ok || json.success === false) {
          const msg =
            (json.errors && json.errors.map((e) => e.message).join("; ")) ||
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return Response.json({ error: message.slice(0, 500) }, { status: 500 });
    }
  },
};
