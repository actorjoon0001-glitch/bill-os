"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { EContractRow } from "@/lib/econtracts";
import type { IncentiveSettle } from "@/lib/settlement";

const fmtMan = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtWon = (man: number) => Math.round(man * 10000).toLocaleString("ko-KR"); // 만원 → 원
const monthOf = (date: string) => (date || "").slice(0, 7);
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${y}년 ${Number(mo)}월` : m || "-";
};

const splitReps = (s: string) =>
  (s || "")
    .split(/[,/、·]+/)
    .map((x) => x.trim())
    .filter(Boolean);

const DEFAULT_RATE = 1.0; // 기본 인센티브 요율 (%)

type Agg = { name: string; count: number; supply: number; contracts: EContractRow[] };
type Group = { showroom: string; aggs: Agg[]; count: number; supply: number };

export default function IncentiveTable({
  rows,
  initialRates = {},
  initialSettle = {},
}: {
  rows: EContractRow[];
  initialRates?: Record<string, number>;
  initialSettle?: Record<string, IncentiveSettle>;
}) {
  const [month, setMonth] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rates, setRates] = useState<Record<string, number>>(initialRates);
  const [settle, setSettle] = useState<Record<string, IncentiveSettle>>(initialSettle);
  const [open, setOpen] = useState<string | null>(null); // '전시장::영업사원'
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debounce = (key: string, fn: () => void, delay = 500) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, delay);
  };

  const saveRate = (salesperson: string, rate: number) =>
    fetch("/api/incentive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rate", salesperson, rate }),
    }).catch(() => {});
  const saveSettle = (id: string, patch: Partial<IncentiveSettle>) =>
    fetch("/api/incentive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "settle", id, ...patch }),
    }).catch(() => {});

  const setRateKey = (key: string, value: number) => {
    setRates((prev) => ({ ...prev, [key]: value }));
    debounce(`rate:${key}`, () => saveRate(key, value));
  };

  // 지급여부/메모 저장 기간 키
  const periodKey =
    month !== "ALL" ? month : dateFrom || dateTo ? `${dateFrom}~${dateTo}` : "ALL";

  // 전시장별 요율 (하위호환: 전시장::이름 → 이름 → 기본)
  const baseRateOf = (sr: string, name: string) => {
    const k = `${sr}::${name}`;
    if (rates[k] !== undefined) return rates[k];
    if (rates[name] !== undefined) return rates[name];
    return DEFAULT_RATE;
  };
  const contractRateOf = (sr: string, name: string, no: string) => {
    const k = `${sr}::${name}::${no}`;
    if (rates[k] !== undefined) return rates[k];
    const old = `${name}::${no}`;
    if (rates[old] !== undefined) return rates[old];
    return baseRateOf(sr, name);
  };
  const incentiveOfAgg = (sr: string, a: Agg) =>
    a.contracts.reduce((s, c) => s + (c.supply * contractRateOf(sr, a.name, c.contractNo)) / 100, 0);

  // 지급여부/메모 (하위호환: period::전시장::이름 → period::이름)
  const settleKey = (sr: string, name: string) => `${periodKey}::${sr}::${name}`;
  const paidOf = (sr: string, name: string) => {
    const k = settleKey(sr, name);
    if (settle[k] !== undefined) return Boolean(settle[k].paid);
    return Boolean(settle[`${periodKey}::${name}`]?.paid);
  };
  const memoOf = (sr: string, name: string) => {
    const k = settleKey(sr, name);
    if (settle[k]?.memo !== undefined) return settle[k].memo;
    return settle[`${periodKey}::${name}`]?.memo || "";
  };
  const setPaidState = (sr: string, name: string, value: boolean) => {
    const id = settleKey(sr, name);
    setSettle((prev) => ({ ...prev, [id]: { paid: value, memo: prev[id]?.memo ?? memoOf(sr, name) } }));
    saveSettle(id, { paid: value });
  };
  const setMemo = (sr: string, name: string, value: string) => {
    const id = settleKey(sr, name);
    setSettle((prev) => ({ ...prev, [id]: { paid: prev[id]?.paid ?? paidOf(sr, name), memo: value } }));
    debounce(`memo:${id}`, () => saveSettle(id, { memo: value }));
  };

  const months = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => monthOf(r.contractDate)).filter(Boolean))).sort((a, b) =>
        b.localeCompare(a)
      ),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (month !== "ALL" && monthOf(r.contractDate) !== month) return false;
        if (dateFrom && r.contractDate < dateFrom) return false;
        if (dateTo && r.contractDate > dateTo) return false;
        return true;
      }),
    [rows, month, dateFrom, dateTo]
  );

  // 전시장 → 영업사원 그룹
  const groups = useMemo<Group[]>(() => {
    const g = new Map<string, Map<string, Agg>>();
    for (const r of filtered) {
      const sr = r.showroom || "(미지정)";
      const reps = splitReps(r.salesperson);
      const list = reps.length ? reps : ["(미지정)"];
      if (!g.has(sr)) g.set(sr, new Map());
      const nm = g.get(sr)!;
      for (const name of list) {
        const cur = nm.get(name) || { name, count: 0, supply: 0, contracts: [] };
        cur.count += 1;
        cur.supply += r.supply;
        cur.contracts.push(r);
        nm.set(name, cur);
      }
    }
    return Array.from(g.entries())
      .map(([showroom, nm]) => {
        const aggs = Array.from(nm.values()).sort((a, b) => b.supply - a.supply);
        return {
          showroom,
          aggs,
          count: aggs.reduce((s, a) => s + a.count, 0),
          supply: aggs.reduce((s, a) => s + a.supply, 0),
        };
      })
      .sort((a, b) => b.supply - a.supply);
  }, [filtered]);

  const totalSupply = groups.reduce((s, g) => s + g.supply, 0);
  const totalIncentive = groups.reduce(
    (s, g) => s + g.aggs.reduce((ss, a) => ss + incentiveOfAgg(g.showroom, a), 0),
    0
  );
  const distinctPeople = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => g.aggs.forEach((a) => set.add(a.name)));
    return set.size;
  }, [groups]);

  if (rows.length === 0) {
    return <EmptyState>계약완료 + 계약금 입금된 계약이 없습니다.</EmptyState>;
  }

  return (
    <div>
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
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setOpen(null);
            }}
            className="input w-auto py-1"
            aria-label="시작일"
          />
          <span>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setOpen(null);
            }}
            className="input w-auto py-1"
            aria-label="종료일"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline ml-1"
            >
              날짜 초기화
            </button>
          )}
        </div>
        <div className="card px-4 py-2">
          <span className="text-xs text-slate-400">전시장 </span>
          <span className="font-bold text-slate-800 tabular-nums">{groups.length}</span>
          <span className="text-xs text-slate-400">곳 · 영업사원 </span>
          <span className="font-bold text-slate-800 tabular-nums">{distinctPeople}</span>
          <span className="text-xs text-slate-400">명 · 공급가액 </span>
          <span className="font-bold text-slate-800 tabular-nums">{fmtMan(totalSupply)}</span>
          <span className="text-xs text-slate-400">만원</span>
        </div>
        <div className="card px-4 py-2 ml-auto">
          <span className="text-xs text-slate-400">인센티브 총액 </span>
          <span className="font-bold text-emerald-600 tabular-nums">{fmtWon(totalIncentive)}</span>
          <span className="text-xs text-slate-400">원</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="th">영업사원</th>
                <th className="th text-right">계약 건수</th>
                <th className="th text-right">공급가액 합계</th>
                <th className="th text-center">기본 요율(%)</th>
                <th className="th text-right">인센티브(원)</th>
                <th className="th text-center">지급여부</th>
                <th className="th">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g) => {
                const groupIncentive = g.aggs.reduce(
                  (s, a) => s + incentiveOfAgg(g.showroom, a),
                  0
                );
                return (
                  <Fragment key={g.showroom}>
                    {/* 전시장 그룹 헤더 */}
                    <tr className="bg-brand-50/60 border-y border-brand-100">
                      <td className="td font-bold text-brand-700" colSpan={2}>
                        🏬 {g.showroom}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {g.count}건 · 영업 {g.aggs.length}명
                        </span>
                      </td>
                      <td className="td text-right tabular-nums font-semibold text-slate-700">
                        {fmtMan(g.supply)}
                      </td>
                      <td className="td"></td>
                      <td className="td text-right tabular-nums font-bold text-emerald-600">
                        {fmtWon(groupIncentive)}
                      </td>
                      <td className="td text-center text-xs text-slate-400">
                        {g.aggs.filter((a) => paidOf(g.showroom, a.name)).length}/{g.aggs.length} 지급
                      </td>
                      <td className="td"></td>
                    </tr>

                    {g.aggs.map((a) => {
                      const rowKey = `${g.showroom}::${a.name}`;
                      const isOpen = open === rowKey;
                      const paid = paidOf(g.showroom, a.name);
                      return (
                        <Fragment key={rowKey}>
                          <tr className={`hover:bg-slate-50/60 ${isOpen ? "bg-brand-50/30" : ""}`}>
                            <td className="td pl-6">
                              <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : rowKey)}
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
                            <td className="td text-right tabular-nums">{a.count}건</td>
                            <td className="td text-right tabular-nums">{fmtMan(a.supply)}</td>
                            <td className="td text-center">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={baseRateOf(g.showroom, a.name)}
                                onChange={(e) =>
                                  setRateKey(`${g.showroom}::${a.name}`, Number(e.target.value))
                                }
                                className="input w-20 text-right py-1"
                              />
                            </td>
                            <td className="td text-right tabular-nums font-semibold text-emerald-600">
                              {fmtWon(incentiveOfAgg(g.showroom, a))}
                            </td>
                            <td className="td text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={paid}
                                  onChange={(e) => setPaidState(g.showroom, a.name, e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span
                                  className={`ml-1.5 text-xs ${
                                    paid ? "text-emerald-600 font-medium" : "text-slate-400"
                                  }`}
                                >
                                  {paid ? "지급완료" : "미지급"}
                                </span>
                              </label>
                            </td>
                            <td className="td">
                              <input
                                type="text"
                                value={memoOf(g.showroom, a.name)}
                                onChange={(e) => setMemo(g.showroom, a.name, e.target.value)}
                                placeholder="메모"
                                className="input py-1 min-w-[140px]"
                              />
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/70 px-4 py-3">
                                <div className="text-xs font-semibold text-slate-500 mb-2">
                                  {g.showroom} · {a.name} · 계약 {a.count}건 (계약건별 요율 개별 조정 가능)
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[860px] text-sm bg-white rounded-lg overflow-hidden border border-slate-200">
                                    <thead className="bg-slate-100/70 text-slate-500">
                                      <tr>
                                        <th className="px-3 py-1.5 text-left font-medium">계약번호</th>
                                        <th className="px-3 py-1.5 text-left font-medium">건축주</th>
                                        <th className="px-3 py-1.5 text-left font-medium">영업사원</th>
                                        <th className="px-3 py-1.5 text-right font-medium">공급가액</th>
                                        <th className="px-3 py-1.5 text-center font-medium">요율(%)</th>
                                        <th className="px-3 py-1.5 text-right font-medium">인센티브(원)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {a.contracts.map((c) => {
                                        const co = splitReps(c.salesperson).length > 1;
                                        const rate = contractRateOf(g.showroom, a.name, c.contractNo);
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
                                            <td className="px-3 py-1.5 whitespace-nowrap">
                                              {splitReps(c.salesperson).map((nm, i) => (
                                                <span key={nm + i}>
                                                  {i > 0 && <span className="text-slate-300">, </span>}
                                                  <span
                                                    className={
                                                      nm === a.name
                                                        ? "font-semibold text-brand-700"
                                                        : "text-slate-500"
                                                    }
                                                  >
                                                    {nm}
                                                  </span>
                                                </span>
                                              ))}
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                              {fmtMan(c.supply)}
                                            </td>
                                            <td className="px-3 py-1.5 text-center">
                                              <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={rate}
                                                onChange={(e) =>
                                                  setRateKey(
                                                    `${g.showroom}::${a.name}::${c.contractNo}`,
                                                    Number(e.target.value)
                                                  )
                                                }
                                                className="input w-16 text-right py-0.5"
                                              />
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600 font-medium">
                                              {fmtWon((c.supply * rate) / 100)}
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
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
              <tr>
                <td className="td font-bold text-slate-700">전체 합계</td>
                <td className="td"></td>
                <td className="td text-right tabular-nums font-semibold">{fmtMan(totalSupply)}</td>
                <td className="td"></td>
                <td className="td text-right tabular-nums font-bold text-emerald-600">
                  {fmtWon(totalIncentive)}
                </td>
                <td className="td"></td>
                <td className="td"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · <b>전시장별</b>로 그룹핑됩니다. 같은 영업사원이 여러 전시장에 계약이 있으면 전시장마다 나뉘며,
        요율도 전시장별로 조정할 수 있습니다.
        <br />· 공급가액 단위: 만원 · 인센티브는 <b>원 단위로 절삭 없이</b> 표시 · 인센티브 = Σ(계약 공급가액 × 요율)
        <br />· 영업사원 이름을 클릭하면 계약 목록이 펼쳐지며, 계약건별로 요율을 개별 조정할 수 있습니다.
        <br />· 요율·지급여부·메모는 세움os에 자동 저장되어 정산팀 전원이 함께 봅니다.
      </p>
    </div>
  );
}
