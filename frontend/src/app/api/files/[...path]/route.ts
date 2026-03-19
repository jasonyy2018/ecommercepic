import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import type { ApiError } from "@/lib/types";
import { UPLOAD_ROOT } from "@/lib/uploads";

export const runtime = "nodejs";

function contentTypeFromExt(ext: string) {
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  if (!Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json<ApiError>({ error: "missing path" }, { status: 400 });
  }

  // Prevent path traversal by resolving under UPLOAD_ROOT.
  const rel = parts.join("/").replaceAll("\\", "/");
  const abs = path.resolve(path.join(UPLOAD_ROOT, rel));
  const root = path.resolve(UPLOAD_ROOT);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return NextResponse.json<ApiError>({ error: "invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    return new NextResponse(data, {
      headers: {
        "content-type": contentTypeFromExt(ext),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json<ApiError>({ error: "not found" }, { status: 404 });
  }
}

