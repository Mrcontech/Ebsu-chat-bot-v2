import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Badge, buttonClass, EmptyState, formatDate, Stat } from "@/components/admin/ui";
import { getDashboardStats, getTopicActivity, listTestQuestions, listUnanswered } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { evaluate } from "@/lib/evaluate";
import { getThresholds, loadIndex } from "@/lib/kb";

export const metadata: Metadata = { title: "Dashboard" };

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "0%");

export default async function DashboardPage() {
  await requireAdmin();
  const [stats, topics, unanswered, tests, { index, records }, thresholds] = await Promise.all([
    getDashboardStats(),
    getTopicActivity(),
    listUnanswered("pending"),
    listTestQuestions(),
    loadIndex(),
    getThresholds(),
  ]);

  const cases = tests
    .filter((t) => t.set_name === "test" && (t.expected_outcome === "fallback" || t.expected_qa_id))
    .map((t) => ({ question: t.question, expectId: t.expected_outcome === "fallback" ? null : t.expected_qa_id }));
  const { summary } = evaluate(index, cases, thresholds, (id) => records.get(id)?.question ?? `#${id}`);

  const enquiries = stats.answered + stats.suggested + stats.fallback;
  const rated = stats.helpful + stats.notHelpful;
  const maxTopic = Math.max(1, ...topics.map((t) => Number(t.n)));

  return (
    <AdminPage
      title="Dashboard"
      description="How the chatbot is being used and what it could not answer."
      actions={
        <Link href="/admin/knowledge/new" className={buttonClass.primary}>
          <PlusIcon size={16} weight="bold" /> Add question
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Answers in the knowledge base" value={stats.answers} note={`${stats.phrasings} phrasings in total`} />
        <Stat label="Questions asked" value={stats.messages} note={`${stats.messagesToday} today`} />
        <Stat label="Answered directly" value={pct(stats.answered, enquiries)} note={`${stats.answered} of ${enquiries} enquiries`} />
        <Stat label="Waiting for an answer" value={stats.pendingUnanswered} note="On the Unanswered list" />
        <Stat label="Rated helpful" value={rated ? pct(stats.helpful, rated) : "No ratings"} note={`${rated} ${rated === 1 ? "rating" : "ratings"}`} />
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-[1.25fr_1fr]">
        <section className="rounded-[18px] border border-line p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold">Latest unanswered questions</h2>
            <Link href="/admin/unanswered" className={buttonClass.quiet}>
              See all <ArrowRightIcon size={14} />
            </Link>
          </div>
          {unanswered.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Nothing waiting" text="When a student asks something the bot cannot answer, it appears here." />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col">
              {unanswered.slice(0, 6).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-t-0">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-ink">{u.question}</span>
                    <span className="text-[12.5px] text-ink-3">
                      Asked {u.times_asked} {u.times_asked === 1 ? "time" : "times"}, last {formatDate(u.last_asked_at)}
                    </span>
                  </span>
                  <Link href={`/admin/knowledge/new?from=${u.id}`} className={`${buttonClass.quiet} shrink-0 text-accent-ink`}>
                    Answer
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <section className="rounded-[18px] border border-line p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[16px] font-semibold">Accuracy on the 30 test questions</h2>
              <Link href="/admin/test" className={buttonClass.quiet}>
                Details <ArrowRightIcon size={14} />
              </Link>
            </div>
            <p className="tabular mt-3 text-[34px] font-semibold tracking-tight">
              {summary.correct}/{summary.total}
              <span className="ml-2 text-[16px] font-medium text-ink-2">{Math.round(summary.accuracy * 100)}% correct</span>
            </p>
            <p className="mt-1 text-[13px] text-ink-3">
              Recalculated live with the current knowledge base and thresholds (answer {thresholds.answer.toFixed(2)}, suggest {thresholds.suggest.toFixed(2)}).
            </p>
          </section>

          <section className="rounded-[18px] border border-line p-5">
            <h2 className="text-[16px] font-semibold">Most asked topics</h2>
            {topics.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink-3">No answered questions yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {topics.map((t) => (
                  <li key={t.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                    <span className="text-[14px]">{t.name}</span>
                    <Badge>{t.n}</Badge>
                    <span className="col-span-2 h-1 rounded-full bg-accent/80" style={{ width: `${(Number(t.n) / maxTopic) * 100}%` }} aria-hidden />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminPage>
  );
}
