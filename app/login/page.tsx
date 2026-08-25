export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; error?: string };
}) {
  const from = searchParams?.from || "/";
  const hasError = searchParams?.error === "1";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-brand-700">세움 정산 OS</div>
          <div className="text-sm text-slate-400 mt-1">정산팀 전용 · 관리자 로그인</div>
        </div>
        <div className="card p-6">
          {/* 일반 폼 전송(POST) → 서버가 쿠키를 심고 리다이렉트한다 */}
          <form method="POST" action="/api/auth/login" className="space-y-4">
            <input type="hidden" name="from" value={from} />
            <div>
              <label className="label" htmlFor="password">
                관리자 비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                placeholder="비밀번호 입력"
                autoFocus
                autoComplete="current-password"
              />
            </div>
            {hasError && (
              <div className="text-sm text-red-600">
                비밀번호가 올바르지 않습니다.
              </div>
            )}
            <button type="submit" className="btn-primary w-full">
              로그인
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          접근 권한이 있는 정산팀 담당자만 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
