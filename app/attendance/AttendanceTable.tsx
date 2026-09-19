"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui";
import type { PlatformAttendance } from "@/lib/hr";

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
  ganghwa: "강화",
  gwangju: "광주",
  andong: "안동",
};
const srLabel = (s: string) => SHOWROOM[s] || s || "-";

// status/근무상태 라벨·색
const statusMeta = (r: PlatformAttendance): { label: string; cls: string } => {
  if (r.status === "finished" || r.check_out) return { label: "퇴근", cls: "bg-slate-200 text-slate-600" };
  if (r.status === "working" || r.status === "before" || r.check_in)
    return { label: "근무중", cls: "bg-emerald-100 text-emerald-700" };
  return { label: r.status || "-", cls: "bg-slate-100 text-slate-500" };
};

export default function AttendanceTable({
  rows,
  date,
}: {
  rows: PlatformAttendance[];
  date: string;
}) {
  const router = useRouter();
  const [team, setTeam] = useState("ALL");
  const [q, setQ] = useState("");

  const teams = useMemo(
    () => Array.from(new Set(rows.map((r) => r.team).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (team !== "ALL" && r.team !== team) return false;
      if (kw && !`${r.user_name} ${r.team} ${srLabel(r.showroom)}`.toLowerCase().includes(kw))
        return false;
      return true;
    });
  }, [rows, team, q]);

  const stat = useMemo(() => {
    let working = 0,
      finished = 0,
      late = 0;
    for (const r of filtered) {
      if (r.status === "finished" || r.check_out) finished += 1;
      else working += 1;
      if (r.is_late) late += 1;
    }
    return { total: filtered.length, working, finished, late };
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
        <div className="card px-4 py-2 text-sm ml-auto flex gap-3">
          <span>
            <span className="text-xs text-slate-400">출근 </span>
            <span className="font-bold tabular-nums text-slate-800">{stat.total}</span>
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>해당 날짜의 출근 기록이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="th">이름</th>
                  <th className="th">팀</th>
                  <th className="th">전시장</th>
                  <th className="th text-center">출근</th>
                  <th className="th text-center">퇴근</th>
                  <th className="th text-right">근무시간</th>
                  <th className="th text-center">상태</th>
                  <th className="th">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const st = statusMeta(r);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="td font-medium text-slate-800 whitespace-nowrap">
                        {r.user_name || "-"}
                      </td>
                      <td className="td text-slate-500 whitespace-nowrap">{r.team || "-"}</td>
                      <td className="td text-slate-500 whitespace-nowrap">{srLabel(r.showroom)}</td>
                      <td className="td text-center tabular-nums whitespace-nowrap">
                        {fmtKST(r.check_in) || "-"}
                        {r.is_late && (
                          <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">
                            지각
                          </span>
                        )}
                      </td>
                      <td className="td text-center tabular-nums whitespace-nowrap">
                        {fmtKST(r.check_out) || "-"}
                      </td>
                      <td className="td text-right tabular-nums whitespace-nowrap text-slate-600">
                        {fmtDur(r.work_minutes) || "-"}
                      </td>
                      <td className="td text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="td text-slate-600">{r.note || r.memo || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        · 세움 플랫폼의 출·퇴근 버튼으로 기록된 실제 근태입니다(읽기 전용). 시간은 한국시간(KST) 기준.
      </p>
    </div>
  );
}
