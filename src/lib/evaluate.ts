/**
 * Accuracy testing for the matcher. Used by the admin Test bench page and by
 * `npm run evaluate` (which writes the tables used in Chapter 4).
 *
 * Each test question either expects a particular stored answer, or expects
 * the bot to fall back ("I don't have that yet") because the question is out
 * of scope. Outcomes:
 *   correct answer      in scope, and the bot gave the expected answer
 *   wrong answer        the bot answered with a different entry
 *   suggested           the bot was unsure and offered choices instead
 *   missed              in scope, but the bot fell back
 *   correct fallback    out of scope, and the bot fell back
 *   false answer        out of scope, but the bot gave an answer anyway
 */
import { match, type MatcherIndex, type Thresholds } from "./nlp/matcher";

export type TestCase = { question: string; expectId: number | null; style?: string | null };

export type Outcome = "correct answer" | "wrong answer" | "suggested" | "missed" | "correct fallback" | "false answer";

export type TestRow = {
  question: string;
  style: string | null;
  expected: string;
  got: string;
  decision: string;
  score: number;
  outcome: Outcome;
  correct: boolean;
  expectedWasSuggested: boolean;
};

export type TestSummary = {
  total: number;
  correct: number;
  accuracy: number;
  inScope: number;
  inScopeCorrect: number;
  outOfScope: number;
  outOfScopeCorrect: number;
  counts: Record<Outcome, number>;
  precision: number; // of the answers given, how many were right
  recall: number; // of the in-scope questions, how many got the right answer
};

export function evaluate(
  index: MatcherIndex,
  cases: TestCase[],
  thresholds: Thresholds,
  questionOf: (id: number) => string,
): { rows: TestRow[]; summary: TestSummary } {
  const rows: TestRow[] = cases.map((c) => {
    const result = match(index, c.question, thresholds, 5);
    const best = result.best;
    const answered = result.decision === "answered" || result.decision === "smalltalk";
    const suggestedIds = result.decision === "suggested" ? result.candidates.filter((x) => x.score >= thresholds.suggest).map((x) => x.entryId) : [];

    let outcome: Outcome;
    if (c.expectId !== null) {
      if (answered) outcome = best?.entryId === c.expectId ? "correct answer" : "wrong answer";
      else if (result.decision === "suggested") outcome = "suggested";
      else outcome = "missed";
    } else {
      outcome = answered ? "false answer" : "correct fallback";
    }

    return {
      question: c.question,
      style: c.style ?? null,
      expected: c.expectId !== null ? questionOf(c.expectId) : "(fallback)",
      got: answered && best ? questionOf(best.entryId) : result.decision === "suggested" ? "(suggestions)" : "(fallback)",
      decision: result.decision,
      score: best?.score ?? 0,
      outcome,
      correct: outcome === "correct answer" || outcome === "correct fallback",
      expectedWasSuggested: c.expectId !== null && suggestedIds.includes(c.expectId),
    };
  });

  const counts = { "correct answer": 0, "wrong answer": 0, suggested: 0, missed: 0, "correct fallback": 0, "false answer": 0 } as Record<Outcome, number>;
  for (const r of rows) counts[r.outcome] += 1;
  const inScope = cases.filter((c) => c.expectId !== null).length;
  const answersGiven = counts["correct answer"] + counts["wrong answer"] + counts["false answer"];
  const correct = counts["correct answer"] + counts["correct fallback"];

  return {
    rows,
    summary: {
      total: rows.length,
      correct,
      accuracy: rows.length ? correct / rows.length : 0,
      inScope,
      inScopeCorrect: counts["correct answer"],
      outOfScope: rows.length - inScope,
      outOfScopeCorrect: counts["correct fallback"],
      counts,
      precision: answersGiven ? counts["correct answer"] / answersGiven : 0,
      recall: inScope ? counts["correct answer"] / inScope : 0,
    },
  };
}
