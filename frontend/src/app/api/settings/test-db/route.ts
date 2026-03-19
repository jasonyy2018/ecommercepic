import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DB_SETUP_MESSAGE, isPrismaConnectionError } from "@/lib/db-error";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, message: "数据库连接正常" });
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return NextResponse.json({ ok: false, message: DB_SETUP_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ ok: false, message: "数据库连接测试失败" }, { status: 500 });
  }
}

