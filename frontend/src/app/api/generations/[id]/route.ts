import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, DB_SETUP_MESSAGE } from "@/lib/db-error";
import { isWorkerConfigured } from "@/lib/cloudflare-worker";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json<ApiError>({ error: "missing id" }, { status: 400 });
  try {
    const gen = await prisma.generation.findUnique({ where: { id } });
    if (!gen) return NextResponse.json<ApiError>({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      generation: gen,
      workerConfigured: isWorkerConfigured(),
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}
