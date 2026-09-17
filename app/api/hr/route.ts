import { NextRequest, NextResponse } from "next/server";
import {
  upsertAttendance,
  upsertLeave,
  deleteLeave,
  upsertWorklog,
  deleteWorklog,
  type Attendance,
  type Leave,
  type Worklog,
} from "@/lib/hr";

// 근태/월차/업무일지 저장·삭제 (팀 공유)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      kind?: string;
      op?: string;
      row?: unknown;
      id?: string;
    };
    const kind = String(body.kind || "");
    const op = String(body.op || "save");

    if (kind === "attendance") {
      const ok = await upsertAttendance(body.row as Attendance);
      return NextResponse.json({ ok });
    }
    if (kind === "leave") {
      const ok =
        op === "delete"
          ? await deleteLeave(String(body.id || ""))
          : await upsertLeave(body.row as Leave);
      return NextResponse.json({ ok });
    }
    if (kind === "worklog") {
      const ok =
        op === "delete"
          ? await deleteWorklog(String(body.id || ""))
          : await upsertWorklog(body.row as Worklog);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "알 수 없는 요청" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
