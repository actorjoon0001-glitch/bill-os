import { PageHeader, StatCard } from "@/components/ui";
import { weeklyRevenue, monthlyRevenue } from "@/lib/reports";
import RevenueView from "./RevenueView";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [weeks, months] = await Promise.all([
    weeklyRevenue(12),
    monthlyRevenue(12),
  ]);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = months.find((m) => m.key === thisMonthKey)?.gross ?? 0;
  const ytd = months
    .filter((m) => m.key.startsWith(String(now.getFullYear())))
    .reduce((s, m) => s + m.gross, 0);
  const ytdVat = months
    .filter((m) => m.key.startsWith(String(now.getFullYear())))
    .reduce((s, m) => s + m.vat, 0);

  return (
    <div>
      <PageHeader
        title="매출 현황"
        desc="수납 완료된 금액을 기준으로 주 단위·월 단위 매출을 집계합니다 (현금주의)."
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="이번 달 매출" amount={thisMonth} tone="positive" />
        <StatCard label={`${now.getFullYear()}년 누적 매출`} amount={ytd} />
        <StatCard label={`${now.getFullYear()}년 누적 부가세(매출)`} amount={ytdVat} tone="warning" />
      </div>
      <RevenueView
        weeks={weeks.map((w) => ({ ...w }))}
        months={months.map((m) => ({ ...m }))}
      />
    </div>
  );
}
