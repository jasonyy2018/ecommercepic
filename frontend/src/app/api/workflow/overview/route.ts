import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiError } from "@/lib/types";
import { DB_SETUP_MESSAGE, isPrismaConnectionError } from "@/lib/db-error";

export async function GET() {
  try {
    const [allCount, runningCount, doneCount, failedCount, latest] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: "RUNNING" } }),
      prisma.task.count({ where: { status: "DONE" } }),
      prisma.task.count({ where: { status: "FAILED" } }),
      prisma.task.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        include: { prompts: { take: 1, orderBy: { index: "asc" } } },
      }),
    ]);

    const successRate = allCount > 0 ? ((doneCount / allCount) * 100).toFixed(1) : "0.0";
    const avgProgress =
      latest.length > 0
        ? Math.round(
            latest.reduce((acc, t) => acc + (t.totalCount > 0 ? t.finishedCount / t.totalCount : 0), 0) /
              latest.length *
              100
          )
        : 0;

    const queue = latest.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      finishedCount: t.finishedCount,
      totalCount: t.totalCount,
      updatedAt: t.updatedAt.toISOString(),
    }));

    const timeline = latest.slice(0, 5).map((t) => ({
      at: t.updatedAt.toISOString(),
      text: `${t.name}｜${t.status}｜${t.finishedCount}/${t.totalCount}`,
    }));

    return NextResponse.json({
      metrics: {
        todayTasks: allCount,
        running: runningCount,
        failed: failedCount,
        successRate,
        avgProgress,
      },
      queue,
      timeline,
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

