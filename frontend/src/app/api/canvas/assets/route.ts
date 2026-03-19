import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DB_SETUP_MESSAGE, isPrismaConnectionError } from "@/lib/db-error";
import type { ApiError } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    const uploads = await prisma.uploadedImage.findMany({
      where: taskId ? { taskId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { task: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      items: uploads.map((u) => ({
        id: u.id,
        taskId: u.taskId,
        taskName: u.task.name,
        url: u.url,
        type: u.type,
        material: u.material ?? "",
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
    }
    throw e;
  }
}

