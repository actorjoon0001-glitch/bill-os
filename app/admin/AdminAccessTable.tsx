"use client";

import { Fragment, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { Employee } from "@/lib/settlement";

type Mode = "default" | "allow" | "block";

export default function AdminAccessTable({
  employees,
  access,
  adminEmails,
  allowedTeams,
}: {
  employees: Employee[];
  access: Record<string, boolean>;
  adminEmails: string[];
  allowedTeams: string[];
}) {
  const [acc, setAcc] = useState<Record<string, boolean>>(access);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const isAdminEmail = (email: string) => adminEmails.includes((email || "").toLowerCase());

  // 직원별 실제 접근 허용 여부
  const effectiveAllowed = (emp: Employee) => {
    const e = (emp.email || "").toLowerCase();
    if (isAdminEmail(e)) return true;
    if (acc[e] !== undefined) return acc[e];
    return emp.status === "approved" && allowedTeams.includes(emp.team);
  };
  // 현재 설정 모드
  const modeOf = (emp: Employee): Mode => {
    const e = (emp.email || "").toLowerCase();
    if (acc[e] === true) return "allow";
    if (acc[e] === false) return "block";
    return "default";
  };

  const save = async (emp: Employee, mode: Mode) => {
    const e = (emp.email || "").toLowerCase();
    if (!e) return;
    const prev = { ...acc };
    // 낙관적 업데이트
    setAcc((cur) => {
      const next = { ...cur };
      if (mode === "default") delete next[e];
      else next[e] = mode === "allow";
      return next;
    });
    setSaving((s) => ({ ...s, [e]: true }));
    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, mode }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setAcc(prev); // 실패 시 원복
      alert("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving((s) => ({ ...s, [e]: false }));
    }
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = kw
      ? employees.filter((emp) =>
          `${emp.name} ${emp.email} ${emp.team} ${emp.position_name ?? ""}`
            .toLowerCase()
            .includes(kw)
        )
      : employees;
    return list;
  }, [employees, q]);

  // 팀별 그룹 (허용 팀 먼저)
  const groups = useMemo(() => {
    const map = new Map<string, Employee[]>();
    for (const emp of filtered) {
      const t = emp.team || "(미지정)";
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(emp);
    }
    const teams = Array.from(map.keys()).sort((a, b) => {
      const ai = allowedTeams.includes(a) ? 0 : 1;
      const bi = allowedTeams.includes(b) ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return a.localeCompare(b, "ko");
    });
    return teams.map((t) => ({ team: t, list: map.get(t)! }));
  }, [filtered, allowedTeams]);

  const allowedCount = useMemo(
    () => employees.filter((emp) => effectiveAllowed(emp)).length,
    [employees, acc]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="이름 / 이메일 / 팀 / 직급 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="card px-4 py-2 text-sm">
          <span className="text-xs text-slate-400">전체 </span>
          <span className="font-bold text-slate-800 tabular-nums">{employees.length}</span>
          <span className="text-xs text-slate-400">명 · 접근 허용 </span>
          <span className="font-bold text-emerald-600 tabular-nums">{allowedCount}</span>
          <span className="text-xs text-slate-400">명</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>조건에 맞는 직원이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="th">이름</th>
                  <th className="th">직급</th>
                  <th className="th">이메일</th>
                  <th className="th text-center">현재 접근</th>
                  <th className="th text-center">권한 설정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <Fragment key={g.team}>
                    <tr className="bg-brand-50/60 border-y border-brand-100">
                      <td className="td font-bold text-brand-700" colSpan={5}>
                        {g.team}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          {g.list.length}명
                          {allowedTeams.includes(g.team) && (
                            <span className="ml-1 text-emerald-600">· 기본 허용 팀</span>
                          )}
                        </span>
                      </td>
                    </tr>
                    {g.list.map((emp) => {
                      const e = (emp.email || "").toLowerCase();
                      const admin = isAdminEmail(e);
                      const allowed = effectiveAllowed(emp);
                      const mode = modeOf(emp);
                      const busy = Boolean(saving[e]);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60">
                          <td className="td font-medium text-slate-800">{emp.name || "-"}</td>
                          <td className="td text-slate-500">{emp.position_name || "-"}</td>
                          <td className="td text-slate-500">{emp.email || "-"}</td>
                          <td className="td text-center">
                            {admin ? (
                              <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                                관리자
                              </span>
                            ) : allowed ? (
                              <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                허용
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                                차단
                              </span>
                            )}
                          </td>
                          <td className="td text-center">
                            {admin ? (
                              <span className="text-xs text-slate-400">항상 허용</span>
                            ) : !emp.email ? (
                              <span className="text-xs text-slate-300">이메일 없음</span>
                            ) : (
                              <select
                                value={mode}
                                disabled={busy}
                                onChange={(ev) => save(emp, ev.target.value as Mode)}
                                className="input w-auto py-1 text-sm"
                              >
                                <option value="default">
                                  기본 ({allowedTeams.includes(emp.team) && emp.status === "approved" ? "허용" : "차단"})
                                </option>
                                <option value="allow">허용</option>
                                <option value="block">차단</option>
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · <b>기본</b>: 팀 규칙 적용(정산·경영팀 승인자만 허용). <b>허용/차단</b>: 팀과 무관하게 개별 지정.
        <br />· 설정은 즉시 저장되며 다음 로그인부터 적용됩니다. 관리자 이메일은 항상 허용됩니다.
      </p>
    </div>
  );
}
