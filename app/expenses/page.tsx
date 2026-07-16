import { prisma } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui";
import { splitVat, type TaxType } from "@/lib/finance";
import ExpensesClient from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const [expenses, contracts] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { expenseDate: "desc" },
      include: { contract: { select: { contractNo: true, title: true } } },
    }),
    prisma.contract.findMany({
      where: { status: { not: "CANCELED" } },
      select: { id: true, contractNo: true, title: true },
      orderBy: { contractDate: "desc" },
    }),
  ]);

  const now = new Date();
  const yStr = String(now.getFullYear());
  const thisMonth = now.getMonth();
  let ytdTotal = 0;
  let ytdVat = 0;
  let monthTotal = 0;
  for (const e of expenses) {
    if (e.expenseDate.getFullYear().toString() === yStr) {
      ytdTotal += e.amount;
      ytdVat += splitVat(e.amount, e.taxType as TaxType).vat;
      if (e.expenseDate.getMonth() === thisMonth) monthTotal += e.amount;
    }
  }

  const data = expenses.map((e) => ({
    id: e.id,
    expenseDate: e.expenseDate.toISOString(),
    category: e.category,
    vendor: e.vendor,
    description: e.description,
    amount: e.amount,
    taxType: e.taxType,
    contractNo: e.contract?.contractNo ?? null,
    contractTitle: e.contract?.title ?? null,
    vat: splitVat(e.amount, e.taxType as TaxType).vat,
  }));

  return (
    <div>
      <PageHeader
        title="비용 관리"
        desc="지출(매입) 내역을 등록합니다. 과세 매입의 부가세는 매입세액으로 공제됩니다."
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label={`${yStr}년 누적 비용`} amount={ytdTotal} tone="danger" />
        <StatCard label={`${yStr}년 매입세액(공제)`} amount={ytdVat} tone="positive" />
        <StatCard label="이번 달 비용" amount={monthTotal} sub={`총 ${data.length}건 등록됨`} />
      </div>
      <ExpensesClient expenses={data} contracts={contracts} />
    </div>
  );
}
