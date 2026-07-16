"use client";

import { useRouter } from "next/navigation";
import { formatKRW, formatWon, type VatPeriodPreset } from "@/lib/finance";

type Report = {
  sales: { gross: number; supply: number; vat: number; count: number };
  purchases: { gross: number; supply: number; vat: number; count: number };
  payable: number;
  salesByType: Record<string, { supply: number; vat: number }>;
};

export default function VatView({
  year,
  presets,
  selectedKey,
  periodLabel,
  report,
}: {
  year: number;
  presets: VatPeriodPreset[];
  selectedKey: string;
  periodLabel: string;
  report: Report;
}) {
  const router = useRouter();
  const years = [year + 1, year, year - 1, year - 2];

  function go(period: string, y: number) {
    router.push(`/vat?year=${y}&period=${period}`);
  }

  const isRefund = report.payable < 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          className="input w-auto"
          value={year}
          onChange={(e) => {
            const y = Number(e.target.value);
            go(`${y}-${selectedKey.split("-")[1]}`, y);
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select className="input w-auto" value={selectedKey} onChange={(e) => go(e.target.value, year)}>
          {presets.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* 최종 납부/환급 세액 */}
      <div className={`card p-6 mb-4 ${isRefund ? "bg-emerald-50/50" : "bg-brand-50/40"}`}>
        <div className="text-sm text-slate-500">{periodLabel}</div>
        <div className="mt-1 text-sm font-medium text-slate-600">
          {isRefund ? "환급 예상 세액" : "납부 예상 세액"}
        </div>
        <div className={`mt-1 text-3xl font-bold tabular-nums ${isRefund ? "text-emerald-600" : "text-brand-700"}`}>
          {formatKRW(Math.abs(report.payable))}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          매출세액 {formatWon(report.sales.vat)} − 매입세액 {formatWon(report.purchases.vat)} ={" "}
          {formatWon(report.payable)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 매출세액 */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">매출세액 (수납 기준)</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <RowT label="과세 공급가액" value={report.salesByType.TAXABLE.supply} />
              <RowT label="영세율 공급가액" value={report.salesByType.ZERO_RATED.supply} />
              <RowT label="면세 공급가액" value={report.salesByType.EXEMPT.supply} muted />
              <RowT label="매출 합계 (부가세 포함)" value={report.sales.gross} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="td font-semibold">매출세액</td>
                <td className="td text-right font-bold text-brand-700 tabular-nums">
                  {formatWon(report.sales.vat)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-slate-400">수납 완료 {report.sales.count}건 기준</p>
        </div>

        {/* 매입세액 */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">매입세액 (비용 기준)</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <RowT label="매입 공급가액" value={report.purchases.supply} />
              <RowT label="매입 합계 (부가세 포함)" value={report.purchases.gross} />
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200">
                <td className="td font-semibold">매입세액 (공제)</td>
                <td className="td text-right font-bold text-emerald-600 tabular-nums">
                  {formatWon(report.purchases.vat)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-slate-400">지출 {report.purchases.count}건 기준</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400 leading-relaxed">
        ※ 본 계산은 정산 관리용 참고 수치입니다. 매출세액은 수납 완료된 금액을, 매입세액은 등록된 비용을
        기준으로 하며, 면세·영세율 매출과 불공제 매입은 세액에서 제외됩니다. 실제 신고 시에는 세금계산서
        발행 기준 및 세무 검토가 필요합니다.
      </p>
    </div>
  );
}

function RowT({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <tr>
      <td className={`td ${muted ? "text-slate-400" : "text-slate-600"}`}>{label}</td>
      <td className={`td text-right tabular-nums ${muted ? "text-slate-400" : "text-slate-800"}`}>
        {formatWon(value)}
      </td>
    </tr>
  );
}
