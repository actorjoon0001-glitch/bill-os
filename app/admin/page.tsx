import { PageHeader } from "@/components/ui";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_SECRET, ADMIN_EMAILS, ALLOWED_TEAMS } from "@/lib/auth";
import { verifySession } from "@/lib/session";
import { getEmployees, getAccessMap, type Employee } from "@/lib/settlement";
import AdminAccessTable from "./AdminAccessTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const email = (session?.email || "").toLowerCase();
  const isAdmin = Boolean(email) && ADMIN_EMAILS.includes(email);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="관리자" desc="관리자 전용 페이지입니다." />
        <div className="card p-6 text-sm text-slate-600">
          이 페이지는 관리자만 접근할 수 있습니다.
        </div>
      </div>
    );
  }

  let employees: Employee[] = [];
  let access: Record<string, boolean> = {};
  try {
    [employees, access] = await Promise.all([getEmployees(), getAccessMap()]);
  } catch {
    /* 조회 실패 시 빈 목록 */
  }

  return (
    <div>
      <PageHeader
        title="관리자 · 접근 권한 설정"
        desc="정산 OS에 로그인할 수 있는 직원을 설정합니다. (기본: 정산·경영팀 자동 허용)"
      />
      {employees.length === 0 ? (
        <div className="card p-6 text-sm text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 mb-2">직원 목록을 불러오지 못했습니다</div>
          세움 Supabase 연결(환경변수) 또는 <code className="text-brand-600">settlement_access</code>{" "}
          테이블 설정을 확인해 주세요.
        </div>
      ) : (
        <AdminAccessTable
          employees={employees}
          access={access}
          adminEmails={ADMIN_EMAILS}
          allowedTeams={ALLOWED_TEAMS}
        />
      )}
    </div>
  );
}
