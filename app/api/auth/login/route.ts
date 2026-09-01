import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  SESSION_SECRET,
  SESSION_MAX_AGE,
  ALLOWED_TEAMS,
  ADMIN_EMAILS,
  supabaseAuthBase,
  supabaseRest,
  supabaseKey,
  authConfigured,
} from "@/lib/auth";
import { signSession } from "@/lib/session";

function redirectLogin(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const password = String(form?.get("password") ?? "");
  let from = String(form?.get("from") ?? "/");
  if (!from.startsWith("/") || from.startsWith("/login")) from = "/";
  const extra: Record<string, string> = from !== "/" ? { from } : {};

  if (!authConfigured()) return redirectLogin(req, { error: "config", ...extra });
  if (!email || !password) return redirectLogin(req, { error: "cred", ...extra });

  // 1) 세움 Supabase Auth 로 이메일/비밀번호 검증
  let authOk = false;
  try {
    const r = await fetch(
      `${supabaseAuthBase()}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: supabaseKey(), "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );
    authOk = r.ok;
  } catch {
    authOk = false;
  }
  if (!authOk) return redirectLogin(req, { error: "cred", ...extra });

  // 2) 접근 권한: 관리자 이메일이거나, employees 의 승인된 정산/경영팀
  let allowed = ADMIN_EMAILS.includes(email);
  if (!allowed) {
    try {
      const params = new URLSearchParams();
      params.set("select", "team,status");
      params.set("email", `ilike.${email}`); // 대소문자 무시 정확 일치
      params.set("limit", "1");
      const r = await fetch(`${supabaseRest()}/employees?${params.toString()}`, {
        headers: {
          apikey: supabaseKey(),
          Authorization: `Bearer ${supabaseKey()}`,
        },
        cache: "no-store",
      });
      if (r.ok) {
        const rows = (await r.json()) as Array<{ team?: string; status?: string }>;
        const emp = rows?.[0];
        if (emp && emp.status === "approved" && ALLOWED_TEAMS.includes(emp.team || "")) {
          allowed = true;
        }
      }
    } catch {
      /* ignore → allowed 유지(false) */
    }
  }
  if (!allowed) return redirectLogin(req, { error: "perm", ...extra });

  // 3) 서명된 세션 쿠키 발급 후 이동
  const isProd = process.env.NODE_ENV === "production";
  const token = await signSession(email, SESSION_SECRET);
  const res = NextResponse.redirect(new URL(from, req.url), 303);
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
