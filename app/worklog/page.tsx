import { PageHeader } from "@/components/ui";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_SECRET } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { getEmployees, getUserName, type Employee } from "@/lib/settlement";
import { getWorklogs, type Worklog } from "@/lib/hr";
import WorklogTable from "./WorklogTable";

export const dynamic = "force-dynamic";

export default async function WorklogPage() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const currentUser = session ? await getUserName(session.email) : "";

  let employees: Employee[] = [];
  let logs: Worklog[] = [];
  try {
    [employees, logs] = await Promise.all([getEmployees(), getWorklogs()]);
  } catch {
    /* 조회 실패 시 빈 값 */
  }

  return (
    <div>
      <PageHeader title="팀 업무일지" desc="팀별 일일 업무 내용을 기록·공유합니다. (팀 공유)" />
      <WorklogTable employees={employees} initial={logs} currentUser={currentUser} />
    </div>
  );
}
