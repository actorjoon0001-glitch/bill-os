"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import type { Employee } from "@/lib/settlement";
import type { Attendance } from "@/lib/hr";

const STATUSES = ["출근", "지각", "외근", "반차", "연차", "결근"];
const STATUS_COLOR: Record<string, string> = {
  출근: "text-emerald-600",
  지각: "text-amber-600",
  외근: "text-sky-600",
  반차: "text-violet-600",
  연차: "text-blue-600",
  결근: "text-red-600",
};

export default function AttendanceTable({
  employees,
  initial,
  date,
  currentUser,
}: {
  employees: Employee[];
  initial: Record<string, Attendance>;
  date: string;
  currentUser: string;
}) {
  const router = useRouter();
  const [rec, setRec] = useState<Record<string, Attendance>>(initial);
  const [q, setQ] = useState("");

  const save = (emp: Employee, patch: Partial<Attendance>) => {
    const e = (emp.email || "").toLowerCase();
    if (!e) return;
    const cur = rec[e] || {
      id: `${e}::${date}`,
      email: e,
      name: emp.name,
      date,
      status: "",
    };
    const next: Attendance = { ...cur, ...patch, id: `${e}::${date}`, email: e, name: emp.name, date };
    setRec((m) => ({ ...m, [e]: next }));
    fetch("/api/hr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "attendance", row: next }),
    }).catch(() => {});
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return kw
      ? employees.filter((emp) =>
          `${emp.name} ${emp.team} ${emp.position_name ?? ""}`.toLowerCase().includes(kw)
        )
      : employees;
  }, [employees, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const emp of employees) {
      const st = rec[(emp.email || "").toLowerCase()]?.status;
      if (st) c[st] = (c[st] || 0) + 1;
    }
    return c;
  }, [employees, rec]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => router.push(`/attendance?date=${e.target.value}`)}
          className="input w-auto"
          aria-label="근태 일자"
        />
        <input
          className="input max-w-xs"
          placeholder="이름 / 팀 / 직급 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="card px-4 py-2 text-sm flex flex-wrap gap-x-3 gap-y-1">
          {STATUSES.map((s) => (
            <span key={s}>
              <span className="text-xs text-slate-400">{s} </span>
              <span className={`font-bold tabular-nums ${STATUS_COLOR[s]}`}>{counts[s] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>직원이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="th">이름</th>
                  <th className="th">팀</th>
                  <th className="th text-center">근태 상태</th>
                  <th className="th text-center">출근</th>
                  <th className="th text-center">퇴근</th>
                  <th className="th">메모</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => {
                  const e = (emp.email || "").toLowerCase();
                  const r = rec[e];
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60">
                      <td className="td font-medium text-slate-800 whitespace-nowrap">
                        {emp.name}
                        {emp.position_name && (
                          <span className="ml-1 text-xs text-slate-400">{emp.position_name}</span>
                        )}
                      </td>
                      <td className="td text-slate-500 whitespace-nowrap">{emp.team}</td>
                      <td className="td text-center">
                        <select
                          value={r?.status || ""}
                          disabled={!emp.email}
                          onChange={(ev) => save(emp, { status: ev.target.value })}
                          className={`input w-auto py-1 text-sm font-medium ${
                            r?.status ? STATUS_COLOR[r.status] : "text-slate-400"
                          }`}
                        >
                          <option value="">미기록</option>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="td text-center">
                        <input
                          type="time"
                          value={r?.check_in || ""}
                          disabled={!emp.email}
                          onChange={(ev) => save(emp, { check_in: ev.target.value })}
                          className="input w-auto py-1 text-sm"
                        />
                      </td>
                      <td className="td text-center">
                        <input
                          type="time"
                          value={r?.check_out || ""}
                          disabled={!emp.email}
                          onChange={(ev) => save(emp, { check_out: ev.target.value })}
                          className="input w-auto py-1 text-sm"
                        />
                      </td>
                      <td className="td">
                        <input
                          value={r?.memo || ""}
                          disabled={!emp.email}
                          onChange={(ev) => save(emp, { memo: ev.target.value })}
                          placeholder="메모"
                          className="input py-1 w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · 상태·시간·메모는 변경 즉시 저장되어 경영지원팀 전원이 함께 봅니다.
        {currentUser && <> · 접속: {currentUser}</>}
      </p>
    </div>
  );
}
