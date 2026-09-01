import RememberEmail from "./RememberEmail";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  const from = searchParams?.from || "/";
  const error = searchParams?.error;
  const message =
    error === "perm"
      ? "경영관리팀(정산·경영) 전용입니다. 로그인 권한이 없는 계정입니다."
      : error === "config"
      ? "로그인 설정이 필요합니다. 관리자에게 문의하세요."
      : error
      ? "이메일 또는 비밀번호가 올바르지 않습니다."
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-brand-700">세움 정산 OS</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">
            경영관리팀 전용 OS입니다.
          </div>
        </div>
        <div className="card p-6">
          {/* 일반 폼 전송(POST) → 서버가 Supabase Auth 로 검증 후 쿠키를 심고 리다이렉트 */}
          <form method="POST" action="/api/auth/login" className="space-y-4">
            <input type="hidden" name="from" value={from} />
            <div>
              <label className="label" htmlFor="email">
                아이디 (이메일)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="세움 계정 이메일"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="비밀번호"
                autoComplete="current-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              자동 로그인 (로그인 상태 유지)
            </label>
            {message && <div className="text-sm text-red-600">{message}</div>}
            <button type="submit" className="btn-primary w-full">
              로그인
            </button>
          </form>
          <RememberEmail />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          세움 플랫폼 계정으로 로그인합니다 · 정산팀과 경영팀만 접근할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
