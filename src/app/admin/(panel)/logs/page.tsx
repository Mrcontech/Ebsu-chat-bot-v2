import { ThumbsDownIcon, ThumbsUpIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Badge, EmptyState, formatDate, OUTCOME_TONE, Tabs } from "@/components/admin/ui";
import { listLogs } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Chat logs" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "answered", label: "Answered" },
  { value: "suggested", label: "Suggested" },
  { value: "fallback", label: "Fallback" },
  { value: "smalltalk", label: "Small talk" },
];

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ outcome?: string }> }) {
  await requireAdmin();
  const { outcome = "" } = await searchParams;
  const valid = FILTERS.some((f) => f.value === outcome) ? outcome : "";
  const rows = await listLogs(valid);

  return (
    <AdminPage title="Chat logs" description="The latest 200 messages students sent, what the bot did, and how they rated the answer. No names are stored.">
      <div className="flex flex-col gap-4">
        <Tabs current={valid} items={FILTERS.map((f) => ({ value: f.value, label: f.label, href: f.value ? `/admin/logs?outcome=${f.value}` : "/admin/logs" }))} />
        {rows.length === 0 ? (
          <EmptyState title="No messages yet" text="Messages appear here as soon as students use the chat." />
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-line">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="bg-surface-2 text-[12.5px] text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Student message</th>
                  <th className="px-4 py-3 font-semibold">Outcome</th>
                  <th className="px-4 py-3 font-semibold">Matched question</th>
                  <th className="px-4 py-3 text-right font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="tabular whitespace-nowrap px-4 py-3 text-[13px] text-ink-3">{formatDate(r.created_at)}</td>
                    <td className="max-w-[300px] px-4 py-3 text-ink">{r.message}</td>
                    <td className="px-4 py-3">
                      <Badge tone={OUTCOME_TONE[r.outcome] ?? "neutral"}>{r.outcome}</Badge>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-ink-2">{r.matched_question ?? <span className="text-ink-3">None</span>}</td>
                    <td className="tabular px-4 py-3 text-right text-ink-2">{r.score !== null ? Number(r.score).toFixed(2) : ""}</td>
                    <td className="px-4 py-3">
                      {r.feedback === 1 ? (
                        <ThumbsUpIcon size={18} weight="fill" className="text-good" aria-label="Helpful" />
                      ) : r.feedback === -1 ? (
                        <ThumbsDownIcon size={18} weight="fill" className="text-bad" aria-label="Not helpful" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
