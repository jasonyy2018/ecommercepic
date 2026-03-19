import { PrismaClient } from "@prisma/client";

const GLOBAL_KEY = "__PRISMA_CLIENT__";

function getGlobal(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>;
}

export const prisma: PrismaClient =
  (getGlobal()[GLOBAL_KEY] as PrismaClient | undefined) ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  getGlobal()[GLOBAL_KEY] = prisma;
}

