// 경영지원 OS — 인사/근태 공유 저장소 (세움 Supabase, settlement_* 재사용 패턴)
import { supabaseRest, supabaseKey } from "@/lib/auth";

const headers = (extra: Record<string, string> = {}) => ({
  apikey: supabaseKey(),
  Authorization: `Bearer ${supabaseKey()}`,
  "Content-Type": "application/json",
  ...extra,
});
const ready = () => Boolean(supabaseRest() && supabaseKey());

// ---- 세움 플랫폼 실제 출·퇴근 조회 (attendance 테이블, 읽기 전용) ----
export type PlatformAttendance = {
  id: string;
  user_name: string;
  team: string;
  showroom: string;
  date: string;
  check_in: string | null; // ISO(UTC)
  check_out: string | null; // ISO(UTC)
  status: string; // working/finished/late/before
  is_late: boolean;
  work_minutes: number | null;
  note: string | null;
  memo: string | null;
};

export async function getPlatformAttendance(date: string): Promise<PlatformAttendance[]> {
  if (!ready() || !date) return [];
  try {
    const params = new URLSearchParams();
    params.set(
      "select",
      "id,user_name,team,showroom,date,check_in,check_out,status,is_late,work_minutes,note,memo"
    );
    params.set("date", `eq.${date}`);
    params.set("order", "check_in.asc");
    const res = await fetch(`${supabaseRest()}/attendance?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as PlatformAttendance[];
  } catch {
    return [];
  }
}

// ---- 근태 관리 (일자·직원별) ----
export type Attendance = {
  id: string; // `${email}::${date}`
  email: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: string; // 출근/지각/외근/반차/연차/결근
  check_in?: string | null;
  check_out?: string | null;
  memo?: string | null;
};

export async function getAttendance(date: string): Promise<Record<string, Attendance>> {
  if (!ready() || !date) return {};
  try {
    const params = new URLSearchParams();
    params.set("select", "id,email,name,date,status,check_in,check_out,memo");
    params.set("date", `eq.${date}`);
    const res = await fetch(`${supabaseRest()}/settlement_attendance?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as Attendance[];
    const map: Record<string, Attendance> = {};
    for (const r of rows) map[(r.email || "").toLowerCase()] = r;
    return map;
  } catch {
    return {};
  }
}

export async function upsertAttendance(row: Attendance): Promise<boolean> {
  if (!ready() || !row.id) return false;
  try {
    const res = await fetch(`${supabaseRest()}/settlement_attendance`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([{ ...row, updated_at: new Date().toISOString() }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- 월차/연차 관리 ----
export type Leave = {
  id: string;
  email: string;
  name: string;
  type: string; // 연차/월차/반차/특별
  leave_date: string; // 사용일 YYYY-MM-DD
  reason?: string | null;
  status: string; // 대기/승인/반려
  created_at?: string;
};

export async function getLeaves(): Promise<Leave[]> {
  if (!ready()) return [];
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_leave?select=id,email,name,type,leave_date,reason,status,created_at&order=leave_date.desc`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return [];
    return (await res.json()) as Leave[];
  } catch {
    return [];
  }
}

export async function upsertLeave(row: Leave): Promise<boolean> {
  if (!ready() || !row.id) return false;
  try {
    const res = await fetch(`${supabaseRest()}/settlement_leave`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([row]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteLeave(id: string): Promise<boolean> {
  if (!ready() || !id) return false;
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_leave?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: headers() }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ---- 팀 업무일지 ----
export type Worklog = {
  id: string;
  log_date: string; // YYYY-MM-DD
  team: string;
  author: string;
  content: string;
  note?: string | null;
  created_at?: string;
};

export async function getWorklogs(): Promise<Worklog[]> {
  if (!ready()) return [];
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_worklog?select=id,log_date,team,author,content,note,created_at&order=log_date.desc,created_at.desc`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return [];
    return (await res.json()) as Worklog[];
  } catch {
    return [];
  }
}

export async function upsertWorklog(row: Worklog): Promise<boolean> {
  if (!ready() || !row.id) return false;
  try {
    const res = await fetch(`${supabaseRest()}/settlement_worklog`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([row]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteWorklog(id: string): Promise<boolean> {
  if (!ready() || !id) return false;
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_worklog?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers: headers() }
    );
    return res.ok;
  } catch {
    return false;
  }
}
