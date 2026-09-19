"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import type { PlatformAttendance } from "@/lib/hr";
import type { Employee } from "@/lib/settlement";

// KST(UTC+9) 시:분
const fmtKST = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${String(k.getUTCHours()).padStart(2, "0")}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
};
const fmtDur = (min: number | null) => {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
};
const SHOWROOM: Record<string, string> = {
  headquarters: "본사",
  ganghwa: "강화전시장",
  gwangju: "광주전시장",
  andong: "안동전시장",
  showroom1: "1전시장",
  showroom2: "2전시장",
  showroom3: "3전시장",
  showroom4: "4전시장",
};
const srLabel = (s: string) => {
  if (SHOWROOM[s]) return SHOWROOM[s];
  const m = /^showroom(\d+)$/i.exec(s || "");
  if (m) return `${m[1]}전시장`;
  return s || "-";
};

type Entry = {
  key: string;
  name: string;
  team: string;
  showroom: string;
  att: PlatformAttendance | null;
};

const statusMeta = (att: PlatformAttendance | null): { label: string; cls: string } => {
  if (!att) return { label: "미출근", cls: "bg-slate-100 text-slate-400" };
  if (att.status === "finished" || att.check_out) return { label: "퇴근", cls: "bg-slate-200 text-slate-600" };
  return { label: "근무중", cls: "bg-emerald-100 text-emerald-700" };
};

export default function AttendanceTable({
  rows,
  employees,
  date,
}: {
  rows: PlatformAttendance[];
  employees: Employee[];
  date: string;
}) {
  const router = useRouter();
  const [team, setTeam] = useState("ALL");
  const [q, setQ] = useState("");
  const [showAbsent, setShowAbsent] = useState(true);

  // 직원 + 출근기록 병합 (미출근 포함)
  const entries = useMemo<Entry[]>(() => {
    const byEmpId = new Map<number, PlatformAttendance>();
    const byUserId = new Map<string, PlatformAttendance>();
    const byName = new Map<string, PlatformAttendance>();
    for (const r of rows) {
      if (r.employee_id != null) byEmpId.set(r.employee_id, r);
      if (r.user_id) byUserId.set(r.user_id, r);
      if (r.user_name) byName.set(r.user_name, r);
    }
    const usedAttIds = new Set<string>();
    const list: Entry[] = [];
    for (const emp of employees) {
      if (emp.status === "blocked") continue; // 퇴사/차단 제외
      const att =
        byEmpId.get(emp.id) ||
        (emp.auth_user_id ? byUserId.get(emp.auth_user_id) : undefined) ||
        byName.get(emp.name) ||
        null;
      if (att) usedAttIds.add(att.id);
      list.push({
        key: `emp-${emp.id}`,
        name: emp.name,
        team: emp.team || (att?.team ?? ""),
        showroom: emp.showroom || (att?.showroom ?? ""),
        att,
      });
    }
    // 직원 목록에 없는 출근기록도 누락 없이 추가
    for (const r of rows) {
      if (!usedAttIds.has(r.id)) {
        list.push({
          key: `att-${r.id}`,
          name: r.user_name || "-",
          team: r.team || "",
          showroom: r.showroom || "",
          att: r,
        });
      }
    }
    return list;
  }, [rows, employees]);

  const teams = useMemo(
    () => Array.from(new Set(entries.map((e) => e.team).filter(Boolean))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (!showAbsent && !e.att) return false;
      if (team !== "ALL" && e.team !== team) return false;
      if (kw && !`${e.name} ${e.team} ${srLabel(e.showroom)}`.toLowerCase().includes(kw)) return false;
      return true;
    });
    // 출근한 사람 먼저(출근시각 순), 미출근 뒤(이름 순)
    return list.sort((a, b) => {
      if (!!a.att !== !!b.att) return a.att ? -1 : 1;
      if (a.att && b.att) return (a.att.check_in || "").localeCompare(b.att.check_in || "");
      return a.name.localeCompare(b.name, "ko");
    });
  }, [entries, team, q, showAbsent]);

  const stat = useMemo(() => {
    let present = 0,
      working = 0,
      finished = 0,
      late = 0,
      absent = 0;
    for (const e of entries) {
      if (team !== "ALL" && e.team !== team) continue;
      if (e.att) {
        present += 1;
        if (e.att.status === "finished" || e.att.check_out) finished += 1;
        else working += 1;
        if (e.att.is_late) late += 1;
      } else {
        absent += 1;
      }
    }
    return { present, working, finished, late, absent };
  }, [entries, team]);

  // 전시장별 그룹 (본사 → 1~4전시장 → 강화/광주/안동 → 기타)
  const srRank = (name: string) => {
    if (name === "본사") return 0;
    const m = /^(\d+)전시장$/.exec(name);
    if (m) return 10 + Number(m[1]);
    const order = ["강화전시장", "광주전시장", "안동전시장"];
    const i = order.indexOf(name);
    if (i >= 0) return 100 + i;
    return 500;
  };
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const key = srLabel(e.showroom);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries())
      .map(([showroom, list]) => {
        const present = list.filter((e) => e.att).length;
        return { showroom, list, present, absent: list.length - present };
      })
      .sort((a, b) => srRank(a.showroom) - srRank(b.showroom) || a.showroom.localeCompare(b.showroom, "ko"));
  }, [filtered]);

  const shiftDate = (days: number) => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    router.push(`/attendance?date=${d.toISOString().slice(0, 10)}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => shiftDate(-1)} className="btn-ghost px-2 py-1 text-slate-500" title="이전 날짜">
          ◀
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => router.push(`/attendance?date=${e.target.value}`)}
          className="input w-auto"
          aria-label="근태 일자"
        />
        <button onClick={() => shiftDate(1)} className="btn-ghost px-2 py-1 text-slate-500" title="다음 날짜">
          ▶
        </button>
        <select className="input w-auto" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="ALL">팀 전체</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="input max-w-[180px]"
          placeholder="이름 / 팀 / 전시장 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAbsent}
            onChange={(e) => setShowAbsent(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          미출근 포함
        </label>
        <div className="card px-4 py-2 text-sm ml-auto flex flex-wrap gap-x-3 gap-y-1">
          <span>
            <span className="text-xs text-slate-400">출근 </span>
            <span className="font-bold tabular-nums text-slate-800">{stat.present}</span>
          </span>
          <span>
            <span className="text-xs text-slate-400">근무중 </span>
            <span className="font-bold tabular-nums text-emerald-600">{stat.working}</span>
          </span>
          <span>
            <span className="text-xs text-slate-400">퇴근 </span>
            <span className="font-bold tabular-nums text-slate-500">{stat.finished}</span>
          </span>
          <span>
            <span className="text-xs text-slate-400">지각 </span>
            <span className="font-bold tabular-nums text-amber-600">{stat.late}</span>
          </span>
          <span>
            <span className="text-xs text-slate-400">미출근 </span>
            <span className="font-bold tabular-nums text-red-500">{stat.absent}</span>
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>표시할 직원이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="th">이름</th>
                  <th className="th">팀</th>
                  <th className="th text-center">출근</th>
                  <th className="th text-center">퇴근</th>
                  <th className="th text-right">근무시간</th>
                  <th className="th text-center">상태</th>
                  <th className="th">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map((g) => (
                  <Fragment key={g.showroom}>
                    <tr className="bg-brand-50/60 border-y border-brand-100">
                      <td className="td font-bold text-brand-700" colSpan={7}>
                        🏬 {g.showroom}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          출근 {g.present} · 미출근 {g.absent} · 총 {g.list.length}명
                        </span>
                      </td>
                    </tr>
                    {g.list.map((e) => {
                      const att = e.att;
                      const st = statusMeta(att);
                      return (
                        <tr key={e.key} className={`hover:bg-slate-50/60 ${!att ? "bg-slate-50/40" : ""}`}>
                          <td className={`td font-medium whitespace-nowrap pl-6 ${att ? "text-slate-800" : "text-slate-400"}`}>
                            {e.name || "-"}
                          </td>
                          <td className="td text-slate-500 whitespace-nowrap">{e.team || "-"}</td>
                          <td className="td text-center tabular-nums whitespace-nowrap">
                            {att ? fmtKST(att.check_in) || "-" : "-"}
                            {att?.is_late && (
                              <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">지각</span>
                            )}
                          </td>
                          <td className="td text-center tabular-nums whitespace-nowrap">
                            {att ? fmtKST(att.check_out) || "-" : "-"}
                          </td>
                          <td className="td text-right tabular-nums whitespace-nowrap text-slate-600">
                            {att ? fmtDur(att.work_minutes) || "-" : "-"}
                          </td>
                          <td className="td text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${st.cls}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="td text-slate-600">{att ? att.note || att.memo || "-" : "-"}</td>
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
        · 세움 플랫폼 출·퇴근 기록 기준(읽기 전용) · 시간은 한국시간(KST) · 출근 기록이 없는 재직 직원은 &lsquo;미출근&rsquo;으로 표시됩니다.
      </p>
    </div>
  );
}
