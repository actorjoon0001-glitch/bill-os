import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import ContractsTable from "./ContractsTable";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const contracts = await prisma.contract.findMany({
    orderBy: { contractDate: "desc" },
    include: { installments: { orderBy: [{ kind: "asc" }, { seq: "asc" }] } },
  });

  const data = contracts.map((c) => {
    const received = c.installments
      .filter((i) => i.received)
      .reduce((s, i) => s + i.receivedAmount, 0);
    const outstanding = c.installments
      .filter((i) => !i.received)
      .reduce((s, i) => s + i.plannedAmount, 0);
    return {
      id: c.id,
      contractNo: c.contractNo,
      title: c.title,
      clientName: c.clientName,
      source: c.source,
      taxType: c.taxType,
      status: c.status,
      totalAmount: c.totalAmount,
      contractDate: c.contractDate.toISOString(),
      received,
      outstanding,
      installmentCount: c.installments.length,
      receivedCount: c.installments.filter((i) => i.received).length,
    };
  });

  return (
    <div>
      <PageHeader
        title="계약 관리"
        desc="수기·전자 계약서를 등록하고 계약금·중도금·잔금 수납을 관리합니다."
        action={
          <Link href="/contracts/new" className="btn-primary">
            + 계약 등록
          </Link>
        }
      />
      <ContractsTable contracts={data} />
    </div>
  );
}
