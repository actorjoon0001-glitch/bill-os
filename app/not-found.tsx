import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="text-5xl mb-3">🔍</div>
      <h1 className="text-xl font-bold text-slate-800">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-slate-500">요청하신 계약 또는 페이지가 존재하지 않습니다.</p>
      <Link href="/" className="btn-primary mt-5">
        대시보드로 이동
      </Link>
    </div>
  );
}
