import Link from "next/link";
import type { ReactNode } from "react";

export const buttonClass = {
  primary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent-strong px-4 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:bg-line-strong disabled:text-ink-3",
  secondary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.98]",
  quiet: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
  danger:
    "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-bad/30 bg-bad-soft px-4 text-[14px] font-semibold text-bad transition-colors hover:bg-bad/10 active:scale-[0.98]",
};

export const inputClass =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent-strong focus:ring-2 focus:ring-accent/20";

export function Field({ label, htmlFor, help, children }: { label: string; htmlFor: string; help?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink">
        {label}
      </label>
      {children}
      {help ? <p className="text-[13px] text-ink-3">{help}</p> : null}
    </div>
  );
}

const TONES = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-canvas text-ink-2",
  accent: "bg-accent-soft text-accent-ink",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

export const OUTCOME_TONE: Record<string, keyof typeof TONES> = {
  answered: "good",
  "correct answer": "good",
  "correct fallback": "good",
  smalltalk: "neutral",
  suggested: "warn",
  fallback: "bad",
  empty: "neutral",
  missed: "bad",
  "wrong answer": "bad",
  "false answer": "bad",
};

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[16px] border border-line bg-surface-2 p-4">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <span className="tabular text-[28px] font-semibold leading-tight tracking-tight text-ink">{value}</span>
      {note ? <span className="text-[12.5px] text-ink-3">{note}</span> : null}
    </div>
  );
}

export function Tabs({ items, current }: { items: { href: string; label: string; value: string; count?: number }[]; current: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist">
      {items.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          role="tab"
          aria-selected={t.value === current}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            t.value === current ? "border-accent-strong bg-accent-strong text-white" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined ? <span className="tabular opacity-80">{t.count}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function Notice({ tone = "good", children }: { tone?: "good" | "bad" | "warn"; children: ReactNode }) {
  return <p className={`rounded-[12px] px-4 py-3 text-[14px] ${TONES[tone]}`}>{children}</p>;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="text-[16px] font-semibold">{title}</p>
      <p className="max-w-[48ch] text-[14px] text-ink-2">{text}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function formatDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
