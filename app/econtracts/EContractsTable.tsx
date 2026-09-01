"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import { permitLabel, type EContractRow } from "@/lib/econtracts";

const fmtMan = (n: number) => n.toLocaleString("ko-KR");

export default function EContractsTable({ rows }: { rows: EContractRow[] }) {
  const [q, setQ] = useState("");
  const [showroom, setShowroom] = useState("ALL");

  const showrooms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.showroom).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (showroom !== "ALL" && r.showroom !== showroom) return false;
      if (q) {
        const t = `${r.contractNo} ${r.clientName} ${r.siteAddress} ${r.salesperson}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, q, showroom]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="input max-w-xs"
          placeholder="계약번호 / 건축주 / 현장주소 / 영업사원 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
