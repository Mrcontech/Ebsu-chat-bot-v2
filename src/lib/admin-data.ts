import { query } from "./db";
import { SMALL_TALK_CATEGORY } from "./kb";

export type DashboardStats = {
  answers: number;
  phrasings: number;
  messages: number;
  messagesToday: number;
  answered: number;
  suggested: number;
  fallback: number;
  pendingUnanswered: number;
  helpful: number;
  notHelpful: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [row] = await query<Record<keyof DashboardStats, number>>(
    `SELECT
       (SELECT COUNT(*) FROM qa_pairs q JOIN categories c ON c.id = q.category_id WHERE q.is_active = 1 AND c.slug <> ?) AS answers,
       (SELECT COUNT(*) FROM qa_variants) + (SELECT COUNT(*) FROM qa_pairs) AS phrasings,
       (SELECT COUNT(*) FROM chat_logs WHERE outcome <> 'smalltalk') AS messages,
       (SELECT COUNT(*) FROM chat_logs WHERE outcome <> 'smalltalk' AND created_at >= CURDATE()) AS messagesToday,
       (SELECT COUNT(*) FROM chat_logs WHERE outcome = 'answered') AS answered,
       (SELECT COUNT(*) FROM chat_logs WHERE outcome = 'suggested') AS suggested,
       (SELECT COUNT(*) FROM chat_logs WHERE outcome IN ('fallback','empty')) AS fallback,
       (SELECT COUNT(*) FROM unanswered_questions WHERE status = 'pending') AS pendingUnanswered,
       (SELECT COUNT(*) FROM chat_logs WHERE feedback = 1) AS helpful,
       (SELECT COUNT(*) FROM chat_logs WHERE feedback = -1) AS notHelpful`,
    [SMALL_TALK_CATEGORY],
  );
  const out = {} as DashboardStats;
  for (const [k, v] of Object.entries(row)) out[k as keyof DashboardStats] = Number(v ?? 0);
  return out;
}

export async function getTopicActivity() {
  return query<{ name: string; n: number }>(
    `SELECT c.name, COUNT(*) AS n FROM chat_logs l JOIN qa_pairs q ON q.id = l.matched_qa_id JOIN categories c ON c.id = q.category_id
      WHERE l.outcome = 'answered' GROUP BY c.id, c.name ORDER BY n DESC LIMIT 6`,
  );
}

export async function getPendingCount(): Promise<number> {
  const [row] = await query<{ n: number }>("SELECT COUNT(*) AS n FROM unanswered_questions WHERE status = 'pending'");
  return Number(row?.n ?? 0);
}

export type QaListRow = {
  id: number;
  question: string;
  category_name: string;
  category_slug: string;
  source_url: string | null;
  is_active: number;
  is_featured: number;
  variants: number;
  times_used: number;
  updated_at: string;
};

export async function listQa(search: string, category: string): Promise<QaListRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    where.push("(q.question LIKE ? OR q.answer LIKE ? OR EXISTS (SELECT 1 FROM qa_variants v WHERE v.qa_id = q.id AND v.phrasing LIKE ?))");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    where.push("c.slug = ?");
    params.push(category);
  }
  return query<QaListRow>(
    `SELECT q.id, q.question, c.name AS category_name, c.slug AS category_slug, q.source_url, q.is_active, q.is_featured,
            (SELECT COUNT(*) FROM qa_variants v WHERE v.qa_id = q.id) AS variants,
            (SELECT COUNT(*) FROM chat_logs l WHERE l.matched_qa_id = q.id AND l.outcome = 'answered') AS times_used,
            q.updated_at
       FROM qa_pairs q JOIN categories c ON c.id = q.category_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.sort_order, q.id`,
    params,
  );
}

export type QaDetail = {
  id: number;
  question: string;
  answer: string;
  category_id: number;
  office_id: number | null;
  source_url: string | null;
  source_note: string | null;
  is_active: number;
  is_featured: number;
  variants: string[];
};

export async function getQa(id: number): Promise<QaDetail | null> {
  const [qa] = await query<Omit<QaDetail, "variants">>(
    "SELECT id, question, answer, category_id, office_id, source_url, source_note, is_active, is_featured FROM qa_pairs WHERE id = ?",
    [id],
  );
  if (!qa) return null;
  const variants = await query<{ phrasing: string }>("SELECT phrasing FROM qa_variants WHERE qa_id = ? ORDER BY id", [id]);
  return { ...qa, variants: variants.map((v) => v.phrasing) };
}

export type UnansweredRow = {
  id: number;
  question: string;
  times_asked: number;
  best_score: number | null;
  best_qa_id: number | null;
  best_question: string | null;
  office_name: string | null;
  status: "pending" | "resolved" | "dismissed";
  resolved_qa_id: number | null;
  first_asked_at: string;
  last_asked_at: string;
};

export async function listUnanswered(status: string): Promise<UnansweredRow[]> {
  return query<UnansweredRow>(
    `SELECT u.id, u.question, u.times_asked, u.best_score, u.best_qa_id, q.question AS best_question, o.name AS office_name,
            u.status, u.resolved_qa_id, u.first_asked_at, u.last_asked_at
       FROM unanswered_questions u
       LEFT JOIN qa_pairs q ON q.id = u.best_qa_id
       LEFT JOIN offices o ON o.id = u.office_id
      WHERE u.status = ?
      ORDER BY u.times_asked DESC, u.last_asked_at DESC
      LIMIT 300`,
    [status],
  );
}

export async function getUnanswered(id: number) {
  const [row] = await query<{ id: number; question: string; best_qa_id: number | null }>(
    "SELECT id, question, best_qa_id FROM unanswered_questions WHERE id = ?",
    [id],
  );
  return row ?? null;
}

export type LogRow = {
  id: number;
  message: string;
  outcome: string;
  score: number | null;
  feedback: number | null;
  matched_question: string | null;
  created_at: string;
};

export async function listLogs(outcome: string): Promise<LogRow[]> {
  const params: unknown[] = [];
  let where = "";
  if (outcome) {
    where = "WHERE l.outcome = ?";
    params.push(outcome);
  }
  return query<LogRow>(
    `SELECT l.id, l.message, l.outcome, l.score, l.feedback, q.question AS matched_question, l.created_at
       FROM chat_logs l LEFT JOIN qa_pairs q ON q.id = l.matched_qa_id
      ${where}
      ORDER BY l.id DESC LIMIT 200`,
    params,
  );
}

export type TestQuestionRow = {
  id: number;
  question: string;
  expected_outcome: "answer" | "fallback";
  expected_qa_id: number | null;
  style: string | null;
  set_name: "test" | "dev";
};

export async function listTestQuestions(): Promise<TestQuestionRow[]> {
  return query<TestQuestionRow>("SELECT id, question, expected_outcome, expected_qa_id, style, set_name FROM test_questions ORDER BY set_name DESC, id");
}

export async function listQaOptions() {
  return query<{ id: number; question: string; category_name: string }>(
    `SELECT q.id, q.question, c.name AS category_name FROM qa_pairs q JOIN categories c ON c.id = q.category_id
      WHERE c.slug <> ? ORDER BY c.sort_order, q.question`,
    [SMALL_TALK_CATEGORY],
  );
}
