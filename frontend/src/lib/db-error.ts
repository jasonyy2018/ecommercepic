/**
 * 判断是否为 Prisma 数据库连接/配置错误，便于返回 503 提示用户配置 .env 和迁移。
 */
export function isPrismaConnectionError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const msg = String((e as Error).message ?? "");
  const code = (e as { code?: string }).code ?? "";
  return (
    msg.includes("DATABASE_URL") ||
    msg.includes("Can't reach") ||
    msg.includes("Connection refused") ||
    msg.includes("connect ECONNREFUSED") ||
    code === "P1001" ||
    code === "P1017" ||
    code === "P2024"
  );
}

export const DB_SETUP_MESSAGE =
  "数据库未配置或无法连接。请在项目根目录创建 .env，设置 DATABASE_URL，并执行：npm run db:migrate -- --name init";
