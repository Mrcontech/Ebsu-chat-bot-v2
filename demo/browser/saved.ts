// Questions the bot could not answer, kept in the published page's shared store (the
// claude.ai artifact `db` capability), like the app's unanswered_questions table.
// One document per question, keyed by its sorted word roots, so repeats land on one entry.
// The store has no safe counters, so each entry keeps the latest wording and time.
import type { Unanswered } from "./engine";

type DbError = { code: string; message: string };
type Snapshot = { docs: { id: string; data(): Record<string, unknown> | undefined }[] };
type Collection = {
  doc(id: string): { set(data: Record<string, unknown>): Promise<void> };
  orderBy(field: string, dir?: "asc" | "desc"): Collection;
  limit(n: number): Collection;
  onSnapshot(next: (snap: Snapshot) => void, error?: (e: DbError) => void): () => void;
};
type Db = { collection(path: string): Collection };
type User = { can(capability: string): Promise<boolean | null> };
type ClaudeHost = { use(name: string): Promise<unknown> };

export type SavedQuestion = Unanswered & { id: string; lastAskedAt: string };

const COLLECTION = "unanswered";

function host(): ClaudeHost | null {
  const claude = (window as unknown as { claude?: ClaudeHost }).claude;
  return claude && typeof claude.use === "function" ? claude : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

let dbPromise: Promise<Db | null> | null = null;
export function getDb(): Promise<Db | null> {
  if (!dbPromise) {
    const claude = host();
    dbPromise = claude ? (claude.use("db") as Promise<Db | null>).catch(() => null) : Promise.resolve(null);
  }
  return dbPromise;
}

// null: not known yet. Becomes false after the platform or a refused write says this viewer cannot write.
let writable: boolean | null = null;

async function canWrite(): Promise<boolean> {
  if (writable !== null) return writable;
  const claude = host();
  if (!claude) return false;
  try {
    const user = (await withTimeout(claude.use("user") as Promise<User | null>, 3000, null)) ?? null;
    const can = user ? await user.can("data.write") : null;
    if (can === false) writable = false;
  } catch {
    /* not told: let the write decide */
  }
  return writable ?? true;
}

async function keyFor(stems: string[]): Promise<string> {
  const text = [...new Set(stems)].sort().join(" ");
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
  } catch {
    // FNV-1a fallback where SubtleCrypto is unavailable
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return `q${h.toString(16)}`;
  }
}

/** Store the question; resolves true only when the store confirmed the write. */
export async function saveUnanswered(stems: string[], item: Unanswered): Promise<boolean> {
  if (stems.length === 0) return false;
  const db = await withTimeout(getDb(), 4000, null);
  if (!db || !(await canWrite())) return false;
  try {
    const id = await keyFor(stems);
    const body = { ...item, question: item.question.slice(0, 300), lastAskedAt: new Date().toISOString() };
    return await withTimeout(
      db.collection(COLLECTION).doc(id).set(body).then(() => true),
      6000,
      false,
    );
  } catch (error) {
    if ((error as DbError)?.code === "invalid_argument") writable = false;
    return false;
  }
}

/** Live list of saved questions, newest first. Returns a function that stops the updates. */
export function watchUnanswered(next: (items: SavedQuestion[]) => void, onUnavailable: () => void): () => void {
  let stop: (() => void) | null = null;
  let cancelled = false;
  getDb().then((db) => {
    if (cancelled) return;
    if (!db) return onUnavailable();
    stop = db
      .collection(COLLECTION)
      .orderBy("lastAskedAt", "desc")
      .limit(100)
      .onSnapshot(
        (snap) => next(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Unanswered & { lastAskedAt: string }) }))),
        () => onUnavailable(),
      );
  });
  return () => {
    cancelled = true;
    stop?.();
  };
}
