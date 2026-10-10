import type { Explanation } from "@/lib/chat";
import { formatScore } from "@/lib/format";

const DECISION_TEXT: Record<Explanation["decision"], string> = {
  answered: "Answered: the best score reached the answer threshold.",
  smalltalk: "Small talk: matched a greeting or courtesy phrase.",
  suggested: "Not sure: the best score was between the two thresholds, so I offered choices.",
  fallback: "No match: every score was below the suggestion threshold, so I referred you to an office.",
  empty: "Nothing to match: no meaningful words were left after cleaning.",
};

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-[13px] text-ink-3">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={`${item}-${i}`} className="rounded-[8px] border border-line bg-surface px-2 py-0.5 text-[12.5px] text-ink-2">
          {item}
        </span>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[13px] font-medium text-ink-2">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** "How I matched this": every stage of the NLP pipeline for one message, with the scores. */
export function MatchDetails({ explanation }: { explanation: Explanation }) {
  const { thresholds } = explanation;
  return (
    <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface-2 p-4">
      <dl className="flex flex-col gap-3">
        <Row label="Cleaned text">
          <code className="break-words text-[13px] text-ink">{explanation.cleaned || "(empty)"}</code>
        </Row>
        <Row label="Typo fixes">
          <Chips items={explanation.corrections.map((c) => `${c.from} to ${c.to}`)} empty="None needed" />
        </Row>
        <Row label="Language rules">
          <Chips
            items={explanation.rulesApplied.map((r) => `${r.phrase} = ${r.canonical || "(ignored)"} (${r.kind})`)}
            empty="None applied"
          />
        </Row>
        <Row label="Keywords kept">
          <Chips items={explanation.tokens} empty="None" />
        </Row>
        <Row label="Word roots">
          <Chips items={explanation.stems} empty="None" />
        </Row>
      </dl>

      {explanation.candidates.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left text-[13px]">
            <caption className="mb-2 text-left text-[13px] font-medium text-ink-2">
              Closest stored questions (answer at {thresholds.answer.toFixed(2)} or more, suggest from {thresholds.suggest.toFixed(2)})
            </caption>
            <thead className="text-ink-3">
              <tr>
                <th className="py-1.5 pr-3 font-medium">Stored question</th>
                <th className="tabular py-1.5 pr-3 text-right font-medium">TF-IDF</th>
                <th className="tabular py-1.5 pr-3 text-right font-medium">Trigram</th>
                <th className="tabular py-1.5 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {explanation.candidates.map((c, i) => {
                const pass = c.score >= thresholds.answer;
                const near = !pass && c.score >= thresholds.suggest;
                return (
                  <tr key={`${c.question}-${i}`} className="border-t border-line align-top">
                    <td className="py-2 pr-3 text-ink">
                      {c.question}
                      {c.phrasing !== c.question ? <span className="block text-[12px] text-ink-3">via &ldquo;{c.phrasing}&rdquo;</span> : null}
                    </td>
                    <td className="tabular py-2 pr-3 text-right text-ink-2">{formatScore(c.cosine)}</td>
                    <td className="tabular py-2 pr-3 text-right text-ink-2">{formatScore(c.trigram)}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`tabular inline-block min-w-[3.2rem] rounded-[7px] px-1.5 py-0.5 text-center font-semibold ${
                          pass ? "bg-good-soft text-good" : near ? "bg-warn-soft text-warn" : "text-ink-3"
                        }`}
                      >
                        {formatScore(c.score)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-ink-3">Score = 0.8 x TF-IDF cosine similarity + 0.2 x character-trigram similarity.</p>
        </div>
      ) : null}

      <p className="text-[13px] font-medium text-ink">{DECISION_TEXT[explanation.decision]}</p>
    </div>
  );
}
