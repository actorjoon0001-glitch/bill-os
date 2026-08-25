import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_PASSWORD,
  AUTH_COOKIE,
  SESSION_TOKEN,
  SESSION_MAX_AGE,
} from "@/lib/auth";

// 일반 폼 전송(top-level navigation)으로 처리해, 브라우저가 세션 쿠키를
// 확실히 저장하도록 한다. (fetch/XHR 로 심는 쿠키를 막는 환경 대응)
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "").trim();
  let from = String(form?.get("from") ?? "/");
  if (!from.startsWith("/") || from.startsWith("/login")) from = "/";

  // 비밀번호 불일치 → 로그인 화면으로 되돌리며 에러 표시
  if (!password || password !== ADMIN_PASSWORD) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "1");
    if (from !== "/") url.searchParams.set("from", from);
    return NextResponse.redirect(url, 303);
  }

  // 성공 → 세션 쿠키를 심고 목적지로 이동
  // 포털 내장 브라우저/iframe(교차 사이트) 에서도 쿠키가 저장되도록
  // 운영(HTTPS)에서는 SameSite=None; Secure 를 사용한다.
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(new URL(from, req.url), 303);
  res.cookies.set(AUTH_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: isProd,
  });
  return res;
}
