import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { Badge, OUTCOME_TONE, Stat, Tabs } from "@/components/admin/ui";
import { listTestQuestions } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { evaluate } from "@/lib/evaluate";
import { getThresholds, loadIndex } from "@/lib/kb";

export const metadata: Metadata = { title: "Test bench" };

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function TestBenchPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  await requireAdmin();
  const { set: requested } = await searchParams;
  const set = requested === "dev" ? "dev" : "test";
  const [tests, { index, records }, thresholds] = await Promise.all([listTestQuestions(), loadIndex(), getThresholds()]);

  const chosen = tests.filter((t) => t.set_name === set);
  const usable = chosen.filter((t) => t.expected_outcome === "fallback" || t.expected_qa_id);
  const cases = usable.map((t) => ({ question: t.question, expectId: t.expected_outcome === "fallback" ? null : t.expected_qa_id, style: t.style }));
  const { rows, summary } = evaluate(index, cases, thresholds, (id) => records.get(id)?.question ?? `#${id}`);

  return (
    <AdminPage
      title="Test bench"
      description={`Runs every test question through the live matcher (answer at ${thresholds.answer.toFixed(2)}, suggest from ${thresholds.suggest.toFixed(2)}). Reload the page to run it again after changing answers or thresholds.`}
    >
      <div className="flex flex-col gap-5">
        <Tabs
          current={set}
          items={[
            { value: "test", label: "Test set (held out)", href: "/admin/test", count: tests.filter((t) => t.set_name === "test").length },
            { value: "dev", label: "Development set (used for tuning)", href: "/admin/test?set=dev", count: tests.filter((t) => t.set_name === "dev").length },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Correct" value={`${summary.correct}/${summary.total}`} note={`${pct(summary.accuracy)} accuracy`} />
          <Stat label="In scope answered correctly" value={`${summary.inScopeCorrect}/${summary.inScope}`} note={`Recall ${pct(summary.recall)}`} />
          <Stat label="Out of scope sent to fallback" value={`${summary.outOfScopeCorrect}/${summary.outOfScope}`} note="Should never get an answer" />
          <Stat label="Precision" value={pct(summary.precision)} note="Answers given that were right" />
        </div>
        {chosen.length > usable.length ? (
          <p className="text-[13px] text-warn">{chosen.length - usable.length} test question(s) point to an answer that was deleted and were skipped.</p>
        ) : null}

        <div className="overflow-x-auto rounded-[16px] border border-line">
          <table className="w-full min-w-[900px] text-left text-[14px]">
            <thead className="bg-surface-2 text-[12.5px] text-ink-2">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">Test question</th>
                <th className="px-4 py-3 font-semibold">Style</th>
                <th className="px-4 py-3 font-semibold">Expected</th>
                <th className="px-4 py-3 font-semibold">Bot result</th>
                <th className="px-4 py-3 text-right font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.question}-${i}`} className="border-t border-line align-top">
                  <td className="tabular px-4 py-3 text-ink-3">{i + 1}</td>
                  <td className="max-w-[260px] px-4 py-3 text-ink">{r.question}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-3">{r.style}</td>
                  <td className="max-w-[220px] px-4 py-3 text-ink-2">{r.expected}</td>
                  <td className="max-w-[220px] px-4 py-3 text-ink-2">
                    {r.got}
                    {r.expectedWasSuggested ? <span className="block text-[12px] text-warn">Expected answer was among the suggestions</span> : null}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-ink-2">{r.score.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={OUTCOME_TONE[r.outcome] ?? "neutral"}>{r.outcome}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
}
