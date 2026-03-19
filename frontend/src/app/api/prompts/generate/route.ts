import { NextResponse } from "next/server";
import type { ApiError, PromptItem, PromptType } from "@/lib/types";

function makePrompt(i: number, type: PromptType, title: string, text: string): PromptItem {
  return {
    id: `prompt_${i}_${Date.now().toString(16)}`,
    index: i,
    type,
    title,
    text,
    status: "READY",
  };
}

const DEFAULT_SCENES_BUSINESS = ["户外商铺门口", "公司门口", "企业前台", "电梯间", "室内门口", "玄关口"];
const DEFAULT_SCENES_HOME = ["玄关", "入户门口"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      productName?: string;
      category?: string;
      sellingPoints?: string[];
      targetAudience?: string;
      scenesBusiness?: string[];
      scenesHome?: string[];
      modelProfile?: string;
    };

    const productName = body.productName?.trim() || "地毯";
    const category = body.category?.trim() || "地毯";
    const sellingPoints = (body.sellingPoints ?? []).filter(Boolean);
    const targetAudience = body.targetAudience?.trim() || "";
    const scenesBusiness = (body.scenesBusiness?.length ? body.scenesBusiness : DEFAULT_SCENES_BUSINESS).slice(0, 12);
    const scenesHome = (body.scenesHome?.length ? body.scenesHome : DEFAULT_SCENES_HOME).slice(0, 5);

    const sceneList = [...scenesBusiness.map((s) => ({ group: "商用", s })), ...scenesHome.map((s) => ({ group: "家用", s }))];
    const scenePrompts: PromptItem[] = [];
    for (let i = 0; i < 17; i++) {
      const pick = sceneList[i % sceneList.length];
      const title = `${pick.group}场景｜${pick.s}`;
      const sell = sellingPoints.slice(0, 3).join("，");
      const base = [
        `${productName}，${category}`,
        `scene: ${pick.s}`,
        targetAudience ? `target audience: ${targetAudience}` : "",
        body.modelProfile ? `model: ${body.modelProfile}` : "",
        sell ? `key selling points: ${sell}` : "",
        "composition: wide shot to medium shot, clean environment",
        "lighting: soft natural light, realistic shadows",
        "camera: 35mm, f/2.8, shallow depth of field",
        "keep carpet material and color consistent, logo sharp and accurate",
        "high detail, commercial product photography",
      ]
        .filter(Boolean)
        .join(", ");
      scenePrompts.push(makePrompt(i + 1, "SCENE", title, base));
    }

    const detailTitles = ["材质细节｜绒毛纹理", "工艺细节｜包边/锁边", "背面细节｜防滑底纹", "LOGO 细节｜边缘清晰", "质感细节｜色泽一致"];
    const detailPrompts = detailTitles.map((t, idx) =>
      makePrompt(
        18 + idx,
        "DETAIL",
        t,
        [
          `${productName} macro detail`,
          "extreme close-up, texture and craftsmanship",
          "lighting: side light, soft box feel",
          "camera: 85mm macro, f/4",
          "keep material/color consistent with reference",
          "commercial product detail photography, ultra sharp",
        ].join(", ")
      )
    );

    const functionalTitles = ["功能展示｜吸水效果", "功能展示｜防滑安全", "功能展示｜易清洗/易打理"];
    const functionalPrompts = functionalTitles.map((t, idx) =>
      makePrompt(
        23 + idx,
        "FUNCTIONAL",
        t,
        [
          `${productName} functional demonstration`,
          t.includes("吸水") ? "water absorption, before and after" : "",
          t.includes("防滑") ? "non-slip demonstration on floor" : "",
          t.includes("清洗") ? "easy cleaning demonstration, rinse and dry" : "",
          "clean background, product centered, realistic",
          "high detail, ecommerce friendly",
        ]
          .filter(Boolean)
          .join(", ")
      )
    );

    const prompts = [...scenePrompts, ...detailPrompts, ...functionalPrompts];
    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json<ApiError>({ error: "invalid json" }, { status: 400 });
  }
}

