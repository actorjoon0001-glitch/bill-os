import { prisma, safeQuery } from "@/lib/db";
import {
  splitVat,
  weekKey,
  weekRange,
  monthKey,
  monthRange,
  type TaxType,
} from "@/lib/finance";

// 수납 기준(현금주의) 매출 인식: 실제 수납일이 있는 회차만 매출로 집계한다.
// 계약의 과세유형에 따라 공급가액/부가세를 분리한다.

export type ReceivedRow = {
  contractId: string;
  contractNo: string;
  title: string;
  clientName: string;
  taxType: TaxType;
  label: string;
  kind: string;
  receivedAmount: number;
  receivedDate: Date;
};

export async function getReceivedRows(range?: {
  start: Date;
  end: Date;
}): Promise<ReceivedRow[]> {
  const installments = await safeQuery(
    () =>
      prisma.installment.findMany({
        where: {
          received: true,
          receivedDate: range
            ? { gte: range.start, lte: range.end }
            : { not: null },
        },
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              title: true,
              clientName: true,
              taxType: true,
            },
          },
        },
        orderBy: { receivedDate: "asc" },
      }),
    []
  );

  return installments
    .filter((i) => i.receivedDate)
    .map((i) => ({
      contractId: i.contractId,
      contractNo: i.contract.contractNo,
      title: i.contract.title,
      clientName: i.contract.clientName,
      taxType: i.contract.taxType as TaxType,
      label: i.label,
      kind: i.kind,
      receivedAmount: i.receivedAmount,
      receivedDate: i.receivedDate as Date,
    }));
}

export type PeriodBucket = {
  key: string;
  label: string;
  gross: number; // 수납 합계 (부가세 포함)
  supply: number; // 공급가액
  vat: number; // 부가세
  count: number;
};

/** 주 단위 매출 집계 */
export async function weeklyRevenue(weeks = 12): Promise<PeriodBucket[]> {
  const rows = await getReceivedRows();
  const map = new Map<string, PeriodBucket>();
  for (const r of rows) {
    const key = weekKey(r.receivedDate);
    const { start, end } = weekRange(r.receivedDate);
    const { supply, vat } = splitVat(r.receivedAmount, r.taxType);
    const b =
      map.get(key) ??
      {
        key,
        label: `${key} (${start.getMonth() + 1}/${start.getDate()}~${end.getMonth() + 1}/${end.getDate()})`,
        gross: 0,
        supply: 0,
        vat: 0,
        count: 0,
      };
    b.gross += r.receivedAmount;
    b.supply += supply;
    b.vat += vat;
    b.count += 1;
    map.set(key, b);
  }
  return Array.from(map.values())
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, weeks);
}

/** 월 단위 매출 집계 */
export async function monthlyRevenue(months = 12): Promise<PeriodBucket[]> {
  const rows = await getReceivedRows();
  const map = new Map<string, PeriodBucket>();
  for (const r of rows) {
    const key = monthKey(r.receivedDate);
    const { supply, vat } = splitVat(r.receivedAmount, r.taxType);
    const b =
      map.get(key) ??
      { key, label: `${key.replace("-", "년 ")}월`, gross: 0, supply: 0, vat: 0, count: 0 };
    b.gross += r.receivedAmount;
    b.supply += supply;
    b.vat += vat;
    b.count += 1;
    map.set(key, b);
  }
  return Array.from(map.values())
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, months);
}

export type VatReport = {
  sales: { gross: number; supply: number; vat: number; count: number };
  purchases: { gross: number; supply: number; vat: number; count: number };
  payable: number; // 납부(환급)세액 = 매출세액 - 매입세액
  salesByType: Record<string, { supply: number; vat: number }>;
};

/** 부가세 신고: 기간 내 매출세액 - 매입세액 */
export async function vatReport(start: Date, end: Date): Promise<VatReport> {
  const rows = await getReceivedRows({ start, end });
  const sales = { gross: 0, supply: 0, vat: 0, count: 0 };
  const salesByType: Record<string, { supply: number; vat: number }> = {
    TAXABLE: { supply: 0, vat: 0 },
    ZERO_RATED: { supply: 0, vat: 0 },
    EXEMPT: { supply: 0, vat: 0 },
  };
  for (const r of rows) {
    const { supply, vat } = splitVat(r.receivedAmount, r.taxType);
    sales.gross += r.receivedAmount;
    sales.supply += supply;
    sales.vat += vat;
    sales.count += 1;
    salesByType[r.taxType].supply += supply;
    salesByType[r.taxType].vat += vat;
  }

  const expenses = await safeQuery(
    () =>
      prisma.expense.findMany({
        where: { expenseDate: { gte: start, lte: end } },
      }),
    []
  );
  const purchases = { gross: 0, supply: 0, vat: 0, count: 0 };
  for (const e of expenses) {
    const { supply, vat } = splitVat(e.amount, e.taxType as TaxType);
    purchases.gross += e.amount;
    purchases.supply += supply;
    purchases.vat += vat;
    purchases.count += 1;
  }

  return {
    sales,
    purchases,
    payable: sales.vat - purchases.vat,
    salesByType,
  };
}

/** 대시보드 요약 지표 */
export async function dashboardSummary() {
  const now = new Date();
  const { start: mStart, end: mEnd } = monthRange(now);
  const { start: wStart, end: wEnd } = weekRange(now);

  const [monthRows, weekRows, contracts] = await Promise.all([
    getReceivedRows({ start: mStart, end: mEnd }),
    getReceivedRows({ start: wStart, end: wEnd }),
    safeQuery(
      () =>
        prisma.contract.findMany({
          where: { status: { not: "CANCELED" } },
          include: { installments: true },
        }),
      []
    ),
  ]);

  const monthGross = monthRows.reduce((s, r) => s + r.receivedAmount, 0);
  const weekGross = weekRows.reduce((s, r) => s + r.receivedAmount, 0);

  // 미수금: 진행중 계약의 미수납 회차 합계
  let outstanding = 0;
  let contractTotal = 0;
  let receivedTotal = 0;
  for (const c of contracts) {
    for (const i of c.installments) {
      contractTotal += i.plannedAmount;
      if (i.received) receivedTotal += i.receivedAmount;
      else outstanding += i.plannedAmount;
    }
  }

  // 이번 분기 예상 부가세(간이): 올해 현재 반기 기준
  const year = now.getFullYear();
  const isFirstHalf = now.getMonth() < 6;
  const half = isFirstHalf
    ? { start: new Date(year, 0, 1), end: new Date(year, 5, 30, 23, 59, 59) }
    : { start: new Date(year, 6, 1), end: new Date(year, 11, 31, 23, 59, 59) };
  const vat = await vatReport(half.start, half.end);

  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;

  return {
    monthGross,
    weekGross,
    outstanding,
    contractTotal,
    receivedTotal,
    activeCount,
    contractCount: contracts.length,
    vatPayable: vat.payable,
    vatHalfLabel: isFirstHalf ? `${year}년 1기(1~6월)` : `${year}년 2기(7~12월)`,
  };
}
