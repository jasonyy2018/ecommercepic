/**
 * 避免对空响应或非 JSON（如 HTML 错误页）调用 res.json() 导致
 * "Unexpected end of JSON input" / "Unexpected token '<'"。
 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`服务器返回空响应（HTTP ${res.status}）`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const hint = trimmed.startsWith("<") ? "（可能是 HTML 错误页）" : "";
    throw new Error(
      `响应不是合法 JSON${hint}，HTTP ${res.status}：${trimmed.slice(0, 160)}${trimmed.length > 160 ? "…" : ""}`,
    );
  }
}

/** 把浏览器里难懂的 JSON 报错转成可读文案 */
export function formatClientError(e: unknown): string {
  if (!(e instanceof Error)) return "操作失败";
  const m = e.message;
  if (m.includes("Unexpected end of JSON input") || m.includes("JSON.parse")) {
    return "接口返回了空内容或非 JSON（请检查网络、Next 是否重启、数据库是否可用）";
  }
  return m;
}
