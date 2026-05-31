import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  padding = true,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)] ${
        padding ? "p-6" : ""
      } ${hover ? "transition-shadow hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
  dot = false,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  dot?: boolean;
}) {
  const styles = {
    default: "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-500/25",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-500/20",
    info: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20",
  };
  const dotColors = {
    default: "bg-slate-400",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-indigo-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${styles[variant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const sizes = { sm: "px-3.5 py-2 text-xs gap-1.5", md: "px-4 py-2.5 text-sm gap-2" };
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-indigo-500/20 focus-visible:ring-brand-500",
    secondary:
      "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  highlight,
  accent = "indigo",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  highlight?: boolean;
  accent?: "indigo" | "amber" | "emerald" | "sky";
}) {
  const accents = {
    indigo: "from-indigo-500/10 to-indigo-600/5 text-indigo-600",
    amber: "from-amber-500/15 to-amber-600/5 text-amber-600",
    emerald: "from-emerald-500/10 to-emerald-600/5 text-emerald-600",
    sky: "from-sky-500/10 to-sky-600/5 text-sky-600",
  };
  return (
    <Card
      hover
      className={`relative overflow-hidden ${highlight ? "ring-2 ring-amber-400/40 border-amber-200/80" : ""}`}
    >
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      )}
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums tracking-tight">{value}</p>
          {trend && <p className="text-xs text-slate-400 mt-2">{trend}</p>}
        </div>
        <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${accents[accent]}`}>{icon}</div>
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
        {icon ?? <Inbox size={24} strokeWidth={1.5} />}
      </div>
      <p className="text-slate-900 font-semibold">{title}</p>
      {description && <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto">{description}</p>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
      <Loader2 size={28} className="animate-spin text-brand-500" />
      <p className="text-sm font-medium">{label}…</p>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex gap-1 p-1.5 bg-white border border-slate-200/80 rounded-xl shadow-sm mb-6">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            active === t.id
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          {t.label}
          {t.count != null && t.count > 0 && (
            <span
              className={`ml-1.5 px-1.5 py-0.5 rounded-md text-xs ${
                active === t.id ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{children}</label>;
}

export function Alert({
  children,
  variant = "info",
}: {
  children: ReactNode;
  variant?: "success" | "error" | "info";
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    error: "bg-red-50 text-red-800 border-red-200/80",
    info: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
  };
  return (
    <div className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium border ${styles[variant]}`} role="alert">
      {children}
    </div>
  );
}

export function PageError({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  if (!message) return null;
  return (
    <Alert variant="error">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-red-700 font-semibold underline underline-offset-2 hover:text-red-900"
        >
          {retryLabel}
        </button>
      )}
    </Alert>
  );
}

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-sm font-bold text-slate-900 ${className}`}>{children}</h2>;
}

export function DataTable({
  columns,
  rows,
  emptyTitle = "No data",
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: ReactNode[] }[];
  emptyTitle?: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} />;
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-400 ${c.className ?? ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
              {row.cells.map((cell, i) => (
                <td key={i} className={`px-6 py-4 text-slate-700 ${columns[i]?.className ?? ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordCard({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card hover className="!p-0 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="flex-1 p-6">{children}</div>
        {actions && (
          <div className="flex lg:flex-col gap-2 p-4 lg:p-6 lg:w-44 lg:border-l border-slate-100 bg-slate-50/50 lg:justify-center shrink-0">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
}
