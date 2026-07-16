import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 계약번호 자동 생성: C-YYYY-XXXX
async function nextContractNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `C-${year}-`;
  const last = await prisma.contract.findFirst({
    where: { contractNo: { startsWith: prefix } },
    orderBy: { contractNo: "desc" },
    select: { contractNo: true },
  });
  let n = 1;
  if (last) {
    const parsed = parseInt(last.contractNo.slice(prefix.length), 10);
    if (!Number.isNaN(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export async function GET() {
  const contracts = await prisma.contract.findMany({
    orderBy: { contractDate: "desc" },
    include: { installments: { orderBy: [{ kind: "asc" }, { seq: "asc" }] } },
  });
  return NextResponse.json(contracts);
}

type InstallmentInput = {
  kind: "DOWN_PAYMENT" | "INTERIM" | "BALANCE";
  label?: string;
  seq?: number;
  plannedAmount: number;
  dueDate?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      clientName,
      clientBizNo,
      source,
      taxType,
      totalAmount,
      contractDate,
      memo,
      documentName,
      documentId,
      installments,
    } = body as {
      title: string;
      clientName: string;
      clientBizNo?: string;
      source: string;
      taxType?: string;
      totalAmount: number;
      contractDate: string;
      memo?: string;
      documentName?: string;
      documentId?: string;
      installments?: InstallmentInput[];
    };

    if (!title || !clientName || !source || !contractDate) {
      return NextResponse.json(
        { error: "계약명, 거래처, 계약서 종류, 계약일은 필수입니다." },
        { status: 400 }
      );
    }

    const contractNo = await nextContractNo();

    const contract = await prisma.contract.create({
      data: {
        contractNo,
        title,
        clientName,
        clientBizNo: clientBizNo || null,
        source: source === "MANUAL" ? "MANUAL" : "ELECTRONIC",
        taxType:
          taxType === "EXEMPT"
            ? "EXEMPT"
            : taxType === "ZERO_RATED"
            ? "ZERO_RATED"
            : "TAXABLE",
        totalAmount: Math.round(Number(totalAmount) || 0),
        contractDate: new Date(contractDate),
        memo: memo || null,
        documentName: documentName || null,
        documentId: documentId || null,
        installments: {
          create: (installments ?? []).map((i, idx) => ({
            kind: i.kind,
            label:
              i.label ||
              (i.kind === "DOWN_PAYMENT"
                ? "계약금"
                : i.kind === "INTERIM"
                ? `중도금 ${idx}`
                : "잔금"),
            seq: i.seq ?? idx + 1,
            plannedAmount: Math.round(Number(i.plannedAmount) || 0),
            dueDate: i.dueDate ? new Date(i.dueDate) : null,
          })),
        },
      },
      include: { installments: true },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "계약 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
