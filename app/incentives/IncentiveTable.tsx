"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { EContractRow } from "@/lib/econtracts";

const fmtMan = (n: number) => Math.round(n).toLocaleString("ko-KR");
const monthOf = (date: string) => (date || "").slice(0, 7);
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${y}년 ${Number(mo)}월` : m || "-";
};

// "황진호,조현진" / "황진호/조현진" → ["황진호","조현진"]
const splitReps = (s: string) =>
  (s || "")
    .split(/[,/、·]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const DEFAULT_RATE = 1.0; // 기본 인센티브 요율 (%)
const STORE_KEY = "seum_incentive_rates";
const PAID_KEY = "seum_incentive_paid";
const MEMO_KEY = "seum_incentive_memo";

type Agg = {
  name: string;
  count: number;
  supply: number;
  showrooms: string[];
  contracts: EContractRow[];
};

export default function IncentiveTable({ rows }: { rows: EContractRow[] }) {
  const [month, setMonth] = useState("ALL");
  const [rates, setRates] = useState<Record<string, number>>({});
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(STORE_KEY);
      if (r) setRates(JSON.parse(r));
      const p = localStorage.getItem(PAID_KEY);
      if (p) setPaid(JSON.parse(p));
      const mm = localStorage.getItem(MEMO_KEY);
      if (mm) setMemos(JSON.parse(mm));
    } catch {
      /* 무시 */
    }
  }, []);

  const setRate = (name: string, value: number) => {
    setRates((prev) => {
      const next = { ...prev, [name]: value };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  };

  // 지급여부·메모는 정산 기간(월 필터)별로 분리 저장한다.
  const keyOf = (name: string) => `${month}::${name}`;
  const setPaidState = (name: string, value: boolean) => {
    setPaid((prev) => {
      const next = { ...prev, [keyOf(name)]: value };
      try {
        localStorage.setItem(PAID_KEY, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  };
  const setMemo = (name: string, value: string) => {
    setMemos((prev) => {
      const next = { ...prev, [keyOf(name)]: value };
      try {
        localStorage.setItem(MEMO_KEY, JSON.stringify(next));
      } catch {
        /* 무시 */
      }
      return next;
    });
  };

  const months = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => monthOf(r.contractDate)).filter(Boolean))).sort(
        (a, b) => b.localeCompare(a)
      ),
    [rows]
  );

  const filtered = useMemo(
    () => (month === "ALL" ? rows : rows.filter((r) => monthOf(r.contractDate) === month)),
    [rows, month]
  );

  // 영업사원별 집계 (공동계약은 각자에게 공급가액 전액 귀속 → 각자 요율 적용)
  const aggs = useMemo<Agg[]>(() => {
    const m = new Map<string, Agg>();
    for (const r of filtered) {
      const reps = splitReps(r.salesperson);
      const list = reps.length ? reps : ["(미지정)"];
      for (const name of list) {
        const cur =
          m.get(name) || { name, count: 0, supply: 0, showrooms: [], contracts: [] };
        cur.count += 1;
        cur.supply += r.supply;
        cur.contracts.push(r);
        if (r.showroom && !cur.showrooms.includes(r.showroom)) cur.showrooms.push(r.showroom);
        m.set(name, cur);
      }
    }
    return Array.from(m.values()).sort((a, b) => b.supply - a.supply);
  }, [filtered]);

  const rateOf = (name: string) =>
    rates[name] === undefined ? DEFAULT_RATE : rates[name];
  const incentiveOf = (a: Agg) => (a.supply * rateOf(a.name)) / 100;

  const totalSupply = aggs.reduce((s, a) => s + a.supply, 0);
  const totalIncentive = aggs.reduce((s, a) => s + incentiveOf(a), 0);

  if (rows.length === 0) {
    return <EmptyState>계약완료 + 계약금 입금된 계약이 없습니다.</EmptyState>;
  }

  return (
    <div>
      {/* 요약 + 월 필터 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          className="input w-auto"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setOpen(null);
          }}
        >
          <option value="ALL">전체 기간</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <div className="card px-4 py-2">
          <span className="text-xs text-slate-400">대상 </span>
          <span className="font-bold text-slate-800 tabular-nums">{aggs.length}</span>
          <span className="text-xs text-slate-400">명 · 공급가액 </span>
          <span className="font-bold text-slate-800 tabular-nums">{fmtMan(totalSupply)}</span>
          <span className="text-xs text-slate-400">만원</span>
        </div>
        <div className="card px-4 py-2 ml-auto">
          <span className="text-xs text-slate-400">인센티브 총액 </span>
          <span className="font-bold text-emerald-600 tabular-nums">
            {fmtMan(totalIncentive)}
          </span>
          <span className="text-xs text-slate-400">만원</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="th">영업사원</th>
                <th className="th">전시장</th>
                <th className="th text-right">계약 건수</th>
                <th className="th text-right">공급가액 합계</th>
                <th className="th text-center">요율(%)</th>
                <th className="th text-right">인센티브</th>
                <th className="th text-center">지급여부</th>
                <th className="th">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aggs.map((a) => {
                const isOpen = open === a.name;
                return (
                  <Fragment key={a.name}>
                    <tr
                      className={`hover:bg-slate-50/60 ${isOpen ? "bg-brand-50/40" : ""}`}
                    >
                      <td className="td">
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : a.name)}
                          className="flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                        >
                          <span
                            className={`inline-block transition-transform text-slate-400 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          >
                            ▸
                          </span>
                          {a.name}
                        </button>
                      </td>
                      <td className="td text-sm text-slate-600">
                        {a.showrooms.length ? a.showrooms.join(", ") : "-"}
                      </td>
                      <td className="td text-right tabular-nums">{a.count}건</td>
                      <td className="td text-right tabular-nums">{fmtMan(a.supply)}</td>
                      <td className="td text-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={rateOf(a.name)}
                          onChange={(e) => setRate(a.name, Number(e.target.value))}
                          className="input w-20 text-right py-1"
                        />
                      </td>
                      <td className="td text-right tabular-nums font-semibold text-emerald-600">
                        {fmtMan(incentiveOf(a))}
                      </td>
                      <td className="td text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(paid[keyOf(a.name)])}
                            onChange={(e) => setPaidState(a.name, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span
                            className={`ml-1.5 text-xs ${
                              paid[keyOf(a.name)] ? "text-emerald-600 font-medium" : "text-slate-400"
                            }`}
                          >
                            {paid[keyOf(a.name)] ? "지급완료" : "미지급"}
                          </span>
                        </label>
                      </td>
                      <td className="td">
                        <input
                          type="text"
                          value={memos[keyOf(a.name)] || ""}
                          onChange={(e) => setMemo(a.name, e.target.value)}
                          placeholder="메모"
                          className="input py-1 min-w-[140px]"
                        />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50/70 px-4 py-3">
                          <div className="text-xs font-semibold text-slate-500 mb-2">
                            {a.name} · 계약 {a.count}건
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm bg-white rounded-lg overflow-hidden border border-slate-200">
                              <thead className="bg-slate-100/70 text-slate-500">
                                <tr>
                                  <th className="px-3 py-1.5 text-left font-medium">계약번호</th>
                                  <th className="px-3 py-1.5 text-left font-medium">건축주</th>
                                  <th className="px-3 py-1.5 text-left font-medium">현장주소</th>
                                  <th className="px-3 py-1.5 text-left font-medium">전시장</th>
                                  <th className="px-3 py-1.5 text-right font-medium">공급가액</th>
                                  <th className="px-3 py-1.5 text-right font-medium">계약금</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {a.contracts.map((c) => {
                                  const co = splitReps(c.salesperson).length > 1;
                                  return (
                                    <tr key={c.contractNo}>
                                      <td className="px-3 py-1.5 whitespace-nowrap">
                                        <span className="font-medium text-slate-700">
                                          {c.contractNo}
                                        </span>
                                        {co && (
                                          <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">
                                            공동
                                          </span>
                                        )}
                                        <div className="text-[11px] text-slate-400">
                                          {c.contractDate}
                                        </div>
                                      </td>
                                      <td className="px-3 py-1.5">{c.clientName || "-"}</td>
                                      <td className="px-3 py-1.5 text-slate-500">
                                        {c.siteAddress}
                                      </td>
                                      <td className="px-3 py-1.5 text-slate-500">
                                        {c.showroom || "-"}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums">
                                        {fmtMan(c.supply)}
                                      </td>
                                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">
                                        {fmtMan(c.downPayment)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="td font-semibold text-slate-700">합계</td>
                <td className="td"></td>
                <td className="td"></td>
                <td className="td text-right tabular-nums font-semibold">
                  {fmtMan(totalSupply)}
                </td>
                <td className="td"></td>
                <td className="td text-right tabular-nums font-bold text-emerald-600">
                  {fmtMan(totalIncentive)}
                </td>
                <td className="td text-center text-xs text-slate-400 tabular-nums">
                  {aggs.filter((a) => paid[keyOf(a.name)]).length}/{aggs.length} 지급
                </td>
                <td className="td"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · 금액 단위: 만원 · 기준: 공급가액(부가세 제외) · 인센티브 = 공급가액 × 요율(%)
        <br />· 영업사원 이름을 클릭하면 해당 계약 목록이 펼쳐집니다.
        <br />· 공동계약(영업사원 2명)은 각자에게 공급가액 전액을 귀속하여 각자 요율로 계산합니다.
        <br />· 요율은 영업사원별로 입력·저장되며(이 브라우저에 저장) 기본값은 {DEFAULT_RATE}% 입니다.
      </p>
    </div>
  );
}
