import { NextResponse } from "next/server";
import path from "node:path";
import type { ApiError, ProductImage, ProductImageType } from "@/lib/types";
import { makePublicFileUrl, makeUploadRelPath, safeExtFromMime, UPLOAD_ROOT, writeFileAtomic } from "@/lib/uploads";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-handle-error";

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12MB per image

function normalizeType(t: string | null): ProductImageType {
  const v = (t ?? "").toUpperCase();
  if (v === "FLAT" || v === "DISPLAY" || v === "DETAIL") return v as ProductImageType;
  return "DISPLAY";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((x) => x instanceof File) as File[];
  if (files.length === 0) return NextResponse.json<ApiError>({ error: "no files" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json<ApiError>({ error: "max 10 images" }, { status: 400 });

  const taskId = String(form.get("taskId") ?? "");
  if (!taskId) return NextResponse.json<ApiError>({ error: "taskId is required" }, { status: 400 });
  try {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
  if (!task) return NextResponse.json<ApiError>({ error: "task not found" }, { status: 404 });

  const type = normalizeType(String(form.get("type") ?? "DISPLAY"));
  const material = String(form.get("material") ?? "").trim() || undefined;

  const saved: ProductImage[] = [];

  for (const f of files) {
    const ext = safeExtFromMime(f.type);
    if (!ext) return NextResponse.json<ApiError>({ error: "only jpg/png allowed" }, { status: 400 });
    if (f.size > MAX_FILE_BYTES) return NextResponse.json<ApiError>({ error: "file too large" }, { status: 400 });

    const base = path
      .basename(f.name || "upload")
      .replaceAll("..", ".")
      .replaceAll("/", "_")
      .replaceAll("\\", "_")
      .replaceAll(" ", "_");
    const filename = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}_${base}`.replace(/\.(png|jpg|jpeg)$/i, "") + `.${ext}`;

    const rel = makeUploadRelPath([taskId, filename]);
    const abs = path.join(UPLOAD_ROOT, rel);
    const buf = new Uint8Array(await f.arrayBuffer());
    await writeFileAtomic(abs, buf);

    const url = makePublicFileUrl(rel);
    const row = await prisma.uploadedImage.create({
      data: { taskId, url, type, material },
    });

    saved.push({ id: row.id, url, type, material });
  }

  return NextResponse.json({ items: saved });
  } catch (e) {
    return toErrorResponse(e, "uploads/POST");
  }
}

