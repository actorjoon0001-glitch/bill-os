import { PrismaClient } from "@prisma/client";

// 개발 중 핫 리로드로 PrismaClient 가 여러 개 생성되는 것을 방지하는 싱글턴 패턴
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
