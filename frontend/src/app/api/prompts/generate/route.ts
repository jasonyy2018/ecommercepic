import { NextResponse } from "next/server";
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
        const prompts = buildTemplatePrompts(body);
        return NextResponse.json({
          prompts,
          promptSource: "template" as const,
          warning:
            "当前文案来源为「火山方舟」，但未检测到 API Key（ARK_API_KEY 或系统设置中文本/生图 Key）。已自动使用本地模板生成 26 条；配置 Key 后可改为方舟生成。",
        });
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
