import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// 계약서 파일(수기 스캔본/전자계약 PDF) 업로드.
// data/uploads 에 저장하고 저장 파일명을 반환한다.
export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

function safeName(original: string): string {
  const ext = path.extname(original);
  const base = path
    .basename(original, ext)
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
    .slice(0, 60);
  const stamp = Date.now().toString(36);
  return `${stamp}_${base}${ext}`;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }
    const blob = file as File;
    if (blob.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일은 20MB 이하만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const stored = safeName(blob.name || "contract");
    const bytes = Buffer.from(await blob.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, stored), bytes);

    return NextResponse.json({
      documentName: blob.name,
      documentPath: stored,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
