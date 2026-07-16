"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatWon } from "@/lib/finance";

type Row = {
  kind: "DOWN_PAYMENT" | "INTERIM" | "BALANCE";
  label: string;
  plannedAmount: string;
  dueDate: string;
};

const kindLabel: Record<Row["kind"], string> = {
  DOWN_PAYMENT: "계약금",
  INTERIM: "중도금",
  BALANCE: "잔금",
};

export default function NewContractForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    clientName: "",
    clientBizNo: "",
    source: "ELECTRONIC" as "ELECTRONIC" | "MANUAL",
    taxType: "TAXABLE" as "TAXABLE" | "ZERO_RATED" | "EXEMPT",
    totalAmount: "",
    contractDate: new Date().toISOString().slice(0, 10),
    memo: "",
  });
  const [doc, setDoc] = useState<{ documentName: string; documentPath: string } | null>(null);

  const [rows, setRows] = useState<Row[]>([
    { kind: "DOWN_PAYMENT", label: "계약금", plannedAmount: "", dueDate: "" },
    { kind: "BALANCE", label: "잔금", plannedAmount: "", dueDate: "" },
  ]);

  const rowsSum = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.plannedAmount) || 0), 0),
    [rows]
  );
  const total = Number(form.totalAmount) || 0;
  const diff = total - rowsSum;

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow(kind: Row["kind"]) {
    const count = rows.filter((r) => r.kind === kind).length;
    const label =
      kind === "INTERIM"
        ? `중도금 ${count + 1}차`
        : kind === "DOWN_PAYMENT"
        ? "계약금"
        : "잔금";
    setRows((rs) => [...rs, { kind, label, plannedAmount: "", dueDate: "" }]);
  }
  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  // 균등 분할 도우미
  function splitEven() {
    if (total <= 0 || rows.length === 0) return;
    const each = Math.floor(total / rows.length);
    const remainder = total - each * rows.length;
    setRows((rs) =>
      rs.map((r, i) => ({
        ...r,
        plannedAmount: String(each + (i === rs.length - 1 ? remainder : 0)),
      }))
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "업로드 실패");
      setDoc(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title || !form.clientName) {
      setError("계약명과 거래처는 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalAmount: Number(form.totalAmount) || 0,
          documentName: doc?.documentName,
          documentPath: doc?.documentPath,
          installments: rows
            .filter((r) => Number(r.plannedAmount) > 0)
            .map((r, idx) => ({
              kind: r.kind,
              label: r.label,
              seq: idx + 1,
              plannedAmount: Number(r.plannedAmount),
              dueDate: r.dueDate || null,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      router.push(`/contracts/${json.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-3 gap-4">
      {/* 기본 정보 */}
      <div className="card p-5 lg:col-span-2 space-y-4">
        <h2 className="font-semibold text-slate-800">기본 정보</h2>

        <div>
          <label className="label">계약서 종류 *</label>
          <div className="flex gap-2">
            {(["ELECTRONIC", "MANUAL"] as const).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => update("source", s)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium ${
                  form.source === s
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s === "ELECTRONIC" ? "🖥️ 전자 계약서" : "✍️ 수기 계약서"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">계약명 / 프로젝트명 *</label>
            <input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="예: ERP 구축 용역" />
          </div>
          <div>
            <label className="label">거래처(고객)명 *</label>
            <input className="input" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="예: (주)한빛물산" />
          </div>
          <div>
            <label className="label">사업자등록번호</label>
            <input className="input" value={form.clientBizNo} onChange={(e) => update("clientBizNo", e.target.value)} placeholder="000-00-00000" />
          </div>
          <div>
            <label className="label">계약일 *</label>
            <input type="date" className="input" value={form.contractDate} onChange={(e) => update("contractDate", e.target.value)} />
          </div>
          <div>
            <label className="label">과세유형</label>
            <select className="input" value={form.taxType} onChange={(e) => update("taxType", e.target.value)}>
              <option value="TAXABLE">과세 (부가세 10%)</option>
              <option value="ZERO_RATED">영세율 (0%)</option>
              <option value="EXEMPT">면세</option>
            </select>
          </div>
          <div>
            <label className="label">총 계약금액 (부가세 포함, 원) *</label>
            <input type="number" className="input" value={form.totalAmount} onChange={(e) => update("totalAmount", e.target.value)} placeholder="예: 66000000" />
          </div>
        </div>

        <div>
          <label className="label">메모</label>
          <textarea className="input min-h-[70px]" value={form.memo} onChange={(e) => update("memo", e.target.value)} />
        </div>

        <div>
          <label className="label">계약서 파일 첨부 (수기 스캔본 / 전자계약 PDF · 20MB 이하)</label>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFile} className="text-sm" />
          {uploading && <div className="text-xs text-slate-400 mt-1">업로드 중...</div>}
          {doc && (
            <div className="mt-2 text-xs text-emerald-600">✓ 첨부됨: {doc.documentName}</div>
          )}
        </div>
      </div>

      {/* 회차 구성 */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">납입 회차</h2>
          <button type="button" onClick={splitEven} className="text-xs text-brand-600 hover:underline">
            균등 분할
          </button>
        </div>

        <div className="space-y-2.5">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <select
                  className="rounded border border-slate-300 text-xs px-1.5 py-1"
                  value={r.kind}
                  onChange={(e) => updateRow(idx, { kind: e.target.value as Row["kind"] })}
                >
                  <option value="DOWN_PAYMENT">계약금</option>
                  <option value="INTERIM">중도금</option>
                  <option value="BALANCE">잔금</option>
                </select>
                <input
                  className="flex-1 rounded border border-slate-300 text-xs px-2 py-1"
                  value={r.label}
                  onChange={(e) => updateRow(idx, { label: e.target.value })}
                  placeholder="표시명"
                />
                <button type="button" onClick={() => removeRow(idx)} className="text-slate-400 hover:text-red-500 text-sm px-1">
                  ✕
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 rounded border border-slate-300 text-xs px-2 py-1"
                  value={r.plannedAmount}
                  onChange={(e) => updateRow(idx, { plannedAmount: e.target.value })}
                  placeholder="금액"
                />
                <input
                  type="date"
                  className="rounded border border-slate-300 text-xs px-2 py-1"
                  value={r.dueDate}
                  onChange={(e) => updateRow(idx, { dueDate: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button type="button" onClick={() => addRow("DOWN_PAYMENT")} className="text-xs btn-ghost py-1 px-2">+ 계약금</button>
          <button type="button" onClick={() => addRow("INTERIM")} className="text-xs btn-ghost py-1 px-2">+ 중도금</button>
          <button type="button" onClick={() => addRow("BALANCE")} className="text-xs btn-ghost py-1 px-2">+ 잔금</button>
        </div>

        <div className="border-t border-slate-100 pt-3 text-sm space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>회차 합계</span>
            <span className="tabular-nums">{formatWon(rowsSum)} 원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">총 계약금액</span>
            <span className="tabular-nums font-medium">{formatWon(total)} 원</span>
          </div>
          <div className={`flex justify-between font-medium ${diff === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            <span>차액</span>
            <span className="tabular-nums">{formatWon(diff)} 원</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 flex items-center gap-3">
        {error && <span className="text-sm text-red-600">{error}</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            취소
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "저장 중..." : "계약 등록"}
          </button>
        </div>
      </div>
    </form>
  );
}
