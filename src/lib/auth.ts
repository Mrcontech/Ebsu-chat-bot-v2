import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { execute, query } from "./db";

const COOKIE = "ebsu_admin";
const SESSION_HOURS = 8;

export type Admin = { id: number; username: string; full_name: string | null };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Compared against when the username does not exist, so a wrong username and a
// wrong password take the same time to reject.
const DUMMY_HASH = bcrypt.hashSync("no-such-admin-account", 10);

/** Check a username and password; on success start an 8-hour session. */
export async function login(username: string, password: string): Promise<boolean> {
  const [admin] = await query<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM admins WHERE username = ?",
    [username.trim().toLowerCase()],
  );
  const ok = await bcrypt.compare(password, admin?.password_hash ?? DUMMY_HASH);
  if (!admin || !ok) return false;

  const token = randomBytes(32).toString("hex");
  await execute("DELETE FROM admin_sessions WHERE expires_at < NOW()");
  await execute(
    "INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
    [hashToken(token), admin.id, SESSION_HOURS],
  );
  await execute("UPDATE admins SET last_login_at = NOW() WHERE id = ?", [admin.id]);

  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_HOURS * 3600 });
  return true;
}

export async function currentAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [admin] = await query<Admin>(
    `SELECT a.id, a.username, a.full_name FROM admin_sessions s JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND s.expires_at > NOW()`,
    [hashToken(token)],
  );
  return admin ?? null;
}

/** Use at the top of every admin page and admin action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await execute("DELETE FROM admin_sessions WHERE token_hash = ?", [hashToken(token)]);
  jar.delete(COOKIE);
}

export async function changePassword(adminId: number, current: string, next: string): Promise<string | null> {
  const [row] = await query<{ password_hash: string }>("SELECT password_hash FROM admins WHERE id = ?", [adminId]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return "Your current password is not correct.";
  if (next.length < 8) return "The new password must be at least 8 characters.";
  await execute("UPDATE admins SET password_hash = ? WHERE id = ?", [await bcrypt.hash(next, 10), adminId]);
  return null;
}
