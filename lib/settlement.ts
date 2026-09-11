// 정산OS 공유 저장소 — 세움os Supabase(settlement_* 테이블)에 서버측에서 읽고 쓴다.
// 전자계약서 연동과 동일한 환경변수(ECONTRACT_API_URL/KEY)를 재사용한다.
import { supabaseRest, supabaseKey, ADMIN_EMAILS, ALLOWED_TEAMS } from "@/lib/auth";

const headers = (extra: Record<string, string> = {}) => ({
  apikey: supabaseKey(),
  Authorization: `Bearer ${supabaseKey()}`,
  "Content-Type": "application/json",
  ...extra,
});

export type SheetManual = {
  contract_no: string;
  balance?: string | null;
  evidence?: string | null;
  worker?: string | null;
  progress?: string | null;
  biz?: string | null;
  extra?: Record<
    string,
    {
      amt?: string;
      memo?: string;
      taxed?: boolean;
      confirmed?: boolean;
      confirmedBy?: string;
      confirmedAt?: string;
      editedBy?: string;
      editedAt?: string;
      editedFrom?: string;
    }
  > | null;
};

const ready = () => Boolean(supabaseRest() && supabaseKey());

// 이메일로 직원 이름 조회 (확인자 표시용). 실패 시 이메일 반환.
export async function getUserName(email: string): Promise<string> {
  if (!ready() || !email) return email || "";
  try {
    const params = new URLSearchParams();
    params.set("select", "name");
    params.set("email", `ilike.${email}`);
    params.set("limit", "1");
    const res = await fetch(`${supabaseRest()}/employees?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return email;
    const rows = (await res.json()) as Array<{ name?: string }>;
    return rows?.[0]?.name || email;
  } catch {
    return email;
  }
}

// ---- 직원 목록 & 정산OS 접근 권한 ----
export type Employee = {
  id: number;
  name: string;
  team: string;
  position_name: string | null;
  email: string;
  status: string;
  showroom: string | null;
};

// 세움 직원 전체 목록(관리자 페이지용). 팀·이름 순.
export async function getEmployees(): Promise<Employee[]> {
  if (!ready()) return [];
  try {
    const params = new URLSearchParams();
    params.set("select", "id,name,team,position_name,email,status,showroom");
    params.set("order", "team.asc,name.asc");
    const res = await fetch(`${supabaseRest()}/employees?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Employee[];
  } catch {
    return [];
  }
}

// 직원별 명시적 접근 설정(이메일 소문자 → 허용여부). 설정 없으면 팀 규칙 적용.
export async function getAccessMap(): Promise<Record<string, boolean>> {
  if (!ready()) return {};
  try {
    const res = await fetch(`${supabaseRest()}/settlement_access?select=email,allowed`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ email: string; allowed: boolean }>;
    const map: Record<string, boolean> = {};
    for (const r of rows) map[(r.email || "").toLowerCase()] = Boolean(r.allowed);
    return map;
  } catch {
    return {};
  }
}

async function getAccessFor(email: string): Promise<boolean | null> {
  if (!ready()) return null;
  try {
    const params = new URLSearchParams();
    params.set("select", "allowed");
    params.set("email", `ilike.${email}`);
    params.set("limit", "1");
    const res = await fetch(`${supabaseRest()}/settlement_access?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ allowed: boolean }>;
    return rows.length ? Boolean(rows[0].allowed) : null;
  } catch {
    return null;
  }
}

// 로그인 접근 허용 여부 판정:
//  1) 관리자 이메일 → 허용
//  2) 직원별 명시적 설정(허용/차단) → 그대로
//  3) 설정 없으면 팀 규칙(승인된 정산·경영팀) → 허용
export async function isLoginAllowed(email: string): Promise<boolean> {
  const e = (email || "").toLowerCase();
  if (!e) return false;
  if (ADMIN_EMAILS.includes(e)) return true;
  const override = await getAccessFor(e);
  if (override !== null) return override;
  if (!ready()) return false;
  try {
    const params = new URLSearchParams();
    params.set("select", "team,status");
    params.set("email", `ilike.${e}`);
    params.set("limit", "1");
    const res = await fetch(`${supabaseRest()}/employees?${params.toString()}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as Array<{ team?: string; status?: string }>;
    const emp = rows[0];
    return Boolean(emp && emp.status === "approved" && ALLOWED_TEAMS.includes(emp.team || ""));
  } catch {
    return false;
  }
}

// 관리자: 직원별 접근 설정 저장. mode = default(설정 삭제=팀 규칙) | allow | block
export async function setAccess(
  email: string,
  mode: "default" | "allow" | "block",
  by: string
): Promise<boolean> {
  if (!ready() || !email) return false;
  const e = email.toLowerCase();
  try {
    if (mode === "default") {
      const res = await fetch(
        `${supabaseRest()}/settlement_access?email=eq.${encodeURIComponent(e)}`,
        { method: "DELETE", headers: headers() }
      );
      return res.ok;
    }
    const res = await fetch(`${supabaseRest()}/settlement_access`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([
        { email: e, allowed: mode === "allow", updated_by: by, updated_at: new Date().toISOString() },
      ]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- 전자계약서 관리 시트 입력값 ----
export async function getSheetAll(): Promise<Record<string, SheetManual>> {
  if (!ready()) return {};
  const toMap = (rows: SheetManual[]) => {
    const map: Record<string, SheetManual> = {};
    for (const r of rows) map[r.contract_no] = r;
    return map;
  };
  try {
    // extra(jsonb) 컬럼 포함 조회, 컬럼이 아직 없으면 제외하고 재시도
    let res = await fetch(
      `${supabaseRest()}/settlement_sheet?select=contract_no,balance,evidence,worker,progress,biz,extra`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) {
      res = await fetch(
        `${supabaseRest()}/settlement_sheet?select=contract_no,balance,evidence,worker,progress,biz`,
        { headers: headers(), cache: "no-store" }
      );
    }
    if (!res.ok) return {};
    return toMap((await res.json()) as SheetManual[]);
  } catch {
    return {};
  }
}

export async function upsertSheet(row: SheetManual): Promise<boolean> {
  if (!ready() || !row.contract_no) return false;
  const post = (payload: object) =>
    fetch(`${supabaseRest()}/settlement_sheet`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([{ ...payload, updated_at: new Date().toISOString() }]),
    });
  try {
    let res = await post(row);
    if (!res.ok && row.extra !== undefined) {
      // extra 컬럼 미존재 시 제외하고 재시도(나머지 항목은 저장)
      const { extra, ...rest } = row;
      res = await post(rest);
    }
    return res.ok;
  } catch {
    return false;
  }
}

// ---- 인센티브 요율 (영업사원별) ----
export async function getIncentiveRates(): Promise<Record<string, number>> {
  if (!ready()) return {};
  try {
    const res = await fetch(
      `${supabaseRest()}/settlement_incentive_rate?select=salesperson,rate`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ salesperson: string; rate: number }>;
    const map: Record<string, number> = {};
    for (const r of rows) map[r.salesperson] = Number(r.rate);
    return map;
  } catch {
    return {};
  }
}

export async function upsertIncentiveRate(salesperson: string, rate: number): Promise<boolean> {
  if (!ready() || !salesperson) return false;
  try {
    const res = await fetch(`${supabaseRest()}/settlement_incentive_rate`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([{ salesperson, rate, updated_at: new Date().toISOString() }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---- 인센티브 지급여부/메모 (id = '기간::영업사원') ----
export type IncentiveSettle = { paid: boolean; memo: string };

export async function getIncentiveSettle(): Promise<Record<string, IncentiveSettle>> {
  if (!ready()) return {};
  try {
    const res = await fetch(`${supabaseRest()}/settlement_incentive?select=id,paid,memo`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as Array<{ id: string; paid: boolean; memo: string | null }>;
    const map: Record<string, IncentiveSettle> = {};
    for (const r of rows) map[r.id] = { paid: Boolean(r.paid), memo: r.memo || "" };
    return map;
  } catch {
    return {};
  }
}

export async function upsertIncentiveSettle(
  id: string,
  patch: Partial<IncentiveSettle>
): Promise<boolean> {
  if (!ready() || !id) return false;
  try {
    const res = await fetch(`${supabaseRest()}/settlement_incentive`, {
      method: "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify([{ id, ...patch, updated_at: new Date().toISOString() }]),
    });
    return res.ok;
  } catch {
    return false;
  }
}
