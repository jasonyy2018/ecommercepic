import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { taskToApi } from "@/lib/db-mappers";
import { toErrorResponse } from "@/lib/api-handle-error";

export async function GET() {
  try {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });
  const items = tasks.map((t: (typeof tasks)[number]) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    finishedCount: t.finishedCount,
    totalCount: t.totalCount,
    productName: t.productName,
    aspectRatios: (() => {
      try {
        return JSON.parse(t.aspectRatios ?? "[]");
      } catch {
        return [];
      }
    })(),
  }));
  return NextResponse.json({ items });
  } catch (e) {
    return toErrorResponse(e, "tasks/GET");
  }
}

export async function POST(req: Request) {
  let body: {
    mode?: "draft" | "finalize";
    taskId?: string;
    name?: string;
    product?: {
      name?: string;
      category?: string;
      sellingPoints?: string[];
      targetAudience?: string;
      scenesBusiness?: string[];
      scenesHome?: string[];
      modelProfile?: string;
      aspectRatios?: string[];
    };
    prompts?: { type: any; title: any; text: any }[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json<ApiError>({ error: "invalid json" }, { status: 400 });
  }

  try {
    // 1) Draft task: return taskId for uploads (directory = taskId)
    if (body.mode === "draft") {
      const productName = body.product?.name?.trim() || "未命名地毯";
      const created = await prisma.task.create({
        data: {
          name: `${productName}｜草稿`,
          status: "DRAFT",
          productName,
          category: body.product?.category ?? null,
          sellingPoints: JSON.stringify(body.product?.sellingPoints ?? []),
          targetAudience: body.product?.targetAudience ?? null,
          scenesBusiness: JSON.stringify(body.product?.scenesBusiness ?? []),
          scenesHome: JSON.stringify(body.product?.scenesHome ?? []),
          modelProfile: body.product?.modelProfile ?? null,
          aspectRatios: JSON.stringify(body.product?.aspectRatios ?? ["1:1"]),
          totalCount: 25,
          finishedCount: 0,
        },
      });
      return NextResponse.json({ task: taskToApi({ ...created, prompts: [], uploads: [], images: [] } as any) });
    }

    // 2) Finalize: write product + prompts into existing draft task
    if (!body?.taskId) return NextResponse.json<ApiError>({ error: "taskId is required" }, { status: 400 });
    if (!body?.name) return NextResponse.json<ApiError>({ error: "name is required" }, { status: 400 });

    const prompts = Array.isArray(body.prompts) ? body.prompts : [];
    const totalCount = prompts.length ? prompts.length : 25;

    await prisma.prompt.deleteMany({ where: { taskId: body.taskId } });
    if (prompts.length) {
      await prisma.prompt.createMany({
        data: prompts.map((p, idx) => ({
          taskId: body.taskId!,
          index: idx + 1,
          type: String(p.type ?? "SCENE"),
          title: String(p.title ?? `Prompt ${idx + 1}`),
          text: String(p.text ?? ""),
          status: "READY",
        })),
      });
    }

    const updated = await prisma.task.update({
      where: { id: body.taskId },
      data: {
        name: body.name,
        status: "PENDING",
        productName: body.product?.name?.trim() || "未命名地毯",
        category: body.product?.category ?? null,
        sellingPoints: JSON.stringify(body.product?.sellingPoints ?? []),
        targetAudience: body.product?.targetAudience ?? null,
        scenesBusiness: JSON.stringify(body.product?.scenesBusiness ?? []),
        scenesHome: JSON.stringify(body.product?.scenesHome ?? []),
        modelProfile: body.product?.modelProfile ?? null,
        aspectRatios: JSON.stringify(body.product?.aspectRatios ?? ["1:1"]),
        totalCount,
        finishedCount: 0,
      },
      include: { prompts: true, uploads: true, images: true },
    });

    return NextResponse.json({ task: taskToApi(updated) });
  } catch (e) {
    return toErrorResponse(e, "tasks/POST");
  }
}

