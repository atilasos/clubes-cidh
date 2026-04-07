import { PrismaClient } from "@prisma/client";

declare global {
  var __clubesPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__clubesPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__clubesPrisma = prisma;
}
