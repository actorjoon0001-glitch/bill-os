"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const params = useSearchParams();
  const rawFrom = params.get("from") || "/";
  const from = rawFrom.startsWith("/login") || !rawFrom.startsWith("/") ? "/" : rawFrom;
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "로그인 실패");
      }
      // 클라이언트 라우팅 대신 전체 페이지 이동으로 쿠키를 확실히 반영한다.
      window.location.assign(from);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">관리자 비밀번호</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          autoFocus
        />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
