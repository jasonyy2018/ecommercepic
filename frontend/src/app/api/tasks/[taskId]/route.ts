import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { taskToApi } from "@/lib/db-mappers";
import { toErrorResponse } from "@/lib/api-handle-error";

export async function GET(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { prompts: true, uploads: true, images: true },
    });
    if (!task) return NextResponse.json<ApiError>({ error: "task not found" }, { status: 404 });
    return NextResponse.json({ task: taskToApi(task) });
  } catch (e) {
    return toErrorResponse(e, "tasks/[taskId]/GET");
  }
}

