"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatKRW, toDateStr, INSTALLMENT_KIND_LABEL } from "@/lib/finance";

type Inst = {
  id: string;
  kind: string;
  label: string;
  plannedAmount: number;
  dueDate: string | null;
  received: boolean;
  receivedAmount: number;
  receivedDate: string | null;
};

const kindColor: Record<string, string> = {
  DOWN_PAYMENT: "bg-blue-50 text-blue-700",
  INTERIM: "bg-amber-50 text-amber-700",
  BALANCE: "bg-violet-50 text-violet-700",
};

export default function InstallmentList({
  installments,
}: {
  contractId: string;
  installments: Inst[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function toggle(inst: Inst, checked: boolean, receivedDate?: string, receivedAmount?: number) {
    setBusy(inst.id);
    try {
      await fetch(`/api/installments/${inst.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          received: checked,
          receivedDate: receivedDate ?? new Date().toISOString().slice(0, 10),
          receivedAmount: receivedAmount ?? inst.plannedAmount,
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
      setEditing(null);
    }
  }

  return (
    <div className="space-y-2.5">
      {installments.map((i) => (
        <div
          key={i.id}
          className={`rounded-xl border p-3 transition-colors ${
            i.received ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={i.received}
              disabled={busy === i.id}
              onChange={(e) => toggle(i, e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`badge ${kindColor[i.kind] ?? "bg-slate-100"}`}>
                  {INSTALLMENT_KIND_LABEL[i.kind] ?? i.kind}
                </span>
                <span className="text-sm font-medium text-slate-700">{i.label}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                예정일 {i.dueDate ? toDateStr(i.dueDate) : "-"}
                {i.received && i.receivedDate && (
                  <span className="text-emerald-600 ml-2">
                    · 수납일 {toDateStr(i.receivedDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-semibold text-slate-800 tabular-nums">
                {formatKRW(i.plannedAmount)}
              </div>
              {i.received && i.receivedAmount !== i.plannedAmount && (
                <div className="text-xs text-emerald-600 tabular-nums">
                  수납 {formatKRW(i.receivedAmount)}
                </div>
              )}
              {i.received ? (
                <span className="text-xs text-emerald-600 font-medium">✓ 수납완료</span>
              ) : (
                <button
                  onClick={() => setEditing(editing === i.id ? null : i.id)}
                  className="text-xs text-brand-600 hover:underline"
                >
                  부분/일자 지정
                </button>
              )}
            </div>
          </div>

          {editing === i.id && !i.received && (
            <ManualReceive
              inst={i}
              busy={busy === i.id}
              onConfirm={(date, amount) => toggle(i, true, date, amount)}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      ))}
      {installments.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">등록된 회차가 없습니다.</p>
      )}
    </div>
  );
}

function ManualReceive({
  inst,
  busy,
  onConfirm,
  onCancel,
}: {
  inst: Inst;
  busy: boolean;
  onConfirm: (date: string, amount: number) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(inst.plannedAmount));
  return (
    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-end gap-2">
      <div>
        <label className="label">수납일</label>
        <input type="date" className="input py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <label className="label">수납금액</label>
        <input type="number" className="input py-1.5 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button
        disabled={busy}
        onClick={() => onConfirm(date, Number(amount) || 0)}
        className="btn-primary py-1.5"
      >
        수납 처리
      </button>
      <button onClick={onCancel} className="btn-ghost py-1.5">
        취소
      </button>
    </div>
  );
}
