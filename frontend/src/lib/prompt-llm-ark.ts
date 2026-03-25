import type { PromptItem, PromptType } from "@/lib/types";
import { arkResponsesCreate, type ArkContentPart, type ArkInputMessage } from "@/lib/ark-responses";
import type { PromptGenerateBody } from "@/lib/prompt-template";

const JSON_INSTRUCTION = `你是电商视觉策划。根据用户给出的商品信息，生成恰好 26 条用于 AI 生图的提示词。

硬性要求：
1) 仅输出一个 JSON 对象，不要 markdown 代码块，不要其它说明文字。
2) JSON 格式严格为：{"prompts":[{"index":1,"type":"SCENE","title":"中文短标题","text":"英文提示词，逗号分隔关键词..."}, ...]}
3) 恰好 26 条：index 从 1 到 26；其中 type 为 "SCENE" 的 17 条、"DETAIL" 的 5 条、"FUNCTIONAL" 的 3 条，顺序随意但类型数量必须正确。
4) title 用中文；text 用英文，适合产品/场景商业摄影，可包含构图、光线、镜头、材质等。
5) 内容需贴合用户商品品类与卖点，避免无关品类描述（若用户不是地毯，不要强行写地毯）。
6) 若商品为商用地毯/门垫/广告地垫：SCENE 类英文 text 须包含抠图保真（preserve exact logo/color/texture）、双开玻璃门店入口、大面积地垫（非细长条）、自然日光与广角镜头、商用品牌识别价值等关键词；避免在毯面纹理上生成糊影或脏阴影的描述冲突。`;

function normalizePromptType(s: string): PromptType | null {
  const u = s.toUpperCase();
  if (u === "SCENE" || u === "DETAIL" || u === "FUNCTIONAL") return u;
  return null;
}

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();
  return t;
}

function parseLlmPromptsJson(raw: string): PromptItem[] {
  const t = stripJsonFence(raw);
  const parsed = JSON.parse(t) as { prompts?: unknown };
  if (!parsed || !Array.isArray(parsed.prompts)) {
    throw new Error("模型返回 JSON 缺少 prompts 数组");
  }

  const rows = parsed.prompts as Array<Record<string, unknown>>;
  if (rows.length !== 26) {
    throw new Error(`模型应返回 26 条提示词，实际 ${rows.length} 条`);
  }

  const count = { SCENE: 0, DETAIL: 0, FUNCTIONAL: 0 };
  const out: PromptItem[] = [];
  const seenIndex = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const index = Number(r.index);
    const type = normalizePromptType(String(r.type ?? ""));
    const title = String(r.title ?? "").trim();
    const text = String(r.text ?? "").trim();
    if (!Number.isFinite(index) || index < 1 || index > 26) {
      throw new Error(`非法 index: ${String(r.index)}`);
    }
    if (!type) throw new Error(`非法 type: ${String(r.type)}`);
    if (!title || !text) throw new Error(`第 ${i + 1} 条缺少 title 或 text`);
    if (seenIndex.has(index)) throw new Error(`重复的 index: ${index}`);
    seenIndex.add(index);

    count[type] += 1;
    out.push({
      id: `prompt_${index}_${Date.now().toString(16)}_${i}`,
      index,
      type,
      title,
      text,
      status: "READY",
    });
  }

  if (count.SCENE !== 17 || count.DETAIL !== 5 || count.FUNCTIONAL !== 3) {
    throw new Error(
      `类型数量不符：SCENE=${count.SCENE}（需17） DETAIL=${count.DETAIL}（需5） FUNCTIONAL=${count.FUNCTIONAL}（需3）`,
    );
  }

  out.sort((a, b) => a.index - b.index);
  return out;
}

function buildUserBrief(body: PromptGenerateBody): string {
  const productName = body.productName?.trim() || "商品";
  const category = body.category?.trim() || "";
  const sellingPoints = (body.sellingPoints ?? []).filter(Boolean).join("；");
  const targetAudience = body.targetAudience?.trim() || "";
  const scenesBusiness = (body.scenesBusiness ?? []).filter(Boolean).join("、");
  const scenesHome = (body.scenesHome ?? []).filter(Boolean).join("、");
  const modelProfile = body.modelProfile?.trim() || "";

  return [
    `商品名称：${productName}`,
    category ? `品类：${category}` : "",
    sellingPoints ? `卖点：${sellingPoints}` : "",
    targetAudience ? `目标人群：${targetAudience}` : "",
    scenesBusiness ? `希望覆盖的商用场景：${scenesBusiness}` : "",
    scenesHome ? `希望覆盖的家用场景：${scenesHome}` : "",
    modelProfile ? `模特/展示偏好：${modelProfile}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 使用方舟 Responses 生成 26 条提示词（纯文本）。
 * @param referenceImageUrl 可选，公网 HTTPS 图链（本地 /api/files 不可用）
 */
export async function generatePromptsWithArk(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  body: PromptGenerateBody;
  referenceImageUrl?: string;
}): Promise<PromptItem[]> {
  const userText = `${JSON_INSTRUCTION}\n\n----\n用户商品信息：\n${buildUserBrief(params.body)}`;

  const content: ArkContentPart[] = [{ type: "input_text", text: userText }];
  const ref = params.referenceImageUrl?.trim();
  if (ref && (ref.startsWith("https://") || ref.startsWith("http://"))) {
    content.unshift({ type: "input_image", image_url: ref });
  }

  const input: ArkInputMessage[] = [{ role: "user", content }];

  const raw = await arkResponsesCreate({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    input,
  });

  return parseLlmPromptsJson(raw);
}

const ONE_PROMPT_INSTRUCTION = `你是电商视觉策划。用户需要你为「整套提示词中的其中一条」重新写一版。

硬性要求：
1) 仅输出一个 JSON 对象，不要 markdown 代码块，不要其它说明文字。
2) 格式严格为：{"title":"中文短标题","text":"英文提示词，逗号分隔关键词..."}
3) title 用中文；text 用英文，适合产品/场景商业摄影。
4) 必须贴合用户给出的商品信息与本条类型（SCENE / DETAIL / FUNCTIONAL），不要编造与商品无关的品类。`;

function parseTitleTextJson(raw: string): { title: string; text: string } {
  const t = stripJsonFence(raw);
  const parsed = JSON.parse(t) as Record<string, unknown>;
  const title = String(parsed.title ?? "").trim();
  const text = String(parsed.text ?? "").trim();
  if (!title || !text) {
    throw new Error("模型应返回 JSON：{ \"title\", \"text\" }");
  }
  return { title, text };
}

/** 单条重新生成（方舟） */
export async function regenerateOnePromptWithArk(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  body: PromptGenerateBody;
  prompt: { index: number; type: PromptType; title: string; text: string };
  referenceImageUrl?: string;
}): Promise<{ title: string; text: string }> {
  const { prompt, body } = params;
  const userText = [
    ONE_PROMPT_INSTRUCTION,
    "",
    "----",
    `本条在整套中的序号：${prompt.index}；类型：${prompt.type}（SCENE=场景主图，DETAIL=细节特写，FUNCTIONAL=功能展示）。`,
    `当前版本（可参考也可完全重写）：`,
    `标题：${prompt.title}`,
    `正文：${prompt.text}`,
    "",
    "商品信息：",
    buildUserBrief(body),
  ].join("\n");

  const content: ArkContentPart[] = [{ type: "input_text", text: userText }];
  const ref = params.referenceImageUrl?.trim();
  if (ref && (ref.startsWith("https://") || ref.startsWith("http://"))) {
    content.unshift({ type: "input_image", image_url: ref });
  }

  const input: ArkInputMessage[] = [{ role: "user", content }];

  const raw = await arkResponsesCreate({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    input,
  });

  return parseTitleTextJson(raw);
}
