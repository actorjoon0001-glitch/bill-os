"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui";
import type { Activity } from "@/lib/activity";

const fmtKST = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())} ${p(
    k.getUTCHours()
  )}:${p(k.getUTCMinutes())}`;
};

const actionColor = (a: string) =>
  a === "로그인"
    ? "bg-emerald-100 text-emerald-700"
    : a.includes("권한")
    ? "bg-violet-100 text-violet-700"
    : a.includes("전자계약서")
    ? "bg-sky-100 text-sky-700"
    : a.includes("인센티브")
    ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";

export default function ActivityLog({
  items,
  nameByEmail,
  adminEmails,
}: {
  items: Activity[];
  nameByEmail: Record<string, string>;
  adminEmails: string[];
}) {
  const [view, setView] = useState<"all" | "login" | "work">("all");
  const [q, setQ] = useState("");

  const nameOf = (email: string) => {
    const e = (email || "").toLowerCase();
    return nameByEmail[e] || (adminEmails.includes(e) ? "관리자" : e || "-");
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return items.filter((it) => {
      if (view === "login" && it.action !== "로그인") return false;
      if (view === "work" && it.action === "로그인") return false;
      if (kw) {
        const t = `${nameOf(it.email)} ${it.email} ${it.action} ${it.detail ?? ""}`.toLowerCase();
        if (!t.includes(kw)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, view, q]);

  const Tab = ({ id, label }: { id: "all" | "login" | "work"; label: string }) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        view === id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Tab id="all" label="전체" />
        <Tab id="login" label="로그인 기록" />
        <Tab id="work" label="작업 내역" />
        <input
          className="input max-w-xs ml-auto"
          placeholder="이름 / 작업 / 상세 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState>기록이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0">
                <tr>
                  <th className="th whitespace-nowrap">시각(KST)</th>
                  <th className="th">이름</th>
                  <th className="th text-center">작업</th>
                  <th className="th">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/60">
                    <td className="td whitespace-nowrap tabular-nums text-slate-500">
                      {fmtKST(it.at)}
                    </td>
                    <td className="td whitespace-nowrap font-medium text-slate-800">
                      {nameOf(it.email)}
                      <span className="ml-1 text-xs text-slate-400">{it.email}</span>
                    </td>
                    <td className="td text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${actionColor(it.action)}`}>
                        {it.action}
                      </span>
                    </td>
                    <td className="td text-slate-600">{it.detail || "-"}</td>
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
