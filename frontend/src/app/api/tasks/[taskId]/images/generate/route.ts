import { NextResponse } from "next/server";
import type { ApiError, AspectRatio } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { taskToApi } from "@/lib/db-mappers";
import { isPrismaConnectionError, DB_SETUP_MESSAGE } from "@/lib/db-error";

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

const PLACEHOLDER_IMAGES = [
  "/images/generated-1773306166927.png",
];

export async function POST(_req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  try {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { prompts: true, uploads: true, images: true },
  });
  if (!task) return NextResponse.json<ApiError>({ error: "task not found" }, { status: 404 });

  await prisma.task.update({ where: { id: taskId }, data: { status: "RUNNING" } });

  // Simulate generation: create 1 image per prompt per selected aspect ratio (capped for demo).
  const ratios = (() => {
    try {
      const parsed = JSON.parse(task.aspectRatios ?? "[]");
      return (Array.isArray(parsed) && parsed.length ? parsed : ["1:1"]) as AspectRatio[];
    } catch {
      return ["1:1"] as AspectRatio[];
    }
  })();
  const maxImages = 12;
  const alreadyCount = task.images.length;
  const created: any[] = [];

  let finishedCount = task.finishedCount;
  for (let i = 0; i < task.prompts.length && alreadyCount + created.length < maxImages; i++) {
    const p = task.prompts[i];
    for (let r = 0; r < ratios.length && alreadyCount + created.length < maxImages; r++) {
      created.push({
        taskId,
        promptId: p.id,
        url: pick(PLACEHOLDER_IMAGES, alreadyCount + created.length),
        aspectRatio: ratios[r],
      });
      finishedCount = Math.min(task.totalCount, finishedCount + 1);
    }
  }

  if (created.length) {
    await prisma.generatedImage.createMany({ data: created });
  }

  const status = finishedCount >= task.totalCount ? "DONE" : "RUNNING";
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { finishedCount, status },
    include: { prompts: true, uploads: true, images: true },
  });

  return NextResponse.json({ createdCount: created.length, task: taskToApi(updatedTask) });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

