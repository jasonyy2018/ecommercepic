import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, DB_SETUP_MESSAGE } from "@/lib/db-error";
import { isWorkerConfigured } from "@/lib/cloudflare-worker";
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
    return NextResponse.json({
      generation: gen,
      workerConfigured: isWorkerConfigured(),
      devPlaceholder: !isWorkerConfigured(),
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}
