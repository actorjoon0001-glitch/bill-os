import Link from "next/link";
import { PageHeader } from "@/components/ui";
import {
  fetchCompletedContracts,
  isEContractConfigured,
  type EContractRow,
} from "@/lib/econtracts";

export const dynamic = "force-dynamic";

const fmtMan = (n: number) => Math.round(n).toLocaleString("ko-KR");
const monthOf = (d: string) => (d || "").slice(0, 7);
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return y && mo ? `${y}.${mo}` : m || "-";
};

export default async function DashboardPage() {
  const configured = isEContractConfigured();
  let rows: EContractRow[] = [];
  let error: string | null = null;
  if (configured) {
    try {
      rows = await fetchCompletedContracts();
    } catch (e) {
      error = e instanceof Error ? e.message : "전자계약서 조회 중 오류가 발생했습니다.";
    }
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const totalCount = rows.length;
  const totalDown = rows.reduce((s, r) => s + r.downPayment, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.productTotal, 0);
  const thisMonthRows = rows.filter((r) => monthOf(r.contractDate) === thisMonth);
  const thisMonthDown = thisMonthRows.reduce((s, r) => s + r.downPayment, 0);

  // 월별 추이 (최근 8개월)
  const mMap = new Map<string, { count: number; down: number; revenue: number }>();
  for (const r of rows) {
    const k = monthOf(r.contractDate) || "(미지정)";
    const c = mMap.get(k) || { count: 0, down: 0, revenue: 0 };
    c.count += 1;
    c.down += r.downPayment;
    c.revenue += r.productTotal;
    mMap.set(k, c);
  }
  const monthly = Array.from(mMap.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 8);
  const maxRev = Math.max(1, ...monthly.map((m) => m.revenue));

  // 전시장별 요약
  const sMap = new Map<string, { count: number; down: number; revenue: number }>();
  for (const r of rows) {
    const k = r.showroom || "(미지정)";
    const c = sMap.get(k) || { count: 0, down: 0, revenue: 0 };
    c.count += 1;
    c.down += r.downPayment;
    c.revenue += r.productTotal;
    sMap.set(k, c);
  }
  const showrooms = Array.from(sMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div>
      <PageHeader
        title="정산 대시보드"
        desc={`오늘 ${now.toISOString().slice(0, 10)} 기준 · 전자계약서 계약완료 ${totalCount}건`}
        action={
          <Link href="/econtracts" className="btn-primary">
            전자계약서 계약 보기
          </Link>
        }
      />

      {!configured ? (
        <div className="card p-6 text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">전자계약서 연동 설정이 필요합니다</div>
          Netlify 환경변수에 <code className="text-brand-600">ECONTRACT_API_URL</code>,{" "}
          <code className="text-brand-600">ECONTRACT_API_KEY</code> 를 등록하고 재배포하면
          대시보드에 실제 데이터가 표시됩니다.
        </div>
      ) : error ? (
        <div className="card p-6">
          <div className="text-sm font-semibold text-red-600 mb-1">
            데이터를 불러오지 못했습니다
          </div>
          <div className="text-xs text-slate-500 break-all">{error}</div>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="card p-4">
              <div className="text-xs text-slate-400">계약완료 건수 (누적)</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
                {totalCount.toLocaleString("ko-KR")}건
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-400">계약금 합계 (누적)</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">
                {fmtMan(totalDown)}
                <span className="text-sm font-medium text-slate-400"> 만원</span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-400">계약 매출 합계 (제품합계)</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
                {fmtMan(totalRevenue)}
                <span className="text-sm font-medium text-slate-400"> 만원</span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-400">
                이번 달 계약금 · {monthLabel(thisMonth)}
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
                {fmtMan(thisMonthDown)}
                <span className="text-sm font-medium text-slate-400"> 만원</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">계약완료 {thisMonthRows.length}건</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 월별 추이 */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-slate-800">월별 계약 추이</div>
                <div className="text-xs text-slate-400">단위: 만원 · 계약일 기준</div>
              </div>
              {monthly.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">데이터가 없습니다.</div>
              ) : (
                <div className="space-y-2.5">
                  {monthly.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <div className="w-14 text-xs text-slate-500 tabular-nums">
                        {monthLabel(m.month)}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(m.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                      <div className="w-24 text-right text-xs tabular-nums text-slate-700">
                        {fmtMan(m.revenue)}
                      </div>
                      <div className="w-10 text-right text-xs tabular-nums text-slate-400">
                        {m.count}건
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 전시장별 요약 */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 font-semibold text-slate-800">
                전시장별 요약
              </div>
              {showrooms.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">데이터가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-2 text-left font-medium">전시장</th>
                        <th className="px-5 py-2 text-right font-medium">건수</th>
                        <th className="px-5 py-2 text-right font-medium">계약금</th>
                        <th className="px-5 py-2 text-right font-medium">매출</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {showrooms.map((s) => (
                        <tr key={s.name} className="hover:bg-slate-50/60">
                          <td className="px-5 py-2 font-medium text-slate-700">{s.name}</td>
                          <td className="px-5 py-2 text-right tabular-nums">{s.count}건</td>
                          <td className="px-5 py-2 text-right tabular-nums text-emerald-600">
                            {fmtMan(s.down)}
                          </td>
                          <td className="px-5 py-2 text-right tabular-nums">{fmtMan(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
