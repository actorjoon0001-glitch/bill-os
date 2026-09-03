"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui";
import { permitLabel, type EContractRow } from "@/lib/econtracts";

const fmtMan = (n: number) => n.toLocaleString("ko-KR");
const fmtWon = (man: number) => Math.round(man * 10000).toLocaleString("ko-KR"); // 만원 → 원
const monthOf = (date: string) => (date || "").slice(0, 7);
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${y}년 ${Number(mo)}월` : m || "-";
};

// 정산팀 직접 입력 항목 (계약번호별, 세움os Supabase 공유 저장)
type Manual = {
  balance?: string | null;
  evidence?: string | null;
  worker?: string | null;
  progress?: string | null;
  biz?: string | null;
  extra?: Record<string, { amt?: string; memo?: string }> | null;
};

// 돈 받을 때마다 기입하는 수납 항목 (금액 + 메모)
const PAYMENTS = [
  { key: "deposit", label: "계약금" },
  { key: "mid1", label: "중도금1" },
  { key: "mid2", label: "중도금2" },
  { key: "mid3", label: "중도금3" },
  { key: "add1", label: "추가금1" },
  { key: "add2", label: "추가금2" },
  { key: "remain", label: "남은 잔금" },
] as const;

type MonthAgg = { month: string; count: number; down: number; product: number };

export default function EContractsTable({
  rows,
  initialManual = {},
}: {
  rows: EContractRow[];
  initialManual?: Record<string, Manual>;
}) {
  const [q, setQ] = useState("");
  const [showroom, setShowroom] = useState("ALL");
  const [month, setMonth] = useState("ALL");
  const [manual, setManual] = useState<Record<string, Manual>>(initialManual);
  const [openNo, setOpenNo] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const num = (v: unknown) => {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const setField = (no: string, field: keyof Manual, value: string) => {
    setManual((prev) => {
      const nextRow = { ...(prev[no] || {}), [field]: value };
      const next = { ...prev, [no]: nextRow };
      // 디바운스 후 서버 저장(팀 공유)
      clearTimeout(timers.current[no]);
      timers.current[no] = setTimeout(() => {
        fetch("/api/sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractNo: no, patch: nextRow }),
        }).catch(() => {});
      }, 600);
      return next;
    });
  };

  // 수납 항목(중도금/추가금/잔금)의 금액·메모 저장
  const persistRow = (no: string, nextRow: Manual) => {
    clearTimeout(timers.current[no]);
    timers.current[no] = setTimeout(() => {
      fetch("/api/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractNo: no, patch: nextRow }),
      }).catch(() => {});
    }, 600);
  };
  const setExtra = (no: string, key: string, sub: "amt" | "memo", value: string) => {
    setManual((prev) => {
      const row = prev[no] || {};
      const extra = {
        ...(row.extra || {}),
        [key]: { ...((row.extra || {})[key] || {}), [sub]: value },
      };
      const nextRow: Manual = { ...row, extra };
      const next = { ...prev, [no]: nextRow };
      persistRow(no, nextRow);
      return next;
    });
  };

  const showrooms = useMemo(
    () => Array.from(new Set(rows.map((r) => r.showroom).filter(Boolean))).sort(),
    [rows]
  );

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
        const t = `${r.contractNo} ${r.clientName} ${r.siteAddress} ${r.salesperson} ${r.phone}`.toLowerCase();
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
          <div className="text-xs text-slate-400">계약금액 합계</div>
          <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
            {fmtMan(sum.product)}
            <span className="text-sm font-medium text-slate-400"> 만원</span>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          className="input max-w-xs"
          placeholder="계약번호 / 건축주 / 지역 / 영업사원 / 연락처 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
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
        <div className="ml-auto text-sm text-slate-400">{filtered.length}건 · 금액 단위: 원</div>
      </div>

      {/* 계약 목록 (관리 시트 양식) */}
      {filtered.length === 0 ? (
        <EmptyState>조건에 맞는 계약이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2800px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="th whitespace-nowrap">계약일</th>
                  <th className="th">건축주</th>
                  <th className="th whitespace-nowrap">계약평수</th>
                  <th className="th text-center">현장/이동</th>
                  <th className="th">지역</th>
                  <th className="th whitespace-nowrap">연락처</th>
                  <th className="th text-right">계약금액</th>
                  <th className="th text-right">잔액</th>
                  <th className="th">매출증빙</th>
                  <th className="th">담당작업자</th>
                  <th className="th">진행사항</th>
                  <th className="th">사업자명</th>
                  {PAYMENTS.map((p) => (
                    <th key={p.key} className="th text-right whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const m = manual[r.contractNo] || {};
                  const isOpen = openNo === r.contractNo;
                  return (
                    <Fragment key={r.contractNo}>
                    <tr className={`hover:bg-slate-50/40 align-top ${isOpen ? "bg-brand-50/40" : ""}`}>
                      <td className="td whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setOpenNo(isOpen ? null : r.contractNo)}
                          className="flex items-center gap-1.5 text-left"
                          title="계약 상세 열기"
                        >
                          <span
                            className={`inline-block transition-transform text-slate-400 ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          >
                            ▸
                          </span>
                          <span>
                            <span className="text-slate-700">{r.contractDate}</span>
                            <span className="block text-[11px] text-slate-400">{r.contractNo}</span>
                          </span>
                        </button>
                      </td>
                      <td className="td font-medium text-slate-800">{r.clientName || "-"}</td>
                      <td className="td text-slate-600 whitespace-nowrap">{r.pyeong || "-"}</td>
                      <td className="td text-center">
                        {r.moveType ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                              r.moveType === "이동"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {r.moveType}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="td text-slate-600 min-w-[180px]">{r.siteAddress || "-"}</td>
                      <td className="td text-slate-600 whitespace-nowrap">{r.phone || "-"}</td>
                      <td className="td text-right tabular-nums font-semibold whitespace-nowrap">
                        {fmtWon(r.productTotal)}
                      </td>
                      <td className="td">
                        <input
                          value={m.balance || ""}
                          onChange={(e) => setField(r.contractNo, "balance", e.target.value)}
                          placeholder="-"
                          className="input py-1 w-24 text-right"
                        />
                      </td>
                      <td className="td">
                        <textarea
                          value={m.evidence || ""}
                          onChange={(e) => setField(r.contractNo, "evidence", e.target.value)}
                          placeholder="세금계산서 발행 등"
                          rows={2}
                          className="input py-1 min-w-[180px] resize-y"
                        />
                      </td>
                      <td className="td">
                        <input
                          value={m.worker || ""}
                          onChange={(e) => setField(r.contractNo, "worker", e.target.value)}
                          placeholder="담당자"
                          className="input py-1 w-24"
                        />
                      </td>
                      <td className="td">
                        <textarea
                          value={m.progress || ""}
                          onChange={(e) => setField(r.contractNo, "progress", e.target.value)}
                          placeholder="진행사항"
                          rows={2}
                          className="input py-1 min-w-[150px] resize-y"
                        />
                      </td>
                      <td className="td">
                        <input
                          value={m.biz || ""}
                          onChange={(e) => setField(r.contractNo, "biz", e.target.value)}
                          placeholder="사업자명"
                          className="input py-1 w-28"
                        />
                      </td>
                      {PAYMENTS.map((p) => {
                        const cell = m.extra?.[p.key] || {};
                        return (
                          <td key={p.key} className="td">
                            <input
                              value={cell.amt || ""}
                              onChange={(e) => setExtra(r.contractNo, p.key, "amt", e.target.value)}
                              placeholder="금액"
                              className="input py-1 w-28 text-right"
                            />
                            <input
                              value={cell.memo || ""}
                              onChange={(e) => setExtra(r.contractNo, p.key, "memo", e.target.value)}
                              placeholder="메모(예: 8/14 입금)"
                              className="input py-1 w-36 mt-1 text-xs"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={19} className="bg-slate-50/70 px-5 py-4">
                          <div className="rounded-lg border border-slate-200 bg-white p-4 max-w-[1100px]">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-bold text-slate-800">{r.contractNo}</span>
                              <span className="text-xs text-slate-400">{r.contractDate}</span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                                계약완료
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {permitLabel(r.permitType)}
                              </span>
                            </div>

                            {/* 계약 정보 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-sm mb-4">
                              {[
                                ["건축주", r.clientName || "-"],
                                ["연락처", r.phone || "-"],
                                ["전시장", r.showroom || "-"],
                                ["영업사원", r.salesperson || "-"],
                                ["계약평수", r.pyeong || "-"],
                                ["현장/이동", r.moveType || "-"],
                                ["현장주소", r.siteAddress || "-"],
                              ].map(([k, v]) => (
                                <div key={k} className="flex gap-2">
                                  <span className="text-slate-400 shrink-0 w-16">{k}</span>
                                  <span className="text-slate-700">{v}</span>
                                </div>
                              ))}
                            </div>

                            {/* 금액 요약 (만원) */}
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                              {[
                                ["공급가액", r.supply],
                                ["부가세", r.vat],
                                ["계약 총액", r.productTotal],
                                ["계약금", r.downPayment],
                                ["중도금", r.interim],
                                ["잔금", r.balance],
                              ].map(([k, v]) => (
                                <div key={k as string} className="rounded-lg bg-slate-50 px-3 py-2">
                                  <div className="text-[11px] text-slate-400">{k}</div>
                                  <div className="text-sm font-semibold text-slate-800 tabular-nums">
                                    {fmtMan(v as number)}
                                    <span className="text-[10px] font-normal text-slate-400"> 만원</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* 주문내용 */}
                            {r.items.filter((it) => num(it.amount) > 0).length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-slate-500 mb-1">주문내용</div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                                    <thead className="bg-slate-100/70 text-slate-500">
                                      <tr>
                                        <th className="px-3 py-1.5 text-left font-medium">품목</th>
                                        <th className="px-3 py-1.5 text-center font-medium">단위</th>
                                        <th className="px-3 py-1.5 text-right font-medium">평수</th>
                                        <th className="px-3 py-1.5 text-right font-medium">금액(만원)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {r.items
                                        .filter((it) => num(it.amount) > 0)
                                        .map((it, i) => (
                                          <tr key={i}>
                                            <td className="px-3 py-1.5 text-slate-700">{it.name}</td>
                                            <td className="px-3 py-1.5 text-center text-slate-500">
                                              {it.unit || "-"}
                                            </td>
                                            <td className="px-3 py-1.5 text-right text-slate-500 tabular-nums">
                                              {it.area || "-"}
                                            </td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">
                                              {fmtMan(num(it.amount))}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · 계약일·건축주·계약평수·현장/이동·지역·연락처·계약금액은 전자계약서에서 자동 표시됩니다.
        <br />· 잔액·매출증빙·담당작업자·진행사항·사업자명·중도금/추가금/잔금은 직접 입력하며, 세움os에
        자동 저장되어 정산팀 전원이 함께 봅니다.
        <br />· 중도금1~3·추가금1·2·남은 잔금은 <b>돈 받을 때마다 금액과 메모(예: 8/14 입금)</b>를
        적을 수 있습니다.
      </p>
    </div>
  );
}
