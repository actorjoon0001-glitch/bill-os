import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, SESSION_SECRET, ADMIN_EMAILS } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { setAccess } from "@/lib/settlement";

// 관리자: 직원별 정산OS 접근 권한 설정 (default | allow | block)
export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const email = (session?.email || "").toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "관리자만 설정할 수 있습니다." }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    mode?: string;
  } | null;
  const target = String(body?.email || "").trim().toLowerCase();
  const mode = String(body?.mode || "");
  if (!target || !["default", "allow", "block"].includes(mode)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  // 관리자 이메일은 항상 허용 — 차단 설정 방지
  if (ADMIN_EMAILS.includes(target) && mode === "block") {
    return NextResponse.json({ error: "관리자는 차단할 수 없습니다." }, { status: 400 });
  }
  const ok = await setAccess(target, mode as "default" | "allow" | "block", email);
  return NextResponse.json({ ok });
}
