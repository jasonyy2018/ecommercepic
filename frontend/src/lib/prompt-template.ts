import type { PromptItem, PromptType } from "@/lib/types";

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

const DEFAULT_SCENES_BUSINESS = ["沿街店铺双开玻璃门门口", "公司门厅双开门", "企业前台入口", "高端商场店门口", "写字楼底商门口", "品牌门店玄关入口"];
const DEFAULT_SCENES_HOME = ["玄关", "入户门口"];

export type PromptGenerateBody = {
  productName?: string;
  category?: string;
  sellingPoints?: string[];
  targetAudience?: string;
  scenesBusiness?: string[];
  scenesHome?: string[];
  modelProfile?: string;
};

/** 本地规则模板（不调用外网模型） */
export function buildTemplatePrompts(body: PromptGenerateBody): PromptItem[] {
  const productName = body.productName?.trim() || "地毯";
  const category = body.category?.trim() || "地毯";
  const sellingPoints = (body.sellingPoints ?? []).filter(Boolean);
  const targetAudience = body.targetAudience?.trim() || "";
  const scenesBusiness = (body.scenesBusiness?.length ? body.scenesBusiness : DEFAULT_SCENES_BUSINESS).slice(0, 12);
  const scenesHome = (body.scenesHome?.length ? body.scenesHome : DEFAULT_SCENES_HOME).slice(0, 5);

  const sceneList = [...scenesBusiness.map((s) => ({ group: "商用", s })), ...scenesHome.map((s) => ({ group: "家用", s }))];
  const scenePrompts: PromptItem[] = [];
  const sceneCameraVariants = [
    "camera: ultra-wide 20mm, eye-level flat shot, natural perspective",
    "camera: ultra-wide 24mm, slight top-down angle, storefront-centered composition",
    "camera: 22mm, frontal wide shot, doorway symmetry and depth",
    "camera: 24mm, low-to-mid viewpoint, emphasize entrance floor area",
  ] as const;
  for (let i = 0; i < 17; i++) {
    const pick = sceneList[i % sceneList.length];
    const title = `${pick.group}场景｜${pick.s}`;
    const sell = sellingPoints.slice(0, 3).join("，");
    const camera = sceneCameraVariants[i % sceneCameraVariants.length];
    const base = [
      `${productName}，${category}`,
      `scene: ${pick.s}`,
      targetAudience ? `target audience: ${targetAudience}` : "",
      body.modelProfile ? `model: ${body.modelProfile}` : "",
      sell ? `key selling points: ${sell}` : "",
      "subject: custom commercial logo doormat placed at storefront double glass door entrance, mat edge tightly aligned to threshold",
      "layout: large mat coverage, balanced width-length ratio (not thin strip), clean tiled floor, high-end storefront with signage text and brand logo",
      "environment: bustling premium office-street retail block, plants on both sides of door, promotional standees near entrance",
      "lighting: daytime, natural sunlight with diagonal incidence, realistic indoor warm ambient lights, spacious and upscale interior visible",
      camera,
      "quality: 2K ultra clear, photorealistic, commercial advertising key visual for ecommerce paid ads",
      "strict edit: complete cutout from original background before compositing, preserve material/color/texture/fibers/logo exactly, no blur/no ghost shadow/no logo deformation",
      "business value focus: highlight brand recognition at entrance and premium marketing value of commercial ad doormat",
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
      ].join(", "),
    ),
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
        .join(", "),
    ),
  );

  return [...scenePrompts, ...detailPrompts, ...functionalPrompts];
}

/** 按序号取单条模板提示词（1–26），用于单条「重新生成」（模板模式） */
export function getTemplatePromptByIndex(body: PromptGenerateBody, index: number): PromptItem {
  if (!Number.isFinite(index) || index < 1 || index > 26) {
    throw new Error("index 须在 1–26");
  }
  const all = buildTemplatePrompts(body);
  const found = all.find((p) => p.index === index);
  if (!found) {
    throw new Error(`未找到第 ${index} 条模板提示词`);
  }
  return {
    ...found,
    id: `prompt_${index}_${Date.now().toString(16)}`,
  };
}
