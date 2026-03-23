import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-handle-error";
import { getImageBackendStatus } from "@/lib/image-generation-backend";
import { runGeneration } from "@/lib/generation-runner";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json<ApiError>({ error: "missing id" }, { status: 400 });

  try {
    const exists = await prisma.generation.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json<ApiError>({ error: "not found" }, { status: 404 });

    const gen = await runGeneration(id);
    const b = await getImageBackendStatus();
    return NextResponse.json({
      generation: gen,
      workerConfigured: b.workerConfigured,
      arkConfigured: b.arkConfigured,
      imageBackend: b.imageBackend,
      devPlaceholder: b.imageBackend === "placeholder",
    });
  } catch (e) {
    return toErrorResponse(e, "generations/[id]/run");
  }
}
