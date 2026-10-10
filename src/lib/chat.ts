import { createHash } from "node:crypto";
import { execute } from "./db";
import { getOffices, getThresholds, loadIndex, type Office } from "./kb";
import { match, type Candidate, type MatchResult } from "./nlp/matcher";
import { DEFAULT_OFFICE, routeToOffice } from "./routing";

export const MAX_MESSAGE_LENGTH = 500;

export type ReplyKind = "answer" | "suggestions" | "fallback" | "smalltalk" | "empty";

export type OfficeCard = Pick<Office, "name" | "handles" | "email" | "phone" | "location" | "website">;

export type Explanation = {
  cleaned: string;
  corrections: { from: string; to: string }[];
  rulesApplied: { phrase: string; canonical: string; kind: string }[];
  tokens: string[];
  stems: string[];
  candidates: Pick<Candidate, "question" | "phrasing" | "cosine" | "trigram" | "score">[];
  thresholds: { answer: number; suggest: number };
  decision: MatchResult["decision"];
};

export type BotReply = {
  logId: number | null;
  kind: ReplyKind;
  text: string;
  confidence: number | null;
  qa?: { id: number; question: string; category: string; sourceUrl: string | null; sourceNote: string | null };
  office?: OfficeCard;
  /** General contact, shown when the routed office has no published email or phone. */
  generalOffice?: OfficeCard;
  suggestions?: { id: number; question: string }[];
  explanation: Explanation;
};

function toCard(office: Office | undefined): OfficeCard | undefined {
  if (!office) return undefined;
  const { name, handles, email, phone, location, website } = office;
  return { name, handles, email, phone, location, website };
}

function explain(result: MatchResult): Explanation {
  const { analysis, candidates, thresholds, decision } = result;
  return {
    cleaned: analysis.cleaned,
    corrections: analysis.corrections,
    rulesApplied: analysis.rulesApplied,
    tokens: analysis.tokens,
    stems: analysis.stems,
    candidates: candidates.map(({ question, phrasing, cosine, trigram, score }) => ({ question, phrasing, cosine, trigram, score })),
    thresholds,
    decision,
  };
}

/** Group repeats of the same unanswered question ("hostel fees?" and "fees hostel") together. */
function normKey(stems: string[]): string {
  const key = [...new Set(stems)].sort().join(" ");
  return createHash("sha256").update(key).digest("hex");
}

/** The whole journey of one student message: match, reply, log. */
export async function handleMessage(rawMessage: string, sessionId: string | null): Promise<BotReply> {
  const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);
  const [{ index, records }, thresholds, offices] = await Promise.all([loadIndex(), getThresholds(), getOffices()]);
  const officeBySlug = new Map(offices.map((o) => [o.slug, o]));
  const officeById = new Map(offices.map((o) => [o.id, o]));

  const result = match(index, message, thresholds, 5);
  const best = result.best;
  const explanation = explain(result);

  let reply: Omit<BotReply, "logId">;
  let matchedQaId: number | null = null;

  if ((result.decision === "answered" || result.decision === "smalltalk") && best) {
    const record = records.get(best.entryId)!;
    matchedQaId = record.id;
    reply = {
      kind: result.decision === "smalltalk" ? "smalltalk" : "answer",
      text: record.answer,
      confidence: best.score,
      qa: {
        id: record.id,
        question: record.question,
        category: record.category_name,
        sourceUrl: record.source_url,
        sourceNote: record.source_note,
      },
      office: record.office_id ? toCard(officeById.get(record.office_id)) : undefined,
      explanation,
    };
  } else if (result.decision === "suggested" && best) {
    const suggestions = result.candidates
      .filter((c) => c.score >= thresholds.suggest && !index.entries.get(c.entryId)?.smallTalk)
      .slice(0, 3)
      .map((c) => ({ id: c.entryId, question: c.question }));
    matchedQaId = best.entryId;
    reply = {
      kind: "suggestions",
      text: "I am not fully sure what you mean. Did you mean one of these?",
      confidence: best.score,
      suggestions,
      office: toCard(officeBySlug.get(routeToOffice(result.analysis.tokens)) ?? officeBySlug.get(DEFAULT_OFFICE)),
      explanation,
    };
  } else if (result.decision === "empty") {
    reply = {
      kind: "empty",
      text: "Please type your question in a few more words. For example: How do I check my admission status?",
      confidence: null,
      explanation,
    };
  } else {
    const office = officeBySlug.get(routeToOffice(result.analysis.tokens)) ?? officeBySlug.get(DEFAULT_OFFICE);
    const general = officeBySlug.get(DEFAULT_OFFICE);
    const reachable = Boolean(office?.email || office?.phone);
    reply = {
      kind: "fallback",
      text: "I don't have that answer yet. I have saved your question so the knowledge base can be updated. For now, please contact the office below.",
      confidence: best?.score ?? 0,
      office: toCard(office),
      generalOffice: !reachable && general && general.slug !== office?.slug ? toCard(general) : undefined,
      explanation,
    };
  }

  const outcome = { answer: "answered", suggestions: "suggested", fallback: "fallback", smalltalk: "smalltalk", empty: "empty" }[reply.kind];
  const log = await execute(
    "INSERT INTO chat_logs (session_id, message, normalized, outcome, matched_qa_id, score) VALUES (?, ?, ?, ?, ?, ?)",
    [sessionId?.slice(0, 64) ?? null, message, result.analysis.tokens.join(" ").slice(0, 1000), outcome, matchedQaId, best?.score ?? null],
  );

  if ((reply.kind === "fallback" || reply.kind === "suggestions") && result.analysis.stems.length > 0) {
    const officeId = reply.office ? (offices.find((o) => o.name === reply.office?.name)?.id ?? null) : null;
    await execute(
      `INSERT INTO unanswered_questions (question, norm_key, best_score, best_qa_id, office_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE times_asked = times_asked + 1, last_asked_at = NOW(), question = VALUES(question),
         best_score = VALUES(best_score), best_qa_id = VALUES(best_qa_id),
         status = IF(status = 'resolved', 'pending', status)`,
      [message, normKey(result.analysis.stems), best?.score ?? null, best?.entryId ?? null, officeId],
    );
  }

  return { logId: log.insertId, ...reply };
}

/** Thumbs up / down on an answer. Only the browser session that asked can rate it. */
export async function recordFeedback(logId: number, value: 1 | -1, sessionId: string | null): Promise<boolean> {
  const result = await execute("UPDATE chat_logs SET feedback = ? WHERE id = ? AND session_id <=> ?", [
    value,
    logId,
    sessionId?.slice(0, 64) ?? null,
  ]);
  return result.affectedRows > 0;
}
