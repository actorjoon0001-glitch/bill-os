import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_SECRET } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { logActivity, clientMeta } from "@/lib/activity";

// 로그인 없이 접근 가능한 경로
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

// KST 기준 날짜 (하루 1회 접속 기록 판단용)
const kstDate = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const SEEN_COOKIE = "seum_seen";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  if (session) {
    const res = NextResponse.next();
    // 자동 로그인 상태라도 하루 1회 '접속' 기록(기기·IP). 페이지 접근 시에만.
    const today = kstDate();
    const seen = req.cookies.get(SEEN_COOKIE)?.value;
    if (seen !== today && !pathname.startsWith("/api/")) {
      const isProd = process.env.NODE_ENV === "production";
      try {
        await logActivity(session.email, "접속", undefined, clientMeta(req));
      } catch {
        /* 기록 실패는 무시 */
      }
      res.cookies.set(SEEN_COOKIE, today, {
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }
    return res;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
