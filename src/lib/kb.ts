import { query } from "./db";
import { buildIndex, DEFAULT_THRESHOLDS, type KnowledgeEntry, type LanguageRule, type MatcherIndex, type Thresholds } from "./nlp/matcher";

export const SMALL_TALK_CATEGORY = "chat-basics";

export type QaRecord = {
  id: number;
  ref_key: string | null;
  question: string;
  answer: string;
  source_url: string | null;
  source_note: string | null;
  is_active: number;
  is_featured: number;
  category_id: number;
  category_slug: string;
  category_name: string;
  office_id: number | null;
  updated_at: string;
};

export type Office = {
  id: number;
  slug: string;
  name: string;
  handles: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  source_url: string | null;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

type CachedIndex = { signature: string; index: MatcherIndex; records: Map<number, QaRecord> };
const globalForKb = globalThis as unknown as { ebsuIndex?: CachedIndex };

/**
 * A cheap fingerprint of the knowledge base. When an admin (or phpMyAdmin) changes
 * any question, variant or language rule, the fingerprint changes and the
 * matcher index is rebuilt on the next message.
 */
async function signature(): Promise<string> {
  const [row] = await query<Record<string, string | number | null>>(
    `SELECT (SELECT COUNT(*) FROM qa_pairs) AS q, (SELECT MAX(updated_at) FROM qa_pairs) AS qu,
            (SELECT COUNT(*) FROM qa_variants) AS v, (SELECT COALESCE(MAX(id),0) FROM qa_variants) AS vm,
            (SELECT COUNT(*) FROM language_rules) AS r, (SELECT COALESCE(MAX(id),0) FROM language_rules) AS rm`,
  );
  return Object.values(row).join("|");
}

export async function loadIndex(): Promise<CachedIndex> {
  const sig = await signature();
  const cached = globalForKb.ebsuIndex;
  if (cached && cached.signature === sig) return cached;

  const records = await query<QaRecord>(
    `SELECT q.id, q.ref_key, q.question, q.answer, q.source_url, q.source_note, q.is_active, q.is_featured,
            q.category_id, c.slug AS category_slug, c.name AS category_name, q.office_id, q.updated_at
       FROM qa_pairs q JOIN categories c ON c.id = q.category_id
      WHERE q.is_active = 1`,
  );
  const variants = await query<{ qa_id: number; phrasing: string }>(
    "SELECT v.qa_id, v.phrasing FROM qa_variants v JOIN qa_pairs q ON q.id = v.qa_id WHERE q.is_active = 1",
  );
  const rules = await query<LanguageRule>("SELECT phrase, canonical, kind FROM language_rules");

  const byQa = new Map<number, string[]>();
  for (const v of variants) byQa.set(v.qa_id, [...(byQa.get(v.qa_id) ?? []), v.phrasing]);

  const entries: KnowledgeEntry[] = records.map((r) => ({
    id: r.id,
    question: r.question,
    variants: byQa.get(r.id) ?? [],
    category: r.category_slug,
    smallTalk: r.category_slug === SMALL_TALK_CATEGORY,
  }));

  const fresh: CachedIndex = {
    signature: sig,
    index: buildIndex(entries, rules),
    records: new Map(records.map((r) => [r.id, r])),
  };
  globalForKb.ebsuIndex = fresh;
  return fresh;
}

export async function getThresholds(): Promise<Thresholds> {
  const rows = await query<{ name: string; value: string }>(
    "SELECT name, value FROM settings WHERE name IN ('answer_threshold','suggest_threshold')",
  );
  const map = new Map(rows.map((r) => [r.name, Number(r.value)]));
  const answer = map.get("answer_threshold");
  const suggest = map.get("suggest_threshold");
  return {
    answer: answer && answer > 0 && answer <= 1 ? answer : DEFAULT_THRESHOLDS.answer,
    suggest: suggest && suggest > 0 && suggest <= 1 ? suggest : DEFAULT_THRESHOLDS.suggest,
  };
}

export async function getOffices(): Promise<Office[]> {
  return query<Office>(
    "SELECT id, slug, name, handles, email, phone, location, website, source_url FROM offices ORDER BY id",
  );
}

export async function getCategories(): Promise<Category[]> {
  return query<Category>("SELECT id, slug, name, description, icon, sort_order FROM categories ORDER BY sort_order, name");
}

export type FeaturedQuestion = { id: number; question: string; category_slug: string; category_name: string };

/** Questions shown as suggestions in the chat sidebar, grouped by topic. */
export async function getFeaturedQuestions(): Promise<FeaturedQuestion[]> {
  return query<FeaturedQuestion>(
    `SELECT q.id, q.question, c.slug AS category_slug, c.name AS category_name
       FROM qa_pairs q JOIN categories c ON c.id = q.category_id
      WHERE q.is_active = 1 AND q.is_featured = 1 AND c.slug <> ?
      ORDER BY c.sort_order, q.id`,
    [SMALL_TALK_CATEGORY],
  );
}

/** Number of active university answers (small talk not counted). */
export async function countAnswers(): Promise<number> {
  const [row] = await query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM qa_pairs q JOIN categories c ON c.id = q.category_id WHERE q.is_active = 1 AND c.slug <> ?`,
    [SMALL_TALK_CATEGORY],
  );
  return Number(row?.n ?? 0);
}
