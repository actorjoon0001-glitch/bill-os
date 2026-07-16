import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: {
      installments: { orderBy: [{ kind: "asc" }, { seq: "asc" }] },
      expenses: { orderBy: { expenseDate: "desc" } },
    },
  });
  if (!contract) {
    return NextResponse.json({ error: "계약을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(contract);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.clientName !== undefined) data.clientName = body.clientName;
    if (body.memo !== undefined) data.memo = body.memo;

    const updated = await prisma.contract.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contract.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
