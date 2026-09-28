// 활동/로그인 감사 로그 — 세움 Supabase(settlement_activity)에 기록·조회
import type { NextRequest } from "next/server";
import { supabaseRest, supabaseKey, AUTH_COOKIE, SESSION_SECRET } from "@/lib/auth";
import { verifySession } from "@/lib/session";

const headers = (extra: Record<string, string> = {}) => ({
  apikey: supabaseKey(),
  Authorization: `Bearer ${supabaseKey()}`,
  "Content-Type": "application/json",
  ...extra,
});
const ready = () => Boolean(supabaseRest() && supabaseKey());
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export type Activity = {
  id: string;
  email: string;
  action: string;
  detail: string | null;
  at: string;
};

// 요청의 로그인 사용자 이메일(감사 기록용)
export async function actorEmail(req: NextRequest): Promise<string> {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const s = await verifySession(token, SESSION_SECRET);
    return (s?.email || "").toLowerCase();
  } catch {
    return "";
  }
}

// 활동 1건 기록 (실패해도 본 동작에 영향 없음)
export async function logActivity(email: string, action: string, detail?: string): Promise<void> {
  if (!ready() || !email) return;
  try {
    await fetch(`${supabaseRest()}/settlement_activity`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify([
        {
          id: uid(),
          email: email.toLowerCase(),
          action,
          detail: detail ?? null,
          at: new Date().toISOString(),
        },
      ]),
    });
  } catch {
    /* 무시 */
  }
}

// 최근 활동 조회 (관리자 페이지용)
export async function getActivity(limit = 300): Promise<Activity[]> {
  if (!ready()) return [];
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_activity?select=id,email,action,detail,at&order=at.desc&limit=${limit}`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return [];
    return (await res.json()) as Activity[];
  } catch {
    return [];
  }
}
