import { PageHeader } from "@/components/ui";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_SECRET } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { getEmployees, getUserName, type Employee } from "@/lib/settlement";
import { getAttendance, type Attendance } from "@/lib/hr";
import AttendanceTable from "./AttendanceTable";

export const dynamic = "force-dynamic";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const date = searchParams.date || todayStr();

  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const currentUser = session ? await getUserName(session.email) : "";

  let employees: Employee[] = [];
  let initial: Record<string, Attendance> = {};
  try {
    [employees, initial] = await Promise.all([getEmployees(), getAttendance(date)]);
  } catch {
    /* 조회 실패 시 빈 값 */
  }

  return (
    <div>
      <PageHeader title="근태 관리" desc="일자별 직원 출·퇴근 및 근태 상태를 기록합니다. (팀 공유)" />
      <AttendanceTable
        employees={employees}
        initial={initial}
        date={date}
        currentUser={currentUser}
      />
    </div>
  );
}
