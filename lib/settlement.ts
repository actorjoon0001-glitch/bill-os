// 정산OS 공유 저장소 — 세움os Supabase(settlement_* 테이블)에 서버측에서 읽고 쓴다.
// 전자계약서 연동과 동일한 환경변수(ECONTRACT_API_URL/KEY)를 재사용한다.
import { supabaseRest, supabaseKey } from "@/lib/auth";

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
  extra?: Record<string, { amt?: string; memo?: string; taxed?: boolean }> | null;
};

const ready = () => Boolean(supabaseRest() && supabaseKey());

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
