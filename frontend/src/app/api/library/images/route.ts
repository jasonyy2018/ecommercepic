import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toErrorResponse } from "@/lib/api-handle-error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const type = (searchParams.get("type") ?? "ALL").toUpperCase();
    const limit = Math.min(Number(searchParams.get("limit") ?? 60), 120);

    const [uploads, generated] = await Promise.all([
      prisma.uploadedImage.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { task: { select: { id: true, name: true, productName: true } } },
      }),
      prisma.generatedImage.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { task: { select: { id: true, name: true, productName: true } } },
      }),
    ]);

    const rows = [
      ...uploads.map((u: (typeof uploads)[number]) => ({
        id: `upload_${u.id}`,
        kind: "UPLOAD",
        type: u.type,
        url: u.url,
        material: u.material ?? "",
        taskId: u.taskId,
        taskName: u.task.name,
        productName: u.task.productName,
        createdAt: u.createdAt.toISOString(),
      })),
      ...generated.map((g: (typeof generated)[number]) => ({
        id: `generated_${g.id}`,
        kind: "GENERATED",
        type: g.aspectRatio,
        url: g.url,
        material: "",
        taskId: g.taskId,
        taskName: g.task.name,
        productName: g.task.productName,
        createdAt: g.createdAt.toISOString(),
      })),
    ]
      .filter((r) => (type === "ALL" ? true : r.kind === type))
      .filter((r) => {
        if (!q) return true;
        return `${r.taskName} ${r.productName} ${r.type} ${r.material}`.toLowerCase().includes(q);
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, limit);

    return NextResponse.json({ items: rows });
  } catch (e) {
    return toErrorResponse(e, "library/images");
  }
}

