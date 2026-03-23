/**
 * 火山方舟 OpenAI 兼容 — Responses API（多模态对话 / 文本模型）
 * @see https://www.volcengine.com/docs/82379/1399008
 */

export type ArkContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

export type ArkInputMessage = {
  role: "user";
  content: ArkContentPart[];
};

export async function arkResponsesCreate(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  input: ArkInputMessage[];
}): Promise<string> {
  const base = (params.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
  const res = await fetch(`${base}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input: params.input,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ark responses HTTP ${res.status}: ${text.slice(0, 1200)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Ark responses 非 JSON：${text.slice(0, 240)}`);
  }

  const extracted = extractResponsesOutputText(json);
  if (!extracted) {
    throw new Error(`Ark 响应中未解析到文本，原文片段：${text.slice(0, 400)}`);
  }
  return extracted;
}

/** 从 OpenAI Responses / 方舟变体里尽量抽出 assistant 文本 */
function extractResponsesOutputText(root: unknown): string | null {
  if (root == null) return null;
  if (typeof root === "string") return root.trim() ? root : null;

  if (typeof root === "object") {
    const o = root as Record<string, unknown>;

    if (typeof o.output_text === "string" && o.output_text.trim()) {
      return o.output_text;
    }

    const out = o.output;
    if (Array.isArray(out)) {
      const chunks: string[] = [];
      for (const item of out) {
        const t = walkOutputItem(item);
        if (t) chunks.push(t);
      }
      const joined = chunks.join("\n").trim();
      if (joined) return joined;
    }

    if (typeof o.text === "string" && o.text.trim()) return o.text;

    const choices = o.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
      const c0 = choices[0] as Record<string, unknown>;
      const msg = c0.message as Record<string, unknown> | undefined;
      if (msg && typeof msg.content === "string") return msg.content;
    }
  }

  return null;
}

function walkOutputItem(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === "string") return item.trim() || null;
  if (typeof item !== "object") return null;
  const o = item as Record<string, unknown>;

  if (typeof o.text === "string" && o.text.trim()) return o.text;

  const content = o.content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const c of content) {
      if (c && typeof c === "object") {
        const co = c as Record<string, unknown>;
        if (co.type === "output_text" && typeof co.text === "string") parts.push(co.text);
        else if (typeof co.text === "string") parts.push(co.text);
      }
    }
    const s = parts.join("").trim();
    if (s) return s;
  }

  return null;
}
