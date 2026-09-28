import { PageHeader } from "@/components/ui";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_SECRET, ADMIN_EMAILS } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { getEmployees, type Employee } from "@/lib/settlement";
import { getActivity, type Activity } from "@/lib/activity";
import ActivityLog from "../ActivityLog";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const email = (session?.email || "").toLowerCase();
  const isAdmin = Boolean(email) && ADMIN_EMAILS.includes(email);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="활동 기록" desc="관리자 전용 페이지입니다." />
        <div className="card p-6 text-sm text-slate-600">
          이 페이지는 관리자만 접근할 수 있습니다.
        </div>
      </div>
    );
  }

  let employees: Employee[] = [];
  let activity: Activity[] = [];
  try {
    [employees, activity] = await Promise.all([getEmployees(), getActivity(300)]);
  } catch {
    /* 조회 실패 시 빈 값 */
  }

  const nameByEmail: Record<string, string> = {};
  for (const e of employees) if (e.email) nameByEmail[e.email.toLowerCase()] = e.name;

  return (
    <div>
      <PageHeader title="활동 기록" desc="사용자별 작업 내역입니다. (최근 300건)" />
      <ActivityLog
        items={activity}
        nameByEmail={nameByEmail}
        adminEmails={ADMIN_EMAILS}
        initialView="work"
      />
    </div>
  );
}
