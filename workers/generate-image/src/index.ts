/**
 * Cloudflare Worker：校验密钥后接收 Next.js 传来的 scene/prompt/源图 base64，
 * 在此接入 Workers AI（如 @cf/stabilityai/stable-diffusion-xl-base-1.0）生成图片，
 * 并以 JSON { data: "<base64>", format: "png" } 返回。
 *
 * 部署：在此目录执行 npx wrangler deploy（需配置 wrangler.toml 中的 vars / secrets）
 */

export interface Env {
  WORKER_SECRET: string;
}

type Body = {
  scene?: string;
  prompt?: string;
  sourceImageBase64?: string;
  sourceMime?: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const auth = request.headers.get("Authorization") ?? "";
    const expected = `Bearer ${env.WORKER_SECRET}`;
    if (!env.WORKER_SECRET || auth !== expected) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return Response.json({ error: "invalid json" }, { status: 400 });
    }

    if (!body.prompt || !body.scene) {
      return Response.json({ error: "prompt and scene required" }, { status: 400 });
    }

    // TODO: 调用 env.AI.run(...) 等 Workers AI 绑定，用 body.sourceImageBase64 做图生图 / 参考图。
    // 占位：返回 1×1 PNG，便于联调 Next → Worker 全链路。
    const stubPng =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    return Response.json({
      data: stubPng,
      format: "png",
      note: "stub: replace with Workers AI output",
      echo: { scene: body.scene, promptLen: body.prompt.length, hasSource: Boolean(body.sourceImageBase64) },
    });
  },
};
