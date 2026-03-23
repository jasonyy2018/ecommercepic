import { NextResponse } from "next/server";
import type { ApiError, PromptType } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-handle-error";
import type { PromptGenerateBody } from "@/lib/prompt-template";
import { getTemplatePromptByIndex } from "@/lib/prompt-template";
import { regenerateOnePromptWithArk } from "@/lib/prompt-llm-ark";
import { resolveTextLlmConfig } from "@/lib/text-llm-provider";

export const runtime = "nodejs";
export const maxDuration = 120;

function normalizeType(s: string): PromptType | null {
  const u = s.toUpperCase();
  if (u === "SCENE" || u === "DETAIL" || u === "FUNCTIONAL") return u;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PromptGenerateBody & {
      referenceImageUrl?: string;
      prompt?: {
        index?: number;
        type?: string;
        title?: string;
        text?: string;
      };
    };

    const index = Number(body.prompt?.index);
    const type = normalizeType(String(body.prompt?.type ?? ""));
    const title = String(body.prompt?.title ?? "").trim();
    const text = String(body.prompt?.text ?? "").trim();

    if (!Number.isFinite(index) || index < 1 || index > 26) {
      return NextResponse.json<ApiError>({ error: "prompt.index 须为 1–26" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json<ApiError>({ error: "prompt.type 须为 SCENE / DETAIL / FUNCTIONAL" }, { status: 400 });
    }

    const productBody: PromptGenerateBody = {
      productName: body.productName,
      category: body.category,
      sellingPoints: body.sellingPoints,
      targetAudience: body.targetAudience,
      scenesBusiness: body.scenesBusiness,
      scenesHome: body.scenesHome,
      modelProfile: body.modelProfile,
    };

    const cfg = await resolveTextLlmConfig();

    if (cfg.provider === "ark") {
      if (!cfg.apiKey) {
        return NextResponse.json<ApiError>(
          {
            error:
              "当前使用火山方舟：请配置 ARK_API_KEY，或在设置页填写文本/生图 API Key 任其一",
          },
          { status: 400 },
        );
      }

      const ref =
        typeof body.referenceImageUrl === "string" && body.referenceImageUrl.trim()
          ? body.referenceImageUrl.trim()
          : undefined;

      const next = await regenerateOnePromptWithArk({
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        body: productBody,
        prompt: { index, type, title: title || "（空）", text: text || "（空）" },
        referenceImageUrl: ref,
      });

      return NextResponse.json({
        title: next.title,
        text: next.text,
        promptSource: "ark" as const,
        textModel: cfg.model,
      });
    }

    const tpl = getTemplatePromptByIndex(productBody, index);
    return NextResponse.json({
      title: tpl.title,
      text: tpl.text,
      promptSource: "template" as const,
    });
  } catch (e) {
    return toErrorResponse(e, "prompts/regenerate-one");
  }
}
