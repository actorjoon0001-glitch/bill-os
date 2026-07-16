"use client";

// 서버 컴포넌트/DB 조회 중 예외가 발생하면 표시되는 안내 화면.
// 대부분 DATABASE_URL(Supabase) 미설정 또는 연결 실패가 원인이다.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="text-4xl mb-3">🗄️</div>
        <h1 className="text-lg font-bold text-slate-800">
          데이터베이스에 연결할 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          로그인/화면 구성은 정상 동작하지만, 데이터 조회에 실패했습니다.
          대개 <b>Supabase 연결(DATABASE_URL)</b>이 아직 설정되지 않았을 때 발생합니다.
        </p>
        <div className="mt-4 text-left text-xs text-slate-500 bg-slate-50 rounded-lg p-3 leading-relaxed">
          <div className="font-semibold text-slate-600 mb-1">해결 방법</div>
          1. Supabase 프로젝트의 연결 문자열 복사
          <br />
          2. Netlify → Site settings → Environment variables 에{" "}
          <code className="text-brand-600">DATABASE_URL</code> 등록
          <br />
          3. Netlify 에서 다시 <b>Trigger deploy</b>
        </div>
        {error?.digest && (
          <p className="mt-3 text-[11px] text-slate-300">오류 코드: {error.digest}</p>
        )}
        <button onClick={() => reset()} className="btn-ghost mt-5">
          다시 시도
        </button>
      </div>
    </div>
  );
}
