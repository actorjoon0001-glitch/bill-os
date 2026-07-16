"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/contracts", label: "계약 관리", icon: "📄" },
  { href: "/revenue", label: "매출", icon: "📈" },
  { href: "/expenses", label: "비용", icon: "🧾" },
  { href: "/vat", label: "부가세 신고", icon: "🏛️" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 화면에서는 사이드바를 숨긴다.
  if (pathname === "/login") return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen p-4 hidden md:block">
      <div className="px-2 py-3 mb-4">
        <div className="text-lg font-bold text-brand-700">세움 정산 OS</div>
        <div className="text-xs text-slate-400">Settlement OS</div>
      </div>
      <nav className="space-y-1">
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="text-base">{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 px-3">
        <button
          onClick={logout}
          className="w-full text-left text-sm text-slate-500 hover:text-red-600 rounded-lg px-3 py-2 hover:bg-slate-50"
        >
          로그아웃
        </button>
      </div>
      <div className="mt-3 px-3 text-[11px] leading-relaxed text-slate-400">
        정산팀 전용 · 계약금/중도금/잔금 수납, 주·월 매출, 부가세 신고를 한 곳에서
        관리합니다.
      </div>
    </aside>
  );
}
