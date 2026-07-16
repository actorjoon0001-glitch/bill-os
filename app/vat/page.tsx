import { PageHeader } from "@/components/ui";
import { vatReport } from "@/lib/reports";
import { vatPeriodsForYear } from "@/lib/finance";
import VatView from "./VatView";

export const dynamic = "force-dynamic";

export default async function VatPage({
  searchParams,
}: {
  searchParams: { period?: string; year?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const presets = vatPeriodsForYear(year);

  // 기본값: 현재 반기 확정
  const defaultKey = now.getMonth() < 6 ? `${year}-1F` : `${year}-2F`;
  const selectedKey = searchParams.period || defaultKey;
  const preset = presets.find((p) => p.key === selectedKey) ?? presets[1];

  const start = new Date(preset.start + "T00:00:00");
  const end = new Date(preset.end + "T23:59:59");
  const report = await vatReport(start, end);

  return (
    <div>
      <PageHeader
        title="부가가치세 신고"
        desc="과세기간의 매출세액에서 매입세액을 차감해 납부(환급)세액을 계산합니다."
      />
      <VatView
        year={year}
        presets={presets}
        selectedKey={preset.key}
        periodLabel={preset.label}
        report={report}
      />
    </div>
  );
}
