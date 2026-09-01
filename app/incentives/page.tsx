import { PageHeader } from "@/components/ui";
import {
  fetchCompletedContracts,
  isEContractConfigured,
  type EContractRow,
} from "@/lib/econtracts";
import IncentiveTable from "./IncentiveTable";

export const dynamic = "force-dynamic";

export default async function IncentivesPage() {
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

  return (
    <div>
      <PageHeader
        title="영업사원 인센티브 정산"
        desc="전자계약서 계약완료 건 기준 · 공급가액(부가세 제외) × 영업사원별 요율"
      />

      {!configured ? (
        <div className="card p-6 text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">전자계약서 연동 설정이 필요합니다</div>
          정산OS Netlify 환경변수에 <code className="text-brand-600">ECONTRACT_API_URL</code>,{" "}
          <code className="text-brand-600">ECONTRACT_API_KEY</code> 를 등록한 뒤 재배포하면
          인센티브 정산이 표시됩니다.
        </div>
      ) : error ? (
        <div className="card p-6">
          <div className="text-sm font-semibold text-red-600 mb-1">
            데이터를 불러오지 못했습니다
          </div>
          <div className="text-xs text-slate-500 break-all">{error}</div>
        </div>
      ) : (
        <IncentiveTable rows={rows} />
      )}
    </div>
  );
}
