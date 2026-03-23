import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-handle-error";
import { getImageBackendStatus } from "@/lib/image-generation-backend";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json<ApiError>({ error: "missing id" }, { status: 400 });
  try {
    const gen = await prisma.generation.findUnique({ where: { id } });
    if (!gen) return NextResponse.json<ApiError>({ error: "not found" }, { status: 404 });
    const b = getImageBackendStatus();
    return NextResponse.json({
      generation: gen,
      workerConfigured: b.workerConfigured,
      arkConfigured: b.arkConfigured,
      imageBackend: b.imageBackend,
    });
  } catch (e) {
    return toErrorResponse(e, "generations/[id]/GET");
  }
}
