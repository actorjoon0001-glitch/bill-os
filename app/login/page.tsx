import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-brand-700">세움 정산 OS</div>
          <div className="text-sm text-slate-400 mt-1">정산팀 전용 · 관리자 로그인</div>
        </div>
        <div className="card p-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          접근 권한이 있는 정산팀 담당자만 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
