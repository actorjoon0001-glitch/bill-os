"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatKRW, toDateStr } from "@/lib/finance";
import { SourceBadge, StatusBadge, TaxBadge, EmptyState } from "@/components/ui";

type Row = {
  id: string;
  contractNo: string;
  title: string;
  clientName: string;
  source: string;
  taxType: string;
  status: string;
  totalAmount: number;
  contractDate: string;
  received: number;
  outstanding: number;
  installmentCount: number;
  receivedCount: number;
};

export default function ContractsTable({ contracts }: { contracts: Row[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (source !== "ALL" && c.source !== source) return false;
      if (status !== "ALL" && c.status !== status) return false;
      if (q) {
        const t = `${c.contractNo} ${c.title} ${c.clientName}`.toLowerCase();
        if (!t.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [contracts, q, source, status]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="input max-w-xs"
          placeholder="계약번호 / 계약명 / 거래처 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="ALL">전체 종류</option>
          <option value="ELECTRONIC">전자</option>
          <option value="MANUAL">수기</option>
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">전체 상태</option>
          <option value="ACTIVE">진행중</option>
          <option value="COMPLETED">완납</option>
          <option value="CANCELED">해지</option>
        </select>
        <div className="ml-auto text-sm text-slate-400">{filtered.length}건</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>조건에 맞는 계약이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="th">계약번호</th>
                  <th className="th">계약명 / 거래처</th>
                  <th className="th">종류</th>
                  <th className="th text-right">계약금액</th>
                  <th className="th text-right">수납 / 미수</th>
                  <th className="th text-center">수납 진행</th>
                  <th className="th">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const pct =
                    c.installmentCount > 0
                      ? Math.round((c.receivedCount / c.installmentCount) * 100)
                      : 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="td whitespace-nowrap">
                        <Link href={`/contracts/${c.id}`} className="font-medium text-brand-600 hover:underline">
                          {c.contractNo}
                        </Link>
                        <div className="text-xs text-slate-400">{toDateStr(c.contractDate)}</div>
                      </td>
                      <td className="td">
                        <Link href={`/contracts/${c.id}`} className="font-medium text-slate-800 hover:underline">
                          {c.title}
                        </Link>
                        <div className="text-xs text-slate-500">{c.clientName}</div>
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          <SourceBadge source={c.source} />
                          <TaxBadge taxType={c.taxType} />
                        </div>
                      </td>
                      <td className="td text-right font-semibold tabular-nums">
                        {formatKRW(c.totalAmount)}
                      </td>
                      <td className="td text-right tabular-nums">
                        <div className="text-emerald-600">{formatKRW(c.received)}</div>
                        {c.outstanding > 0 && (
                          <div className="text-xs text-amber-600">미수 {formatKRW(c.outstanding)}</div>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[60px]">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 tabular-nums w-14 text-right">
                            {c.receivedCount}/{c.installmentCount}회
                          </span>
                        </div>
                      </td>
                      <td className="td">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
