"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { Employee } from "@/lib/settlement";
import type { Worklog } from "@/lib/hr";

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function WorklogTable({
  employees,
  initial,
  currentUser,
}: {
  employees: Employee[];
  initial: Worklog[];
  currentUser: string;
}) {
  const [rows, setRows] = useState<Worklog[]>(initial);
  const [fDate, setFDate] = useState(todayStr());
  const teams = useMemo(
    () => Array.from(new Set(employees.map((e) => e.team).filter(Boolean))).sort(),
    [employees]
  );
  const [fTeam, setFTeam] = useState("");
  const [fAuthor, setFAuthor] = useState(currentUser || "");
  const [fContent, setFContent] = useState("");
  const [fNote, setFNote] = useState("");

  // 필터
  const [flDate, setFlDate] = useState("");
  const [flTeam, setFlTeam] = useState("ALL");
  const [flAuthor, setFlAuthor] = useState("");

  const post = (op: string, payload: object) =>
    fetch("/api/hr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "worklog", op, ...payload }),
    }).catch(() => {});

  const add = () => {
    if (!fContent.trim()) return;
    const row: Worklog = {
      id: uid(),
      log_date: fDate,
      team: fTeam || "-",
      author: fAuthor.trim() || currentUser || "-",
      content: fContent.trim(),
      note: fNote.trim() || null,
      created_at: new Date().toISOString(),
    };
    setRows((r) => [row, ...r]);
    post("save", { row });
    setFContent("");
    setFNote("");
  };

  const remove = (id: string) => {
    if (!confirm("이 일지를 삭제할까요?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    post("delete", { id });
  };

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (flDate && r.log_date !== flDate) return false;
        if (flTeam !== "ALL" && r.team !== flTeam) return false;
        if (flAuthor && !r.author.toLowerCase().includes(flAuthor.toLowerCase())) return false;
        return true;
      }),
    [rows, flDate, flTeam, flAuthor]
  );

  return (
    <div>
      {/* 입력 폼 */}
      <div className="card p-4 mb-4">
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">날짜</div>
            <input type="date" className="input w-auto" value={fDate} onChange={(e) => setFDate(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">팀</div>
            <select className="input w-auto" value={fTeam} onChange={(e) => setFTeam(e.target.value)}>
              <option value="">팀 선택</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-400 mb-0.5">작성자</div>
            <input className="input w-auto" value={fAuthor} onChange={(e) => setFAuthor(e.target.value)} placeholder="작성자" />
          </label>
        </div>
        <textarea
          className="input w-full resize-y mb-2"
          rows={2}
          placeholder="업무 내용"
          value={fContent}
          onChange={(e) => setFContent(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="비고(선택)"
            value={fNote}
            onChange={(e) => setFNote(e.target.value)}
          />
          <button onClick={add} disabled={!fContent.trim()} className="btn-primary py-2 px-4 disabled:opacity-40">
            + 일지 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" className="input w-auto" value={flDate} onChange={(e) => setFlDate(e.target.value)} aria-label="날짜 필터" />
        <select className="input w-auto" value={flTeam} onChange={(e) => setFlTeam(e.target.value)}>
          <option value="ALL">팀 전체</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input className="input max-w-[160px]" placeholder="작성자 검색" value={flAuthor} onChange={(e) => setFlAuthor(e.target.value)} />
        {(flDate || flTeam !== "ALL" || flAuthor) && (
          <button
            onClick={() => {
              setFlDate("");
              setFlTeam("ALL");
              setFlAuthor("");
            }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            초기화
          </button>
        )}
        <div className="ml-auto text-sm text-slate-400">{filtered.length}건</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>등록된 업무일지가 없습니다.</EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-slate-700">{r.log_date}</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{r.team}</span>
                <span className="text-xs text-slate-500">{r.author}</span>
                <button onClick={() => remove(r.id)} className="ml-auto text-xs text-slate-400 hover:text-red-600">
                  삭제
                </button>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{r.content}</div>
              {r.note && <div className="mt-1 text-xs text-slate-400">비고: {r.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
