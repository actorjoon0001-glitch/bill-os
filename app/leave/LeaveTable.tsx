"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { Employee } from "@/lib/settlement";
import type { Leave } from "@/lib/hr";

const TYPES = ["연차", "월차", "반차", "특별"];
const STATUSES = ["대기", "승인", "반려"];
const TYPE_COLOR: Record<string, string> = {
  연차: "bg-blue-100 text-blue-700",
  월차: "bg-emerald-100 text-emerald-700",
  반차: "bg-violet-100 text-violet-700",
  특별: "bg-amber-100 text-amber-700",
};
const STATUS_COLOR: Record<string, string> = {
  대기: "bg-slate-200 text-slate-600",
  승인: "bg-emerald-100 text-emerald-700",
  반려: "bg-red-100 text-red-700",
};

const monthOf = (d: string) => (d || "").slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `lv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function LeaveTable({
  employees,
  initial,
}: {
  employees: Employee[];
  initial: Leave[];
}) {
  const [rows, setRows] = useState<Leave[]>(initial);
  const [month, setMonth] = useState("ALL");
  const [person, setPerson] = useState("ALL");

  // 입력 폼
  const [fEmail, setFEmail] = useState("");
  const [fType, setFType] = useState("연차");
  const [fDate, setFDate] = useState(todayStr());
  const [fReason, setFReason] = useState("");

  const post = (op: string, payload: object) =>
    fetch("/api/hr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "leave", op, ...payload }),
    }).catch(() => {});

  const add = () => {
    const emp = employees.find((e) => (e.email || "").toLowerCase() === fEmail.toLowerCase());
    if (!emp || !fDate) return;
    const row: Leave = {
      id: uid(),
      email: (emp.email || "").toLowerCase(),
      name: emp.name,
      type: fType,
      leave_date: fDate,
      reason: fReason.trim() || null,
      status: "대기",
      created_at: new Date().toISOString(),
    };
    setRows((r) => [row, ...r]);
    post("save", { row });
    setFReason("");
  };

  const setStatus = (id: string, status: string) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const row = rows.find((x) => x.id === id);
    if (row) post("save", { row: { ...row, status } });
  };

  const remove = (id: string) => {
    if (!confirm("이 내역을 삭제할까요?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    post("delete", { id });
  };

  const months = useMemo(
    () => Array.from(new Set(rows.map((r) => monthOf(r.leave_date)).filter(Boolean))).sort((a, b) => b.localeCompare(a)),
    [rows]
  );
  const people = useMemo(
    () => Array.from(new Set(rows.map((r) => r.name).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (month !== "ALL" && monthOf(r.leave_date) !== month) return false;
        if (person !== "ALL" && r.name !== person) return false;
        return true;
      }),
    [rows, month, person]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of filtered) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [filtered]);

  return (
    <div>
      {/* 입력 폼 */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">직원</div>
            <select className="input w-auto" value={fEmail} onChange={(e) => setFEmail(e.target.value)}>
              <option value="">선택</option>
              {employees
                .filter((e) => e.email)
                .map((e) => (
                  <option key={e.id} value={e.email}>
                    {e.name} ({e.team})
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">구분</div>
            <select className="input w-auto" value={fType} onChange={(e) => setFType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">사용일</div>
            <input type="date" className="input w-auto" value={fDate} onChange={(e) => setFDate(e.target.value)} />
          </label>
          <label className="text-sm flex-1 min-w-[180px]">
            <div className="text-xs text-slate-400 mb-0.5">사유</div>
            <input className="input w-full" placeholder="사유(선택)" value={fReason} onChange={(e) => setFReason(e.target.value)} />
          </label>
          <button onClick={add} disabled={!fEmail} className="btn-primary py-2 px-4 disabled:opacity-40">
            + 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="ALL">전체 기간</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="ALL">전체 직원</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="card px-4 py-2 text-sm ml-auto flex gap-3">
          {STATUSES.map((s) => (
            <span key={s}>
              <span className="text-xs text-slate-400">{s} </span>
              <span className="font-bold tabular-nums">{counts[s] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>등록된 내역이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="th">사용일</th>
                  <th className="th">직원</th>
                  <th className="th text-center">구분</th>
                  <th className="th">사유</th>
                  <th className="th text-center">상태</th>
                  <th className="th text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="td whitespace-nowrap text-slate-700">{r.leave_date}</td>
                    <td className="td whitespace-nowrap font-medium text-slate-800">{r.name}</td>
                    <td className="td text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${TYPE_COLOR[r.type] || "bg-slate-100 text-slate-600"}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="td text-slate-600">{r.reason || "-"}</td>
                    <td className="td text-center">
                      <select
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value)}
                        className={`input w-auto py-1 text-xs font-medium`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span className={`ml-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLOR[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="td text-center">
                      <button onClick={() => remove(r.id)} className="text-xs text-slate-400 hover:text-red-600">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · 등록·상태·삭제는 즉시 저장되어 경영지원팀 전원이 함께 봅니다.
      </p>
    </div>
  );
}
