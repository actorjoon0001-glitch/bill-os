"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatKRW, formatWon, toDateStr } from "@/lib/finance";
import { TaxBadge, EmptyState } from "@/components/ui";

type Expense = {
  id: string;
  expenseDate: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  taxType: string;
  contractNo: string | null;
  contractTitle: string | null;
  vat: number;
};

type ContractOpt = { id: string; contractNo: string; title: string };

const CATEGORIES = [
  "인건비",
  "외주비",
  "임차료",
  "자재비",
  "광고선전비",
  "복리후생비",
  "지급수수료",
  "클라우드",
  "여비교통비",
  "기타",
];

export default function ExpensesClient({
  expenses,
  contracts,
}: {
  expenses: Expense[];
  contracts: ContractOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "외주비",
    vendor: "",
    description: "",
    amount: "",
    taxType: "TAXABLE",
    contractId: "",
  });

  function up(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.amount || Number(form.amount) <= 0) {
      setError("금액을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount), contractId: form.contractId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "등록 실패");
      setOpen(false);
      setForm((f) => ({ ...f, vendor: "", description: "", amount: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 비용을 삭제할까요?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setOpen((o) => !o)} className="btn-primary">
          {open ? "닫기" : "+ 비용 등록"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="card p-5 mb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="label">지출일 *</label>
            <input type="date" className="input" value={form.expenseDate} onChange={(e) => up("expenseDate", e.target.value)} />
          </div>
          <div>
            <label className="label">항목 *</label>
            <select className="input" value={form.category} onChange={(e) => up("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">거래처</label>
            <input className="input" value={form.vendor} onChange={(e) => up("vendor", e.target.value)} placeholder="예: AWS" />
          </div>
          <div>
            <label className="label">금액 (부가세 포함, 원) *</label>
            <input type="number" className="input" value={form.amount} onChange={(e) => up("amount", e.target.value)} />
          </div>
          <div>
            <label className="label">매입 과세유형</label>
            <select className="input" value={form.taxType} onChange={(e) => up("taxType", e.target.value)}>
              <option value="TAXABLE">과세 (매입세액 공제)</option>
              <option value="EXEMPT">면세 (공제 불가)</option>
              <option value="ZERO_RATED">영세율</option>
            </select>
          </div>
          <div>
            <label className="label">연결 계약 (선택)</label>
            <select className="input" value={form.contractId} onChange={(e) => up("contractId", e.target.value)}>
              <option value="">연결 안 함</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.contractNo} · {c.title}</option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="label">내용</label>
            <input className="input" value={form.description} onChange={(e) => up("description", e.target.value)} />
          </div>
          <div className="lg:col-span-3 flex items-center gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <button type="submit" disabled={saving} className="btn-primary ml-auto">
              {saving ? "저장 중..." : "등록"}
            </button>
          </div>
        </form>
      )}

      {expenses.length === 0 ? (
        <EmptyState>등록된 비용이 없습니다.</EmptyState>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="th">지출일</th>
                  <th className="th">항목 / 거래처</th>
                  <th className="th">과세</th>
                  <th className="th">연결 계약</th>
                  <th className="th text-right">부가세</th>
                  <th className="th text-right">금액</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/60">
                    <td className="td whitespace-nowrap text-slate-500">{toDateStr(e.expenseDate)}</td>
                    <td className="td">
                      <div className="font-medium text-slate-800">{e.category}</div>
                      <div className="text-xs text-slate-500">
                        {e.vendor}{e.vendor && e.description ? " · " : ""}{e.description}
                      </div>
                    </td>
                    <td className="td"><TaxBadge taxType={e.taxType} /></td>
                    <td className="td text-xs text-slate-500">{e.contractNo ?? "-"}</td>
                    <td className="td text-right tabular-nums text-slate-500">{formatWon(e.vat)}</td>
                    <td className="td text-right tabular-nums font-semibold">{formatKRW(e.amount)}</td>
                    <td className="td text-right">
                      <button onClick={() => remove(e.id)} className="text-slate-300 hover:text-red-500 text-sm">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
