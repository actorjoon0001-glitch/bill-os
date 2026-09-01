import { PageHeader, EmptyState } from "@/components/ui";
import {
  fetchCompletedContracts,
  isEContractConfigured,
  type EContractRow,
} from "@/lib/econtracts";
import EContractsTable from "./EContractsTable";

export const dynamic = "force-dynamic";

const fmtMan = (n: number) => n.toLocaleString("ko-KR");

export default async function EContractsPage() {
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

  const downTotal = rows.reduce((s, r) => s + r.downPayment, 0);
  const productTotal = rows.reduce((s, r) => s + r.productTotal, 0);

  return (
    <div>
      <PageHeader
        title="전자계약서 계약"
        desc="전자계약서(Contract-OS) 연동 · 진행상태 '계약완료' + 계약금 입금 건 (읽기 전용)"
      />

      {!configured ? (
        <div className="card p-6 text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">전자계약서 연동 설정이 필요합니다</div>
          정산OS Netlify 환경변수에 아래 두 값을 등록한 뒤 재배포하면 계약완료 건이 표시됩니다.
          <ul className="mt-3 space-y-1 text-slate-500">
            <li>
              <code className="text-brand-600">ECONTRACT_API_URL</code> — 세움os Supabase REST 주소
              (…supabase.co/rest/v1)
            </li>
            <li>
              <code className="text-brand-600">ECONTRACT_API_KEY</code> — Supabase API 키(publishable/anon)
            </li>
          </ul>
        </div>
      ) : error ? (
        <div className="card p-6">
          <div className="text-sm font-semibold text-red-600 mb-1">
            전자계약서 데이터를 불러오지 못했습니다
          </div>
          <div className="text-xs text-slate-500 break-all">{error}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card p-4">
              <div className="text-xs text-slate-400">계약완료 건수</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
                {rows.length.toLocaleString("ko-KR")}건
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-400">계약금 합계</div>
              <div className="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">
                {fmtMan(downTotal)}
                <span className="text-sm font-medium text-slate-400"> 만원</span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-400">제품합계 합계</div>
              <div className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">
                {fmtMan(productTotal)}
                <span className="text-sm font-medium text-slate-400"> 만원</span>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState>계약완료 + 계약금 입금된 계약이 없습니다.</EmptyState>
          ) : (
            <EContractsTable rows={rows} />
          )}
        </>
      )}
    </div>
  );
}
