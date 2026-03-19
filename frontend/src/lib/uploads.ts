import path from "node:path";
import fs from "node:fs/promises";

/** Docker / 生产环境可通过 UPLOAD_DIR 挂载卷持久化上传文件 */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR?.trim()
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), ".data", "uploads");

export function safeExtFromMime(mime: string): "png" | "jpg" | "jpeg" | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export function makeUploadRelPath(parts: string[]) {
  return parts.join("/").replaceAll("\\", "/");
}

export function makePublicFileUrl(relPath: string) {
  // served by /api/files/[...path]
  return `/api/files/${encodeURI(relPath)}`;
}

export async function writeFileAtomic(absPath: string, data: Uint8Array) {
  const dir = path.dirname(absPath);
  await ensureDir(dir);
  const tmp = `${absPath}.tmp_${Date.now().toString(16)}`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, absPath);
}

