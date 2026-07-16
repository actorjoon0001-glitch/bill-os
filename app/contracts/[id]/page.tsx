import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, safeQuery } from "@/lib/db";
import { PageHeader, SourceBadge, StatusBadge, TaxBadge } from "@/components/ui";
import { formatKRW, formatWon, splitVat, toDateStr, type TaxType } from "@/lib/finance";
import InstallmentList from "./InstallmentList";
import ContractActions from "./ContractActions";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const c = await safeQuery(
    () =>
      prisma.contract.findUnique({
        where: { id: params.id },
        include: {
          installments: { orderBy: [{ kind: "asc" }, { seq: "asc" }] },
          expenses: { orderBy: { expenseDate: "desc" } },
        },
      }),
    null
  );
  if (!c) notFound();

  const received = c.installments
    .filter((i) => i.received)
    .reduce((s, i) => s + i.receivedAmount, 0);
  const outstanding = c.installments
    .filter((i) => !i.received)
    .reduce((s, i) => s + i.plannedAmount, 0);
  const { supply, vat } = splitVat(c.totalAmount, c.taxType as TaxType);
  const expenseTotal = c.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="mb-4">
        <Link href="/contracts" className="text-sm text-slate-400 hover:text-slate-600">
          ← 계약 목록
        </Link>
      </div>
      <PageHeader
        title={c.title}
        desc={`${c.contractNo} · ${c.clientName}`}
        action={<ContractActions id={c.id} status={c.status} />}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <SourceBadge source={c.source} />
        <TaxBadge taxType={c.taxType} />
        <StatusBadge status={c.status} />
        {c.clientBizNo && (
          <span className="badge bg-slate-100 text-slate-500">사업자 {c.clientBizNo}</span>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-4">납입 회차 · 수납 체크</h2>
            <InstallmentList
              contractId={c.id}
              installments={c.installments.map((i) => ({
                id: i.id,
                kind: i.kind,
                label: i.label,
                plannedAmount: i.plannedAmount,
                dueDate: i.dueDate ? i.dueDate.toISOString() : null,
                received: i.received,
                receivedAmount: i.receivedAmount,
                receivedDate: i.receivedDate ? i.receivedDate.toISOString() : null,
              }))}
            />
          </div>

          {c.expenses.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-800 mb-3">연결된 비용 (매입)</h2>
              <table className="w-full">
                <tbody className="divide-y divide-slate-100">
                  {c.expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="td text-slate-400 w-24">{toDateStr(e.expenseDate)}</td>
                      <td className="td">{e.category}{e.vendor ? ` · ${e.vendor}` : ""}</td>
                      <td className="td text-right tabular-nums">{formatKRW(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200">
                    <td className="td font-medium" colSpan={2}>비용 합계</td>
                    <td className="td text-right font-semibold tabular-nums">{formatKRW(expenseTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* 사이드 요약 */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-800">금액 요약</h2>
            <Row label="총 계약금액" value={formatKRW(c.totalAmount)} strong />
            <Row label="공급가액" value={formatKRW(supply)} />
            <Row label="부가세" value={formatKRW(vat)} />
            <div className="border-t border-slate-100 my-1" />
            <Row label="수납 완료" value={formatKRW(received)} tone="positive" />
            <Row label="미수금" value={formatKRW(outstanding)} tone="warning" />
          </div>

          <div className="card p-5 space-y-2 text-sm">
            <h2 className="font-semibold text-slate-800 mb-1">계약 정보</h2>
            <Row label="계약일" value={toDateStr(c.contractDate)} />
            <Row label="등록일" value={toDateStr(c.createdAt)} />
            {c.documentId ? (
              <div className="pt-1">
                <a
                  href={`/api/files/${encodeURIComponent(c.documentId)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline text-sm"
                >
                  📎 {c.documentName || "계약서 파일"} 보기
                </a>
              </div>
            ) : (
              c.documentName && (
                <Row label="첨부 파일" value={c.documentName} />
              )
            )}
            {c.memo && (
              <div className="pt-2 text-slate-500 whitespace-pre-wrap border-t border-slate-100 mt-2">
                {c.memo}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive" | "warning";
}) {
  const toneCls =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
      ? "text-amber-600"
      : "text-slate-800";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? "font-bold text-base" : "font-medium"} ${toneCls}`}>
        {value}
      </span>
    </div>
  );
}
