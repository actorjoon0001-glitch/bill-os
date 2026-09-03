import { NextRequest, NextResponse } from "next/server";
import { upsertIncentiveRate, upsertIncentiveSettle } from "@/lib/settlement";

// 인센티브 요율/지급여부/메모 저장
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      type?: "rate" | "settle";
      salesperson?: string;
      rate?: number;
      id?: string;
      paid?: boolean;
      memo?: string;
    };
    if (body.type === "rate") {
      const ok = await upsertIncentiveRate(String(body.salesperson || ""), Number(body.rate) || 0);
      return NextResponse.json({ ok });
    }
    if (body.type === "settle") {
      const patch: { paid?: boolean; memo?: string } = {};
      if (typeof body.paid === "boolean") patch.paid = body.paid;
      if (typeof body.memo === "string") patch.memo = body.memo;
      const ok = await upsertIncentiveSettle(String(body.id || ""), patch);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "type 필요" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
