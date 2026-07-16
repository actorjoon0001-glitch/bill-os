import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 저장된 계약서 파일(Document)을 id 로 조회해 스트리밍한다.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "파일 없음" }, { status: 404 });
  }
  return new NextResponse(Buffer.from(doc.data), {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
