import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const expenses = await prisma.expense.findMany({
    orderBy: { expenseDate: "desc" },
    include: { contract: { select: { contractNo: true, title: true } } },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expenseDate, category, vendor, description, amount, taxType, contractId } =
      body as {
        expenseDate: string;
        category: string;
        vendor?: string;
        description?: string;
        amount: number;
        taxType?: string;
        contractId?: string;
      };

    if (!expenseDate || !category || amount == null) {
      return NextResponse.json(
        { error: "지출일, 항목, 금액은 필수입니다." },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        expenseDate: new Date(expenseDate),
        category,
        vendor: vendor || null,
        description: description || null,
        amount: Math.round(Number(amount) || 0),
        taxType:
          taxType === "EXEMPT"
            ? "EXEMPT"
            : taxType === "ZERO_RATED"
            ? "ZERO_RATED"
            : "TAXABLE",
        contractId: contractId || null,
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "비용 등록 실패" }, { status: 500 });
  }
}
