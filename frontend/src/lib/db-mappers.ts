import type { GenerateTask, ProductDraft, PromptItem, GeneratedImage, AspectRatio, PromptType, ProductImage } from "@/lib/types";
import type { Task, Prompt, UploadedImage as DbUploadedImage, GeneratedImage as DbGeneratedImage } from "@prisma/client";

function parseJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function taskToApi(task: Task & { prompts: Prompt[]; uploads: DbUploadedImage[]; images: DbGeneratedImage[] }): GenerateTask {
  const product: ProductDraft = {
    id: task.id,
    name: task.productName,
    category: task.category ?? undefined,
    sellingPoints: parseJson<string[]>(task.sellingPoints, []),
    targetAudience: task.targetAudience ?? "",
    scenesBusiness: parseJson<string[]>(task.scenesBusiness, []),
    scenesHome: parseJson<string[]>(task.scenesHome, []),
    modelProfile: task.modelProfile ?? "",
    aspectRatios: parseJson<AspectRatio[]>(task.aspectRatios, ["1:1"]),
    images: task.uploads.map((u) => ({
      id: u.id,
      url: u.url,
      type: (u.type as any) ?? "DISPLAY",
      material: u.material ?? undefined,
    })) satisfies ProductImage[],
  };

  const prompts: PromptItem[] = task.prompts
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((p) => ({
      id: p.id,
      index: p.index,
      type: p.type as PromptType,
      title: p.title,
      text: p.text,
      status: (p.status as any) ?? "READY",
    }));

  const images: GeneratedImage[] = task.images
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((img) => ({
      id: img.id,
      promptId: img.promptId ?? "",
      url: img.url,
      aspectRatio: img.aspectRatio as AspectRatio,
      createdAt: img.createdAt.toISOString(),
    }));

  return {
    id: task.id,
    name: task.name,
    status: task.status as any,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    product,
    prompts,
    images,
    finishedCount: task.finishedCount,
    totalCount: task.totalCount,
  };
}

