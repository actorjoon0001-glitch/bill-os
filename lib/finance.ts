// 정산 OS 공통 재무 계산 유틸
// 금액은 모두 "원" 단위 정수. 계약/지출 금액은 부가세 포함(공급대가) 기준으로 저장한다.

export const VAT_RATE = 0.1;

export type TaxType = "TAXABLE" | "ZERO_RATED" | "EXEMPT";

/**
 * 부가세 포함 금액(공급대가)에서 공급가액과 세액을 분리한다.
 * - 과세(TAXABLE): 세액 = 공급대가 / 11 (반올림), 공급가액 = 공급대가 - 세액
 * - 영세율/면세: 세액 0, 공급가액 = 금액 전체
 */
export function splitVat(
  grossAmount: number,
  taxType: TaxType
): { supply: number; vat: number } {
  if (taxType !== "TAXABLE" || grossAmount === 0) {
    return { supply: grossAmount, vat: 0 };
  }
  const vat = Math.round(grossAmount / 11);
  return { supply: grossAmount - vat, vat };
}

/** 금액 포맷: 1234567 -> "1,234,567" */
export function formatWon(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "0";
  return Math.round(amount).toLocaleString("ko-KR");
}

/** "₩1,234,567" 형태 */
export function formatKRW(amount: number | null | undefined): string {
  return `₩${formatWon(amount)}`;
}

/** 날짜 -> "2026-07-16" */
export function toDateStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM 월 키 */
export function monthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * ISO 8601 주차 계산. { year, week } 반환.
 * 목요일 기준으로 주가 속한 연도를 판정한다.
 */
export function isoWeek(d: Date | string): { year: number; week: number } {
  const date = new Date(typeof d === "string" ? d : d.getTime());
  date.setHours(0, 0, 0, 0);
  // 목요일로 이동 (ISO: 월=1 ~ 일=7)
  const day = (date.getDay() + 6) % 7; // 월=0 ~ 일=6
  date.setDate(date.getDate() - day + 3);
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: date.getFullYear(), week };
}

/** "2026-W29" 주차 키 */
export function weekKey(d: Date | string): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** 특정 주차 키가 가리키는 월요일~일요일 범위 */
export function weekRange(d: Date | string): { start: Date; end: Date } {
  const date = new Date(typeof d === "string" ? d : d.getTime());
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // 월=0
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/** 이번 달 1일 ~ 말일 */
export function monthRange(d: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ---- 부가세 과세기간 프리셋 ----
export type VatPeriodPreset = {
  key: string;
  label: string;
  start: string; // YYYY-MM-DD
  end: string;
};

/** 해당 연도의 부가세 신고 과세기간 프리셋(분기/반기) */
export function vatPeriodsForYear(year: number): VatPeriodPreset[] {
  return [
    { key: `${year}-1P`, label: `${year}년 1기 예정 (1~3월)`, start: `${year}-01-01`, end: `${year}-03-31` },
    { key: `${year}-1F`, label: `${year}년 1기 확정 (4~6월)`, start: `${year}-04-01`, end: `${year}-06-30` },
    { key: `${year}-1H`, label: `${year}년 1기 전체 (1~6월)`, start: `${year}-01-01`, end: `${year}-06-30` },
    { key: `${year}-2P`, label: `${year}년 2기 예정 (7~9월)`, start: `${year}-07-01`, end: `${year}-09-30` },
    { key: `${year}-2F`, label: `${year}년 2기 확정 (10~12월)`, start: `${year}-10-01`, end: `${year}-12-31` },
    { key: `${year}-2H`, label: `${year}년 2기 전체 (7~12월)`, start: `${year}-07-01`, end: `${year}-12-31` },
  ];
}

export const INSTALLMENT_KIND_LABEL: Record<string, string> = {
  DOWN_PAYMENT: "계약금",
  INTERIM: "중도금",
  BALANCE: "잔금",
};

export const CONTRACT_SOURCE_LABEL: Record<string, string> = {
  MANUAL: "수기",
  ELECTRONIC: "전자",
};

export const TAX_TYPE_LABEL: Record<string, string> = {
  TAXABLE: "과세",
  ZERO_RATED: "영세율",
  EXEMPT: "면세",
};

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "진행중",
  COMPLETED: "완납",
  CANCELED: "해지",
};
