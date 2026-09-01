"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { permitLabel, type EContractRow } from "@/lib/econtracts";

const fmtMan = (n: number) => n.toLocaleString("ko-KR");

// "2026-08-31" → "2026-08"
const monthOf = (date: string) => (date || "").slice(0, 7);
// "2026-08" → "2026년 8월"
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${y}년 ${Number(mo)}월` : m || "-";
};

type MonthAgg = { month: string; count: number; down: number; product: number };

export default function EContractsTable({ rows }: { rows: EContractRow[] }) {
  const [q, setQ] = useState("");
  const [showroom, setShowroom] = useState("ALL");
  const [month, setMonth] = useState("ALL");

  const showrooms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.showroom).filter(Boolean))).sort(),
    [rows]
  );

  // 월별 집계 (계약일 기준, 최신월 우선)
  const monthly = useMemo<MonthAgg[]>(() => {
    const m = new Map<string, MonthAgg>();
    for (const r of rows) {
      const key = monthOf(r.contractDate) || "(미지정)";
      const cur = m.get(key) || { month: key, count: 0, down: 0, product: 0 };
      cur.count += 1;
      cur.down += r.downPayment;
      cur.product += r.productTotal;
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (month !== "ALL" && monthOf(r.contractDate) !== month) return false;
      if (showroom !== "ALL" && r.showroom !== showroom) return false;
      if (q) {
        const t = `${r.contractNo} ${r.clientName} ${r.siteAddress} ${r.salesperson}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, showroom, month]);

  const sum = useMemo(
    () => ({
      count: filtered.length,
      down: filtered.reduce((s, r) => s + r.downPayment, 0),
      product: filtered.reduce((s, r) => s + r.productTotal, 0),
    }),
    [filtered]
  );

  if (rows.length === 0) {
    return <EmptyState>계약완료 + 계약금 입금된 계약이 없습니다.</EmptyState>;
  }

  return (
    <div>
      {/* 요약 (현재 필터 기준) */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <div className="text-xs text-slate-400">
            계약완료 건수{month !== "ALL" ? ` · ${monthLabel(month)}` : ""}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
            {sum.count.toLocaleString("ko-KR")}건
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400">계약금 합계</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">
            {fmtMan(sum.down)}
            <span className="text-sm font-medium text-slate-400"> 만원</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-400">제품합계 합계</div>
          <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
            {fmtMan(sum.product)}
            <span className="text-sm font-medium text-slate-400"> 만원</span>
          </div>
        </div>
      </div>

      {/* 월별 집계 */}
      <div className="card overflow-hidden mb-6">
        <div className="px-4 py-2.5 border-b border-slate-100 text-sm font-semibold text-slate-700">
          월별 집계 <span className="text-xs font-normal text-slate-400">(계약일 기준 · 단위: 만원)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="th">월</th>
                <th className="th text-right">건수</th>
                <th className="th text-right">계약금 합계</th>
                <th className="th text-right">제품합계 합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr
                className={`cursor-pointer hover:bg-slate-50/60 ${
                  month === "ALL" ? "bg-brand-50/50" : ""
                }`}
                onClick={() => setMonth("ALL")}
              >
                <td className="td font-medium">전체 기간</td>
                <td className="td text-right tabular-nums">{rows.length}건</td>
                <td className="td text-right tabular-nums text-emerald-600 font-medium">
                  {fmtMan(rows.reduce((s, r) => s + r.downPayment, 0))}
                </td>
                <td className="td text-right tabular-nums">
                  {fmtMan(rows.reduce((s, r) => s + r.productTotal, 0))}
                </td>
              </tr>
              {monthly.map((mm) => (
                <tr
                  key={mm.month}
                  className={`cursor-pointer hover:bg-slate-50/60 ${
                    month === mm.month ? "bg-brand-50/50" : ""
                  }`}
                  onClick={() => setMonth(mm.month)}
                >
                  <td className="td font-medium text-slate-700">{monthLabel(mm.month)}</td>
                  <td className="td text-right tabular-nums">{mm.count}건</td>
                  <td className="td text-right tabular-nums text-emerald-600 font-medium">
                    {fmtMan(mm.down)}
                  </td>
                  <td className="td text-right tabular-nums">{fmtMan(mm.product)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="input max-w-xs"
          placeholder="계약번호 / 건축주 / 현장주소 / 영업사원 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input w-auto"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="ALL">전체 기간</option>
          {monthly.map((mm) => (
            <option key={mm.month} value={mm.month}>
              {monthLabel(mm.month)} ({mm.count}건)
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={showroom}
          onChange={(e) => setShowroom(e.target.value)}
        >
          <option value="ALL">전시장 전체</option>
          {showrooms.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-slate-400">
          {filtered.length}건 · 단위: 만원
        </div>
      </div>

      {/* 계약 목록 */}
      {filtered.length === 0 ? (
        <EmptyState>조건에 맞는 계약이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="th">계약번호</th>
                  <th className="th">건축주 / 현장주소</th>
                  <th className="th">전시장 / 영업사원</th>
                  <th className="th text-center">인허가</th>
                  <th className="th text-right">제품합계</th>
                  <th className="th text-right">계약금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.contractNo} className="hover:bg-slate-50/60">
                    <td className="td whitespace-nowrap">
                      <div className="font-medium text-slate-800">{r.contractNo}</div>
                      <div className="text-xs text-slate-400">{r.contractDate}</div>
                    </td>
                    <td className="td">
                      <div className="font-medium text-slate-800">{r.clientName || "-"}</div>
                      <div className="text-xs text-slate-500">{r.siteAddress}</div>
                    </td>
                    <td className="td">
                      <div className="text-slate-700">{r.showroom || "-"}</div>
                      <div className="text-xs text-slate-500">{r.salesperson || "-"}</div>
                    </td>
                    <td className="td text-center">
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {permitLabel(r.permitType)}
                      </span>
                    </td>
                    <td className="td text-right font-semibold tabular-nums">
                      {fmtMan(r.productTotal)}
                    </td>
                    <td className="td text-right font-semibold tabular-nums text-emerald-600">
                      {fmtMan(r.downPayment)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
