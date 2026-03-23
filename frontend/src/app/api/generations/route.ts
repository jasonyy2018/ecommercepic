import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-handle-error";
import { getImageBackendStatus } from "@/lib/image-generation-backend";
import { relFromPublicFileUrl } from "@/lib/generation-runner";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 50;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
  try {
    const items = await prisma.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        imageUrl: true,
        scene: true,
        prompt: true,
        status: true,
        resultUrl: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const b = await getImageBackendStatus();
    return NextResponse.json({
      items,
      workerConfigured: b.workerConfigured,
      arkConfigured: b.arkConfigured,
      imageBackend: b.imageBackend,
    });
  } catch (e) {
    return toErrorResponse(e, "generations/GET");
  }
}

export async function POST(req: Request) {
  let body: {
    imageUrl?: string;
    scene?: string;
    prompt?: string;
    userId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json<ApiError>({ error: "invalid json" }, { status: 400 });
  }

  const imageUrl = String(body.imageUrl ?? "").trim();
  const scene = String(body.scene ?? "").trim();
  const prompt = String(body.prompt ?? "").trim();
  const userId = String(body.userId ?? "anonymous").trim() || "anonymous";

  if (!imageUrl) return NextResponse.json<ApiError>({ error: "imageUrl 必填" }, { status: 400 });
  if (!scene) return NextResponse.json<ApiError>({ error: "scene 必填" }, { status: 400 });
  if (!prompt) return NextResponse.json<ApiError>({ error: "prompt 必填" }, { status: 400 });

  if (!relFromPublicFileUrl(imageUrl)) {
    return NextResponse.json<ApiError>(
      { error: "imageUrl 须为本地上传的 /api/files/... 地址" },
      { status: 400 },
    );
  }

  try {
    const gen = await prisma.generation.create({
      data: {
        userId,
        imageUrl,
        scene,
        prompt,
        status: "pending",
      },
    });
    const b = await getImageBackendStatus();
    return NextResponse.json({
      generation: gen,
      workerConfigured: b.workerConfigured,
      arkConfigured: b.arkConfigured,
      imageBackend: b.imageBackend,
    });
  } catch (e) {
    return toErrorResponse(e, "generations/POST");
  }
}
