import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 계약서 파일(수기 스캔본/전자계약 PDF) 업로드.
// 서버리스(Netlify) 환경에서는 디스크에 저장할 수 없으므로 DB(Document)에 바이트로 보관하고
// 저장된 Document id 를 반환한다.
export const runtime = "nodejs";

// Netlify Functions 동기 페이로드 한도(약 6MB)를 고려해 4MB 로 제한
const MAX_SIZE = 4 * 1024 * 1024;

const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }
    const blob = file as File;
    if (blob.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "파일은 4MB 이하만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }
    const mimeType = blob.type || "application/octet-stream";
    if (blob.type && !ALLOWED.includes(blob.type)) {
      return NextResponse.json(
        { error: "PDF 또는 이미지 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await blob.arrayBuffer());
    const doc = await prisma.document.create({
      data: {
        filename: blob.name || "contract",
        mimeType,
        size: bytes.length,
        data: bytes,
      },
      select: { id: true, filename: true },
    });

    return NextResponse.json({
      documentName: doc.filename,
      documentId: doc.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
