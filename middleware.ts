import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_TOKEN } from "@/lib/auth";

// 로그인 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = token === SESSION_TOKEN;

  if (authed) return NextResponse.next();

  // API 요청은 401, 페이지 요청은 로그인으로 리다이렉트
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 정적 자원과 이미지 최적화 경로를 제외한 모든 경로 보호
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
