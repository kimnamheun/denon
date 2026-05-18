import { PrismaClient } from "@prisma/client";

// Vercel Serverless 환경에서 hot-reload / function 재호출 시
// PrismaClient 인스턴스 폭증 방지 (globalThis 캐싱 패턴)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
