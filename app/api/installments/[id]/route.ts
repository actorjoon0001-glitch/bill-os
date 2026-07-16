import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 수납 체크/해제 및 금액·일자 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const inst = await prisma.installment.findUnique({
      where: { id: params.id },
    });
    if (!inst) {
      return NextResponse.json({ error: "회차를 찾을 수 없습니다." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.received !== undefined) {
      data.received = Boolean(body.received);
      if (body.received) {
        // 체크 시 수납금액/수납일 기본값 채움
        data.receivedAmount =
          body.receivedAmount != null
            ? Math.round(Number(body.receivedAmount))
            : inst.plannedAmount;
        data.receivedDate = body.receivedDate
          ? new Date(body.receivedDate)
          : new Date();
      } else {
        // 체크 해제 시 초기화
        data.receivedAmount = 0;
        data.receivedDate = null;
      }
    } else {
      if (body.receivedAmount !== undefined)
        data.receivedAmount = Math.round(Number(body.receivedAmount));
      if (body.receivedDate !== undefined)
        data.receivedDate = body.receivedDate ? new Date(body.receivedDate) : null;
    }

    if (body.plannedAmount !== undefined)
      data.plannedAmount = Math.round(Number(body.plannedAmount));
    if (body.dueDate !== undefined)
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.label !== undefined) data.label = body.label;

    const updated = await prisma.installment.update({
      where: { id: params.id },
      data,
    });

    // 계약의 모든 회차가 수납 완료면 상태를 완납으로 자동 갱신
    const siblings = await prisma.installment.findMany({
      where: { contractId: inst.contractId },
    });
    const allReceived = siblings.every((s) =>
      s.id === updated.id ? updated.received : s.received
    );
    const contract = await prisma.contract.findUnique({
      where: { id: inst.contractId },
      select: { status: true },
    });
    if (contract && contract.status !== "CANCELED") {
      await prisma.contract.update({
        where: { id: inst.contractId },
        data: { status: allReceived ? "COMPLETED" : "ACTIVE" },
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "수납 처리 실패" }, { status: 500 });
  }
}
