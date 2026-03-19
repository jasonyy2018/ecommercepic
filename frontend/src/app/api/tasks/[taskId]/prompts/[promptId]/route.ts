import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { isPrismaConnectionError, DB_SETUP_MESSAGE } from "@/lib/db-error";

export async function PATCH(req: Request, ctx: { params: Promise<{ taskId: string; promptId: string }> }) {
  const { taskId, promptId } = await ctx.params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>({ error: "invalid json" }, { status: 400 });
  }
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });
    if (!task) return NextResponse.json<ApiError>({ error: "task not found" }, { status: 404 });

    const existing = await prisma.prompt.findFirst({ where: { id: promptId, taskId } });
    if (!existing) return NextResponse.json<ApiError>({ error: "prompt not found" }, { status: 404 });

    const updated = await prisma.prompt.update({
      where: { id: promptId },
      data: {
        text: typeof body?.text === "string" ? body.text : undefined,
        title: typeof body?.title === "string" ? body.title : undefined,
      },
    });

    return NextResponse.json({ prompt: updated });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

