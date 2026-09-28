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
  device: string | null;
  ip: string | null;
  at: string;
};

// User-Agent → 기기 종류·OS 라벨 (예: "PC · Windows", "휴대폰 · iPhone")
export function parseDevice(ua: string): string {
  if (!ua) return "";
  const tablet = /iPad|Tablet/i.test(ua);
  const mobile = /Android|iPhone|iPod|Mobile/i.test(ua) && !tablet;
  let os = "";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "Mac";
  else if (/Linux/i.test(ua)) os = "Linux";
  const kind = tablet ? "태블릿" : mobile ? "휴대폰" : "PC";
  return [kind, os].filter(Boolean).join(" · ");
}

// 요청에서 기기·IP 추출
export function clientMeta(req: NextRequest): { device: string; ip: string } {
  const ua = req.headers.get("user-agent") || "";
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = xff.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  return { device: parseDevice(ua), ip };
}

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
export async function logActivity(
  email: string,
  action: string,
  detail?: string,
  meta?: { device?: string; ip?: string }
): Promise<void> {
  if (!ready() || !email) return;
  const base = {
    id: uid(),
    email: email.toLowerCase(),
    action,
    detail: detail ?? null,
    at: new Date().toISOString(),
  };
  const full = { ...base, device: meta?.device || null, ip: meta?.ip || null };
  const post = (payload: object) =>
    fetch(`${supabaseRest()}/settlement_activity`, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify([payload]),
    });
  try {
    const res = await post(full);
    // device/ip 컬럼이 아직 없으면 제외하고 재시도
    if (!res.ok) await post(base);
  } catch {
    /* 무시 */
  }
}

// 요청 기반 기록 (이메일 + 기기 + IP 자동)
export async function logRequest(req: NextRequest, action: string, detail?: string): Promise<void> {
  const email = await actorEmail(req);
  if (!email) return;
  await logActivity(email, action, detail, clientMeta(req));
}

// 최근 활동 조회 (관리자 페이지용)
export async function getActivity(limit = 300): Promise<Activity[]> {
  if (!ready()) return [];
  const url = (cols: string) =>
    `${supabaseRest()}/settlement_activity?select=${cols}&order=at.desc&limit=${limit}`;
  try {
    let res = await fetch(url("id,email,action,detail,device,ip,at"), {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      // device/ip 컬럼 미존재 시 제외하고 재시도
      res = await fetch(url("id,email,action,detail,at"), { headers: headers(), cache: "no-store" });
    }
    if (!res.ok) return [];
    return (await res.json()) as Activity[];
  } catch {
    return [];
  }
}
