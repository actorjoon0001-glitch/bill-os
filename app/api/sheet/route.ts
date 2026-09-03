import { NextRequest, NextResponse } from "next/server";
import { upsertSheet } from "@/lib/settlement";

// 전자계약서 관리 시트 입력값 저장 (계약번호별 upsert)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      contractNo?: string;
      patch?: Record<string, string>;
    };
    const contractNo = String(body.contractNo || "");
    if (!contractNo) return NextResponse.json({ error: "contractNo 필요" }, { status: 400 });
    const p = body.patch || {};
    const ok = await upsertSheet({
      contract_no: contractNo,
      balance: p.balance ?? null,
      evidence: p.evidence ?? null,
      worker: p.worker ?? null,
      progress: p.progress ?? null,
      biz: p.biz ?? null,
    });
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
