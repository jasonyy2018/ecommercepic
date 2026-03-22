import { NextResponse } from "next/server";
import type { ApiError } from "@/lib/types";
import { isPrismaConnectionError, DB_SETUP_MESSAGE } from "@/lib/db-error";

/**
 * 将未捕获异常转为 JSON，避免 Next 返回空 body/HTML，前端出现「服务器返回空响应 (HTTP 500)」。
 */
export function toErrorResponse(e: unknown, logLabel?: string): NextResponse<ApiError> {
  if (logLabel) console.error(`[api ${logLabel}]`, e);
  if (isPrismaConnectionError(e)) {
    return NextResponse.json<ApiError>({ error: DB_SETUP_MESSAGE }, { status: 503 });
  }
  const message = e instanceof Error ? e.message : String(e);
  const text = (message || "服务器内部错误").slice(0, 800);
  return NextResponse.json<ApiError>({ error: text }, { status: 500 });
}
