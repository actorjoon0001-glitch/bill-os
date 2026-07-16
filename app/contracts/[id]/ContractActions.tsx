"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContractActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: string) {
    setBusy(true);
    try {
      await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("이 계약과 연결된 회차를 모두 삭제합니다. 계속할까요?")) return;
    setBusy(true);
    try {
      await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      router.push("/contracts");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      {status !== "CANCELED" ? (
        <button disabled={busy} onClick={() => setStatus("CANCELED")} className="btn-ghost">
          해지 처리
        </button>
      ) : (
        <button disabled={busy} onClick={() => setStatus("ACTIVE")} className="btn-ghost">
          진행중으로 복원
        </button>
      )}
      <button disabled={busy} onClick={remove} className="btn-danger">
        삭제
      </button>
    </div>
  );
}
