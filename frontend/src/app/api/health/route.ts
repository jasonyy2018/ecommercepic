import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkDb = process.env.HEALTHCHECK_DB === "1";

  if (!checkDb) {
    return NextResponse.json({
      ok: true,
      service: "app",
      mode: "lite",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      service: "app",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: "app",
        db: "error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

