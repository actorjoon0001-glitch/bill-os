import { PageHeader } from "@/components/ui";
import { getPlatformAttendance, type PlatformAttendance } from "@/lib/hr";
import { getEmployees, type Employee } from "@/lib/settlement";
import AttendanceTable from "./AttendanceTable";

export const dynamic = "force-dynamic";

// KST(UTC+9) 기준 오늘 날짜
function kstToday() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date || kstToday();

  let rows: PlatformAttendance[] = [];
  let employees: Employee[] = [];
  try {
    [rows, employees] = await Promise.all([getPlatformAttendance(date), getEmployees()]);
  } catch {
    /* 조회 실패 시 빈 값 */
  }

  return (
    <div>
      <PageHeader
        title="근태 관리"
        desc="세움 플랫폼 출·퇴근 기록 연동 · 경영지원팀 조회용 (읽기 전용)"
      />
      <AttendanceTable rows={rows} employees={employees} date={date} />
    </div>
  );
}
