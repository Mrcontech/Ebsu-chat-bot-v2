// The chat's server side, run in the browser: the same knowledge base, language rules and
// matching engine as the app (src/lib/nlp), answering the requests the chat page sends to
// /api/chat and /api/explain. It mirrors handleMessage() in src/lib/chat.ts without MySQL.
import categoriesSeed from "../../database/seed/categories.json";
import kbSeed from "../../database/seed/knowledge-base.json";
import rulesSeed from "../../database/seed/language-rules.json";
import officesSeed from "../../database/seed/offices.json";
import settingsSeed from "../../database/seed/settings.json";
import type { BotReply, Explanation, OfficeCard } from "../../src/lib/chat";
import { buildIndex, match, type KnowledgeEntry, type LanguageRule, type MatchResult, type Thresholds } from "../../src/lib/nlp/matcher";
import { DEFAULT_OFFICE, routeToOffice } from "../../src/lib/routing";

type SeedEntry = {
  key: string;
  category: string;
  office: string | null;
  question: string;
  variants: string[];
  answer: string;
  source_url: string | null;
  source_note: string | null;
  featured?: boolean;
};
type SeedOffice = { slug: string; name: string; handles: string | null; email: string | null; phone: string | null; location: string | null; website: string | null; source_url: string | null };
type SeedCategory = { slug: string; name: string };

export type Office = SeedOffice & { id: number };
export type Suggestion = { id: number; question: string; category_slug: string; category_name: string };
export type Unanswered = { question: string; office: string | null; closest: string | null; score: number | null };

const SMALL_TALK = "chat-basics";
export const MAX_MESSAGE_LENGTH = 500;

const entries = kbSeed as SeedEntry[];
const categories = categoriesSeed as SeedCategory[];
export const offices: Office[] = (officesSeed as SeedOffice[]).map((o, i) => ({ id: i + 1, ...o }));
export const rules = rulesSeed as LanguageRule[];
export const thresholds: Thresholds = { answer: settingsSeed.answer_threshold, suggest: settingsSeed.suggest_threshold };

const officeBySlug = new Map(offices.map((o) => [o.slug, o]));
const categoryOrder = new Map(categories.map((c, i) => [c.slug, i]));
const categoryName = new Map(categories.map((c) => [c.slug, c.name]));

// Ids follow the seed order, as in the database the app creates.
const records = entries.map((e, i) => ({ ...e, id: i + 1 }));
const recordById = new Map(records.map((r) => [r.id, r]));

const kb: KnowledgeEntry[] = records.map((r) => ({ id: r.id, question: r.question, variants: r.variants, category: r.category, smallTalk: r.category === SMALL_TALK }));
export const index = buildIndex(kb, rules);

export const answerCount = records.filter((r) => r.category !== SMALL_TALK).length;

/** Featured questions for the suggestions panel, by topic order, as getFeaturedQuestions() returns them. */
export const featured: Suggestion[] = records
  .filter((r) => r.featured && r.category !== SMALL_TALK)
  .sort((a, b) => (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99) || a.id - b.id)
  .map((r) => ({ id: r.id, question: r.question, category_slug: r.category, category_name: categoryName.get(r.category) ?? r.category }));

/** The official pages the most answers came from (How it works). */
export function topSources(limit = 8) {
  const counts = new Map<string, number>();
  for (const r of records) if (r.source_url && r.category !== SMALL_TALK) counts.set(r.source_url, (counts.get(r.source_url) ?? 0) + 1);
  return [...counts.entries()]
    .map(([source_url, n]) => ({ source_url, n }))
    .sort((a, b) => b.n - a.n || a.source_url.localeCompare(b.source_url))
    .slice(0, limit);
}

export function ruleCounts() {
  const counts = new Map<string, number>();
  for (const r of rules) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  return [...counts.entries()].map(([kind, n]) => ({ kind, n })).sort((a, b) => b.n - a.n);
}

function toCard(office: Office | undefined): OfficeCard | undefined {
  if (!office) return undefined;
  const { name, handles, email, phone, location, website } = office;
  return { name, handles, email, phone, location, website };
}

export function explain(result: MatchResult): Explanation {
  const { analysis, candidates, decision } = result;
  return {
    cleaned: analysis.cleaned,
    corrections: analysis.corrections,
    rulesApplied: analysis.rulesApplied,
    tokens: analysis.tokens,
    stems: analysis.stems,
    candidates: candidates.map(({ question, phrasing, cosine, trigram, score }) => ({ question, phrasing, cosine, trigram, score })),
    thresholds: result.thresholds,
    decision,
  };
}

export function explainMessage(raw: string): Explanation {
  return explain(match(index, raw.trim().slice(0, MAX_MESSAGE_LENGTH), thresholds, 5));
}

/**
 * One student message. `save` stores a question the bot could not answer and reports whether
 * it was stored, so the reply only says "I have saved your question" when that is true.
 */
export async function chatReply(raw: string, save: (stems: string[], item: Unanswered) => Promise<boolean>): Promise<BotReply> {
  const message = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
  const result = match(index, message, thresholds, 5);
  const best = result.best;
  const explanation = explain(result);
  const routed = officeBySlug.get(routeToOffice(result.analysis.tokens)) ?? officeBySlug.get(DEFAULT_OFFICE);

  if ((result.decision === "answered" || result.decision === "smalltalk") && best) {
    const record = recordById.get(best.entryId)!;
    return {
      logId: null,
      kind: result.decision === "smalltalk" ? "smalltalk" : "answer",
      text: record.answer,
      confidence: best.score,
      qa: { id: record.id, question: record.question, category: categoryName.get(record.category) ?? record.category, sourceUrl: record.source_url, sourceNote: record.source_note },
      office: record.office ? toCard(officeBySlug.get(record.office)) : undefined,
      explanation,
    };
  }

  if (result.decision === "empty") {
    return { logId: null, kind: "empty", text: "Please type your question in a few more words. For example: How do I check my admission status?", confidence: null, explanation };
  }

  const item: Unanswered = { question: message, office: routed?.name ?? null, closest: best?.question ?? null, score: best?.score ?? null };

  if (result.decision === "suggested" && best) {
    await save(result.analysis.stems, item);
    const suggestions = result.candidates
      .filter((c) => c.score >= thresholds.suggest && !index.entries.get(c.entryId)?.smallTalk)
      .slice(0, 3)
      .map((c) => ({ id: c.entryId, question: c.question }));
    return { logId: null, kind: "suggestions", text: "I am not fully sure what you mean. Did you mean one of these?", confidence: best.score, suggestions, office: toCard(routed), explanation };
  }

  const saved = await save(result.analysis.stems, item);
  const general = officeBySlug.get(DEFAULT_OFFICE);
  const reachable = Boolean(routed?.email || routed?.phone);
  return {
    logId: null,
    kind: "fallback",
    text: saved
      ? "I don't have that answer yet. I have saved your question so the knowledge base can be updated. For now, please contact the office below."
      : "I don't have that answer yet. For now, please contact the office below.",
    confidence: best?.score ?? 0,
    office: toCard(routed),
    generalOffice: !reachable && general && general.slug !== routed?.slug ? toCard(general) : undefined,
    explanation,
  };
}
