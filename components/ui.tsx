import { formatKRW } from "@/lib/finance";

export function PageHeader({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  amount,
  sub,
  tone = "default",
}: {
  label: string;
  amount: number;
  sub?: string;
  tone?: "default" | "positive" | "warning" | "danger";
}) {
  const toneCls = {
    default: "text-slate-800",
    positive: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  }[tone];
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums ${toneCls}`}>
        {formatKRW(amount)}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const isElec = source === "ELECTRONIC";
  return (
    <span
      className={`badge ${
        isElec
          ? "bg-brand-50 text-brand-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isElec ? "전자" : "수기"}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-blue-50 text-blue-700",
    COMPLETED: "bg-emerald-50 text-emerald-700",
    CANCELED: "bg-slate-100 text-slate-500",
  };
  const label: Record<string, string> = {
    ACTIVE: "진행중",
    COMPLETED: "완납",
    CANCELED: "해지",
  };
  return (
    <span className={`badge ${map[status] ?? "bg-slate-100"}`}>
      {label[status] ?? status}
    </span>
  );
}

export function TaxBadge({ taxType }: { taxType: string }) {
  const map: Record<string, string> = {
    TAXABLE: "bg-violet-50 text-violet-700",
    ZERO_RATED: "bg-teal-50 text-teal-700",
    EXEMPT: "bg-slate-100 text-slate-500",
  };
  const label: Record<string, string> = {
    TAXABLE: "과세",
    ZERO_RATED: "영세율",
    EXEMPT: "면세",
  };
  return (
    <span className={`badge ${map[taxType] ?? "bg-slate-100"}`}>
      {label[taxType] ?? taxType}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}
