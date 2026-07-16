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

// DB 미연결/조회 실패 시에도 화면이 열리도록, 실패하면 fallback 을 돌려준다.
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    console.error("[DB] query failed, returning fallback:", e);
    return fallback;
  }
}

// DB 연결 가능 여부 확인 (배너 표시용)
export async function isDbReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
