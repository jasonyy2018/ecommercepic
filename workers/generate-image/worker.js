/**
 * ecommercepic — 生图 Worker（控制台 Quick Edit 专用）
 *
 * 本文件【只走 REST】，不调用 env.AI.run，避免「env.AI.run is not a function」类错误。
 *
 * 必配 Secrets（名称必须完全一致，区分大小写）：
 *   CF_ACCOUNT_ID  — 账户 ID
 *   CF_API_TOKEN   — API Token（权限含 Workers AI → Edit）
 *
 * 与 Next.js：POST JSON { "prompt": "…" } → 返回 image/png
 * 可选：WORKER_SECRET → 请求头 Authorization: Bearer <同值>
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
  async fetch(request, env) {
    const accountId = String(env.CF_ACCOUNT_ID ?? "").trim();
    const token = String(env.CF_API_TOKEN ?? "").trim();
    const secretsOk = Boolean(accountId && token);

    if (request.method === "GET") {
      return Response.json({
        ok: true,
        service: "generate-image-rest-only",
        model: MODEL,
        secretsConfigured: secretsOk,
        cfAccountIdLength: accountId.length,
        cfApiTokenLength: token.length,
        hint: secretsOk
          ? "Secrets 已注入，可 POST 测生图"
          : "缺少 Secret：在 Worker → Settings → Variables → Secrets 添加 CF_ACCOUNT_ID 与 CF_API_TOKEN，保存后必须再 Deploy。勿用 Environment variables 代替 Secrets（若需明文可用 Variables 文本，名称仍须一致）。",
      });
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

    if (!secretsOk) {
      return Response.json(
        {
          error:
            "未读到 CF_ACCOUNT_ID 或 CF_API_TOKEN：请到该 Worker → Settings → Variables and Secrets → Secrets 添加（名称完全一致），保存后点击 Deploy。用 GET 打开本 URL 可查看 secretsConfigured / 长度是否为 0。",
        },
        { status: 500 },
      );
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
        const png = normalizeImageOutput(json.result);
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
