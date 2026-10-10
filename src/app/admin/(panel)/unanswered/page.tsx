import { ArrowCounterClockwiseIcon, LinkIcon, PencilSimpleLineIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { attachVariantAction, setUnansweredStatusAction } from "@/app/admin/actions";
import { AdminPage } from "@/components/admin/admin-shell";
import { Badge, buttonClass, EmptyState, formatDate, inputClass, Notice, Tabs } from "@/components/admin/ui";
import { listQaOptions, listUnanswered } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatScore } from "@/lib/format";

export const metadata: Metadata = { title: "Unanswered questions" };

const STATUSES = ["pending", "resolved", "dismissed"] as const;

export default async function UnansweredPage({ searchParams }: { searchParams: Promise<{ status?: string; linked?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? (params.status as (typeof STATUSES)[number]) : "pending";
  const [rows, options, counts] = await Promise.all([
    listUnanswered(status),
    listQaOptions(),
    query<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM unanswered_questions GROUP BY status"),
  ]);
  const count = (s: string) => Number(counts.find((c) => c.status === s)?.n ?? 0);

  return (
    <AdminPage
      title="Unanswered questions"
      description="Questions the bot could not answer with confidence. Write a new answer, or link the question to an existing answer as another phrasing."
    >
      <div className="flex flex-col gap-4">
        {params.linked ? <Notice>Linked. The bot will now answer that question.</Notice> : null}
        <Tabs
          current={status}
          items={[
            { value: "pending", label: "Waiting", href: "/admin/unanswered", count: count("pending") },
            { value: "resolved", label: "Answered", href: "/admin/unanswered?status=resolved", count: count("resolved") },
            { value: "dismissed", label: "Dismissed", href: "/admin/unanswered?status=dismissed", count: count("dismissed") },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            title={status === "pending" ? "Nothing is waiting" : "Nothing here yet"}
            text={
              status === "pending"
                ? "When a student asks something the bot cannot answer, it appears here with how many times it was asked."
                : "Questions move here when you answer or dismiss them."
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((u) => (
              <li key={u.id} className="rounded-[16px] border border-line p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">&ldquo;{u.question}&rdquo;</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
                      <Badge tone={u.times_asked > 2 ? "warn" : "neutral"}>
                        Asked {u.times_asked} {u.times_asked === 1 ? "time" : "times"}
                      </Badge>
                      <span>Last asked {formatDate(u.last_asked_at)}</span>
                      {u.office_name ? <span>Referred to {u.office_name}</span> : null}
                    </p>
                    {u.best_question ? (
                      <p className="mt-2 text-[13px] text-ink-2">
                        Closest stored question: <span className="text-ink">{u.best_question}</span>{" "}
                        <span className="tabular text-ink-3">(score {formatScore(Number(u.best_score ?? 0))})</span>
                      </p>
                    ) : null}
                  </div>

                  {status === "pending" ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link href={`/admin/knowledge/new?from=${u.id}`} className={buttonClass.primary}>
                        <PencilSimpleLineIcon size={16} /> Write an answer
                      </Link>
                      <form action={setUnansweredStatusAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <button type="submit" className={buttonClass.secondary}>
                          <XIcon size={15} /> Dismiss
                        </button>
                      </form>
                    </div>
                  ) : status === "dismissed" ? (
                    <form action={setUnansweredStatusAction} className="shrink-0">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="status" value="pending" />
                      <button type="submit" className={buttonClass.secondary}>
                        <ArrowCounterClockwiseIcon size={15} /> Move back to waiting
                      </button>
                    </form>
                  ) : u.resolved_qa_id ? (
                    <Link href={`/admin/knowledge/${u.resolved_qa_id}`} className={`${buttonClass.secondary} shrink-0`}>
                      Open the answer
                    </Link>
                  ) : null}
                </div>

                {status === "pending" ? (
                  <form action={attachVariantAction} className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center">
                    <input type="hidden" name="id" value={u.id} />
                    <label htmlFor={`qa-${u.id}`} className="shrink-0 text-[13px] font-medium text-ink-2">
                      Same as an existing answer?
                    </label>
                    <select id={`qa-${u.id}`} name="qa_id" defaultValue={u.best_qa_id ?? ""} required className={`${inputClass} py-2 text-[14px] sm:max-w-[460px]`}>
                      <option value="">Choose the answer it should give</option>
                      {options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.category_name}: {o.question}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={`${buttonClass.secondary} shrink-0`}>
                      <LinkIcon size={15} /> Add as a phrasing
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminPage>
  );
}
