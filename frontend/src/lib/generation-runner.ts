import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { callGenerateImageWorker, isWorkerConfigured } from "@/lib/cloudflare-worker";
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
 * 执行生成：读本地产品图 → 调 Cloudflare Worker（若已配置）→ 结果写入 UPLOAD_ROOT/generations/{id}/result.png
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

  try {
    let out: Buffer;
    if (isWorkerConfigured()) {
      const workerRes = await callGenerateImageWorker({
        scene: gen.scene,
        prompt: gen.prompt,
        sourceImageBase64: imageBuffer.toString("base64"),
        sourceMime: mime,
      });
      out = Buffer.from(workerRes.data, "base64");
    } else {
      // 未配置 Worker：用源图副本作为「联调占位」，便于验证存储与下载链路
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
