"use client";

import { useState } from "react";
import { formatKRW, formatWon } from "@/lib/finance";
import { EmptyState } from "@/components/ui";

type Bucket = {
  key: string;
  label: string;
  gross: number;
  supply: number;
  vat: number;
  count: number;
};

export default function RevenueView({
  weeks,
  months,
}: {
  weeks: Bucket[];
  months: Bucket[];
}) {
  const [tab, setTab] = useState<"month" | "week">("month");
  const data = tab === "month" ? months : weeks;
  const max = Math.max(1, ...data.map((d) => d.gross));
  const total = data.reduce((s, d) => s + d.gross, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
          <button
            onClick={() => setTab("month")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md ${
              tab === "month" ? "bg-brand-600 text-white" : "text-slate-600"
            }`}
          >
            월 단위
          </button>
          <button
            onClick={() => setTab("week")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md ${
              tab === "week" ? "bg-brand-600 text-white" : "text-slate-600"
            }`}
          >
            주 단위
          </button>
        </div>
        <div className="ml-auto text-sm text-slate-500">
          표시 기간 합계 <span className="font-semibold text-slate-800">{formatKRW(total)}</span>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState>수납된 매출이 없습니다.</EmptyState>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* 막대 */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4">
              {tab === "month" ? "월별" : "주별"} 매출
            </h3>
            <div className="space-y-2">
              {[...data].reverse().map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <div className="w-28 text-xs text-slate-500 shrink-0 truncate" title={d.label}>
                    {tab === "month" ? d.key : d.label}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(4, (d.gross / max) * 100)}%` }}
                    >
                      <span className="text-[10px] font-medium text-white tabular-nums">
                        {formatWon(d.gross)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 표 */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="th">기간</th>
                    <th className="th text-right">공급가액</th>
                    <th className="th text-right">부가세</th>
                    <th className="th text-right">합계</th>
                    <th className="th text-right">건수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((d) => (
                    <tr key={d.key} className="hover:bg-slate-50/60">
                      <td className="td whitespace-nowrap" title={d.label}>
                        {tab === "month" ? d.key : d.label.split(" ")[0]}
                      </td>
                      <td className="td text-right tabular-nums">{formatWon(d.supply)}</td>
                      <td className="td text-right tabular-nums text-slate-500">{formatWon(d.vat)}</td>
                      <td className="td text-right tabular-nums font-semibold">{formatWon(d.gross)}</td>
                      <td className="td text-right tabular-nums text-slate-400">{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
