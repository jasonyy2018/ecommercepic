import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-handle-error";
import { buildTemplatePrompts, type PromptGenerateBody } from "@/lib/prompt-template";
import { generatePromptsWithArk } from "@/lib/prompt-llm-ark";
import { resolveTextLlmConfig } from "@/lib/text-llm-provider";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PromptGenerateBody & {
      referenceImageUrl?: string;
    };

    const cfg = await resolveTextLlmConfig();

    if (cfg.provider === "ark") {
      if (!cfg.apiKey) {
        return NextResponse.json<ApiError>(
          {
            error:
              "当前使用火山方舟生成提示词：请配置环境变量 ARK_API_KEY，或在「系统设置」中填写文本 API Key（模型供应商）",
          },
          { status: 400 },
        );
      }

      const prompts = await generatePromptsWithArk({
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
        body,
        referenceImageUrl: typeof body.referenceImageUrl === "string" ? body.referenceImageUrl : undefined,
      });

      return NextResponse.json({
        prompts,
        promptSource: "ark" as const,
        textModel: cfg.model,
      });
    }

    const prompts = buildTemplatePrompts(body);
    return NextResponse.json({
      prompts,
      promptSource: "template" as const,
    });
  } catch (e) {
    return toErrorResponse(e, "prompts/generate");
  }
}
