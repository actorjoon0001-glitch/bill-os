import Link from "next/link";
import { dashboardSummary, monthlyRevenue } from "@/lib/reports";
import { prisma, safeQuery, isDbReady } from "@/lib/db";
import { PageHeader, StatCard, SourceBadge, StatusBadge } from "@/components/ui";
import { formatKRW, toDateStr, INSTALLMENT_KIND_LABEL } from "@/lib/finance";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, months, upcoming] = await Promise.all([
    dashboardSummary(),
    monthlyRevenue(6),
    safeQuery(
      () =>
        prisma.installment.findMany({
          where: { received: false, dueDate: { not: null } },
          include: {
            contract: { select: { contractNo: true, title: true, clientName: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 6,
        }),
      []
    ),
  ]);

  const dbReady = await isDbReady();
  const maxMonth = Math.max(1, ...months.map((m) => m.gross));
  const collectRate =
    summary.contractTotal > 0
      ? Math.round((summary.receivedTotal / summary.contractTotal) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="정산 대시보드"
        desc={`오늘 ${toDateStr(new Date())} 기준 · 진행중 계약 ${summary.activeCount}건`}
        action={
          <Link href="/contracts/new" className="btn-primary">
            + 계약 등록
          </Link>
        }
      />

      {!dbReady && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>데이터베이스가 아직 연결되지 않았습니다.</b> 화면은 정상이지만 데이터는
          비어 있습니다. Netlify 환경변수에 <code>DATABASE_URL</code>(Supabase)을 등록하고
          재배포하면 실제 데이터가 표시됩니다.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="이번 주 매출(수납)" amount={summary.weekGross} tone="positive" />
        <StatCard label="이번 달 매출(수납)" amount={summary.monthGross} tone="positive" />
        <StatCard
          label="미수금(미수납 예정액)"
          amount={summary.outstanding}
          tone="warning"
          sub={`수납률 ${collectRate}%`}
        />
        <StatCard
          label={`예상 부가세 · ${summary.vatHalfLabel}`}
          amount={summary.vatPayable}
          tone={summary.vatPayable >= 0 ? "danger" : "default"}
          sub={summary.vatPayable >= 0 ? "납부 예상" : "환급 예상"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 월별 매출 추이 */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">월별 매출 추이</h2>
            <Link href="/revenue" className="text-xs text-brand-600 hover:underline">
              전체 보기 →
            </Link>
          </div>
          {months.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">
              수납된 매출 데이터가 없습니다.
            </p>
          ) : (
            <div className="space-y-2.5">
              {[...months].reverse().map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-slate-500 shrink-0">{m.key}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(6, (m.gross / maxMonth) * 100)}%` }}
                    >
                      <span className="text-[11px] font-medium text-white tabular-nums">
                        {formatKRW(m.gross)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 다가오는 수납 예정 */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">다가오는 수납 예정</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">예정된 수납이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/contracts`}
                    className="block hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {i.contract.clientName}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {toDateStr(i.dueDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-slate-500">
                        {INSTALLMENT_KIND_LABEL[i.kind]} · {i.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {formatKRW(i.plannedAmount)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
