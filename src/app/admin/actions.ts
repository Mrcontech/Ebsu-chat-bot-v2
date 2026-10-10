"use server";

import { redirect } from "next/navigation";
import { changePassword, login, logout, requireAdmin } from "@/lib/auth";
import { execute, isConnectionError, pool, query } from "@/lib/db";

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> };

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const optionalId = (form: FormData, name: string) => {
  const n = Number(form.get(name));
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ------------------------------------------------------------------ sign in / out

// Five wrong passwords lock a username for five minutes (kept in memory).
const failures = new Map<string, { count: number; until: number }>();

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const username = text(form, "username").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password.", fields: { username } };

  const lock = failures.get(username);
  if (lock && lock.until > Date.now()) return { error: "Too many attempts. Wait five minutes and try again.", fields: { username } };

  let ok = false;
  try {
    ok = await login(username, password);
  } catch (error) {
    console.error("[login]", error);
    return { error: isConnectionError(error) ? "MySQL is not running. Start it in the XAMPP Control Panel." : "Could not sign in.", fields: { username } };
  }
  if (!ok) {
    const count = (lock?.count ?? 0) + 1;
    failures.set(username, { count, until: count >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "That username and password do not match.", fields: { username } };
  }
  failures.delete(username);
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

// ------------------------------------------------------------------ knowledge base

export async function saveQaAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = optionalId(form, "id");
  const fields = {
    question: text(form, "question"),
    answer: text(form, "answer"),
    category_id: text(form, "category_id"),
    office_id: text(form, "office_id"),
    source_url: text(form, "source_url"),
    source_note: text(form, "source_note"),
    variants: String(form.get("variants") ?? ""),
  };
  const categoryId = optionalId(form, "category_id");
  const officeId = optionalId(form, "office_id");
  const fromUnanswered = optionalId(form, "from_unanswered");
  const active = form.get("is_active") === "on" ? 1 : 0;
  const featured = form.get("is_featured") === "on" ? 1 : 0;
  const variants = [...new Set(fields.variants.split(/\r?\n/).map((v) => v.trim()).filter(Boolean))].slice(0, 40);

  if (fields.question.length < 5) return { error: "Write the main question (at least 5 characters).", fields };
  if (fields.question.length > 500) return { error: "The question can be at most 500 characters.", fields };
  if (fields.answer.length < 5) return { error: "Write the answer students should see.", fields };
  if (!categoryId) return { error: "Choose a topic.", fields };
  if (fields.source_url && !/^https?:\/\/\S+$/i.test(fields.source_url)) return { error: "The source must be a full web address starting with http:// or https://", fields };
  if (variants.some((v) => v.length > 500)) return { error: "Each other phrasing can be at most 500 characters.", fields };

  const conn = await pool().getConnection();
  let savedId = id;
  try {
    await conn.beginTransaction();
    const values = [categoryId, officeId, fields.question, fields.answer, fields.source_url || null, fields.source_note || null, active, featured];
    if (id) {
      await conn.execute(
        "UPDATE qa_pairs SET category_id=?, office_id=?, question=?, answer=?, source_url=?, source_note=?, is_active=?, is_featured=?, updated_at=NOW() WHERE id=?",
        [...values, id],
      );
      await conn.execute("DELETE FROM qa_variants WHERE qa_id = ?", [id]);
    } else {
      const [result] = await conn.execute(
        "INSERT INTO qa_pairs (category_id, office_id, question, answer, source_url, source_note, is_active, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        values,
      );
      savedId = (result as { insertId: number }).insertId;
    }
    for (const v of variants) await conn.execute("INSERT INTO qa_variants (qa_id, phrasing) VALUES (?, ?)", [savedId, v]);
    if (fromUnanswered) {
      await conn.execute("UPDATE unanswered_questions SET status='resolved', resolved_qa_id=? WHERE id=?", [savedId, fromUnanswered]);
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    console.error("[save qa]", error);
    return { error: "Could not save. Check that MySQL is running and try again.", fields };
  } finally {
    conn.release();
  }
  redirect(`/admin/knowledge?saved=${savedId}`);
}

export async function deleteQaAction(form: FormData) {
  await requireAdmin();
  const id = optionalId(form, "id");
  if (id) await execute("DELETE FROM qa_pairs WHERE id = ?", [id]);
  redirect("/admin/knowledge?deleted=1");
}

// ------------------------------------------------------------------ unanswered questions

export async function attachVariantAction(form: FormData) {
  await requireAdmin();
  const id = optionalId(form, "id");
  const qaId = optionalId(form, "qa_id");
  if (!id || !qaId) redirect("/admin/unanswered");
  const [row] = await query<{ question: string }>("SELECT question FROM unanswered_questions WHERE id = ?", [id]);
  if (row) {
    await execute("INSERT INTO qa_variants (qa_id, phrasing) VALUES (?, ?)", [qaId, row.question.slice(0, 500)]);
    await execute("UPDATE qa_pairs SET updated_at = NOW() WHERE id = ?", [qaId]);
    await execute("UPDATE unanswered_questions SET status='resolved', resolved_qa_id=? WHERE id=?", [qaId, id]);
  }
  redirect("/admin/unanswered?linked=1");
}

export async function setUnansweredStatusAction(form: FormData) {
  await requireAdmin();
  const id = optionalId(form, "id");
  const status = form.get("status") === "pending" ? "pending" : "dismissed";
  if (id) await execute("UPDATE unanswered_questions SET status = ? WHERE id = ?", [status, id]);
  redirect(`/admin/unanswered${status === "pending" ? "?status=dismissed" : ""}`);
}

// ------------------------------------------------------------------ offices

export async function saveOfficeAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = optionalId(form, "id");
  const name = text(form, "name");
  if (!id) return { error: "Unknown office." };
  if (name.length < 3) return { error: "The office needs a name." };
  const website = text(form, "website");
  if (website && !/^https?:\/\/\S+$/i.test(website)) return { error: "The website must start with http:// or https://" };
  await execute("UPDATE offices SET name=?, handles=?, email=?, phone=?, location=?, website=? WHERE id=?", [
    name,
    text(form, "handles") || null,
    text(form, "email") || null,
    text(form, "phone") || null,
    text(form, "location") || null,
    website || null,
    id,
  ]);
  return { ok: "Saved." };
}

// ------------------------------------------------------------------ settings

export async function saveThresholdsAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const answer = Number(form.get("answer_threshold"));
  const suggest = Number(form.get("suggest_threshold"));
  if (!(answer > 0 && answer <= 1) || !(suggest > 0 && suggest <= 1)) return { error: "Both thresholds must be between 0.01 and 1.00." };
  if (suggest >= answer) return { error: "The suggestion threshold must be lower than the answer threshold." };
  await execute("INSERT INTO settings (name, value) VALUES ('answer_threshold', ?), ('suggest_threshold', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [
    answer.toFixed(2),
    suggest.toFixed(2),
  ]);
  return { ok: `Saved. The bot now answers at ${answer.toFixed(2)} and suggests from ${suggest.toFixed(2)}.` };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) return { error: "The two new passwords do not match." };
  const problem = await changePassword(admin.id, current, next);
  return problem ? { error: problem } : { ok: "Password changed." };
}
