import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/components/admin/admin-shell";
import { Badge, buttonClass, EmptyState, inputClass, Notice } from "@/components/admin/ui";
import { listQa } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getCategories } from "@/lib/kb";

export const metadata: Metadata = { title: "Knowledge base" };

function host(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, "") : "");
  } catch {
    return url;
  }
}

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string; saved?: string; deleted?: string }> }) {
  await requireAdmin();
  const { q = "", c = "", saved, deleted } = await searchParams;
  const [rows, categories] = await Promise.all([listQa(q.trim().slice(0, 100), c), getCategories()]);

  return (
    <AdminPage
      title="Knowledge base"
      description="Every question and answer the bot can give. Students' words are matched against the main question and every other phrasing."
      actions={
        <Link href="/admin/knowledge/new" className={buttonClass.primary}>
          <PlusIcon size={16} weight="bold" /> Add question
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        {saved ? <Notice>Saved. The bot uses the change straight away.</Notice> : null}
        {deleted ? <Notice tone="warn">The question was deleted.</Notice> : null}

        <form className="grid gap-2 sm:grid-cols-[1fr_220px_auto]" role="search">
          <label htmlFor="q" className="sr-only">
            Search questions and answers
          </label>
          <div className="relative">
            <MagnifyingGlassIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input id="q" name="q" defaultValue={q} placeholder="Search questions, phrasings and answers" className={`${inputClass} pl-10`} />
          </div>
          <label htmlFor="c" className="sr-only">
            Topic
          </label>
          <select id="c" name="c" defaultValue={c} className={inputClass}>
            <option value="">All topics</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass.secondary}>
            Filter
          </button>
        </form>

        <p className="tabular text-[13px] text-ink-3">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
          {q || c ? " match your filter" : ""}
        </p>

        {rows.length === 0 ? (
          <EmptyState title="No questions found" text="Try another word, or add a new question." />
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-line">
            <table className="w-full min-w-[860px] text-left text-[14px]">
              <thead className="bg-surface-2 text-[12.5px] text-ink-2">
                <tr>
                  <th className="px-4 py-3 font-semibold">Question</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 text-right font-semibold">Used</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-t border-line align-top ${saved === String(r.id) ? "bg-accent-wash" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="text-ink">{r.question}</span>
                      <span className="block text-[12.5px] text-ink-3">
                        {r.variants} other {Number(r.variants) === 1 ? "phrasing" : "phrasings"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-2">{r.category_name}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noreferrer" className="block truncate text-[13px] text-accent-ink underline decoration-accent/40 underline-offset-2">
                          {host(r.source_url)}
                        </a>
                      ) : (
                        <span className="text-[13px] text-ink-3">{r.category_slug === "chat-basics" ? "Bot message" : "No source"}</span>
                      )}
                    </td>
                    <td className="tabular px-4 py-3 text-right text-ink-2">{r.times_used}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {r.is_active ? <Badge tone="good">Live</Badge> : <Badge>Hidden</Badge>}
                        {r.is_featured ? <Badge tone="accent">Suggested</Badge> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/knowledge/${r.id}`} className={buttonClass.quiet} aria-label={`Edit: ${r.question}`}>
                        <PencilSimpleIcon size={15} /> Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
