import { PageHeader } from "@/components/ui";
import { getEmployees, type Employee } from "@/lib/settlement";
import { getLeaves, type Leave } from "@/lib/hr";
import LeaveTable from "./LeaveTable";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  let employees: Employee[] = [];
  let leaves: Leave[] = [];
  try {
    [employees, leaves] = await Promise.all([getEmployees(), getLeaves()]);
  } catch {
    /* 조회 실패 시 빈 값 */
  }

  return (
    <div>
      <PageHeader title="월차 관리" desc="직원 연차·월차·반차 사용 내역과 승인 상태를 관리합니다. (팀 공유)" />
      <LeaveTable employees={employees} initial={leaves} />
    </div>
  );
}
