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
