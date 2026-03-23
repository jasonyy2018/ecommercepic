import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { callArkSeedreamGenerate, isArkImageConfigured } from "@/lib/ark-seedream";
import { callGenerateImageWorker, isWorkerConfigured } from "@/lib/cloudflare-worker";
import { getImageBackendStatus } from "@/lib/image-generation-backend";
import { makePublicFileUrl, makeUploadRelPath, UPLOAD_ROOT, writeFileAtomic } from "@/lib/uploads";

/** 1×1 PNG，Worker 未配置且读源图失败时的兜底 */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function relFromPublicFileUrl(imageUrl: string): string | null {
  const prefix = "/api/files/";
  if (!imageUrl.startsWith(prefix)) return null;
  try {
    const decoded = decodeURIComponent(imageUrl.slice(prefix.length));
    if (decoded.includes("..")) return null;
    return decoded.replaceAll("\\", "/");
  } catch {
    return null;
  }
}

/**
 * 执行生成：读本地产品图 → 按策略调 Cloudflare Worker / 火山方舟 Seedream / 占位（源图副本）→ 写入 UPLOAD_ROOT/generations/{id}/result.png
 */
export async function runGeneration(id: string) {
  const gen = await prisma.generation.findUnique({ where: { id } });
  if (!gen) throw new Error("Generation not found");
  if (gen.status === "done" && gen.resultUrl) return gen;
  if (gen.status === "generating") return gen;

  await prisma.generation.update({
    where: { id },
    data: { status: "generating", errorMessage: null },
  });

  const rel = relFromPublicFileUrl(gen.imageUrl);
  if (!rel) {
    return prisma.generation.update({
      where: { id },
      data: { status: "failed", errorMessage: "无效的图片地址（需 /api/files/...）" },
    });
  }

  const absSource = path.join(UPLOAD_ROOT, rel);
  const root = path.resolve(UPLOAD_ROOT);
  const resolved = path.resolve(absSource);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return prisma.generation.update({
      where: { id },
      data: { status: "failed", errorMessage: "非法文件路径" },
    });
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(absSource);
  } catch {
    return prisma.generation.update({
      where: { id },
      data: { status: "failed", errorMessage: "找不到源图文件" },
    });
  }

  const ext = path.extname(absSource).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";

  const provider = process.env.IMAGE_GENERATION_PROVIDER?.trim().toLowerCase();
  if (provider === "ark" && !isArkImageConfigured()) {
    return prisma.generation.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage: "IMAGE_GENERATION_PROVIDER=ark 但未配置 ARK_API_KEY",
      },
    });
  }
  if ((provider === "cloudflare" || provider === "worker") && !isWorkerConfigured()) {
    return prisma.generation.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage: "IMAGE_GENERATION_PROVIDER=cloudflare 但未配置 CLOUDFLARE_WORKER_URL / WORKER_URL",
      },
    });
  }

  try {
    const { imageBackend } = getImageBackendStatus();
    let out: Buffer;

    if (imageBackend === "ark") {
      out = await callArkSeedreamGenerate({
        scene: gen.scene,
        prompt: gen.prompt,
        sourceImageBase64: imageBuffer.toString("base64"),
        sourceMime: mime,
      });
    } else if (imageBackend === "cloudflare") {
      out = await callGenerateImageWorker({
        scene: gen.scene,
        prompt: gen.prompt,
        sourceImageBase64: imageBuffer.toString("base64"),
        sourceMime: mime,
      });
    } else {
      // 未配置任何生图后端：用源图副本作为「联调占位」，便于验证存储与下载链路
      out = imageBuffer.length > 0 ? imageBuffer : TINY_PNG;
    }

    const outRel = makeUploadRelPath(["generations", id, "result.png"]);
    const outAbs = path.join(UPLOAD_ROOT, outRel);
    await writeFileAtomic(outAbs, new Uint8Array(out));
    const resultUrl = makePublicFileUrl(outRel);

    return prisma.generation.update({
      where: { id },
      data: { status: "done", resultUrl },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return prisma.generation.update({
      where: { id },
      data: { status: "failed", errorMessage: msg.slice(0, 2000) },
    });
  }
}
