import {
  ArrowRightIcon,
  BroomIcon,
  CheckCircleIcon,
  LinkSimpleIcon,
  ListMagnifyingGlassIcon,
  MagicWandIcon,
  ScalesIcon,
  TextAaIcon,
  TranslateIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { DbOffline } from "@/components/db-offline";
import { MatchPlayground } from "@/components/match-playground";
import { StudentShell } from "@/components/student-shell";
import { query } from "@/lib/db";
import { countAnswers, getThresholds } from "@/lib/kb";

export const metadata: Metadata = { title: "How it works" };
export const dynamic = "force-dynamic";

const STEPS = [
  { icon: BroomIcon, title: "Clean", text: "Lower case, remove punctuation and accents." },
  { icon: MagicWandIcon, title: "Fix typos", text: "Edit distance finds the nearest known word: admision to admission." },
  { icon: TranslateIcon, title: "Translate", text: "Pidgin and short forms become plain words: wetin be, sch fees, PUTME." },
  { icon: TextAaIcon, title: "Filter", text: "Drop words that carry no meaning, such as the, is, abeg." },
  { icon: TreeStructureIcon, title: "Find roots", text: "Porter stemming: registering and registration share one root." },
  { icon: ListMagnifyingGlassIcon, title: "Score", text: "TF-IDF cosine similarity plus character-trigram similarity against every stored question." },
  { icon: ScalesIcon, title: "Decide", text: "Answer, offer choices, or refer the student to an office." },
];

const COMPARISON = [
  ["Student types the question in their own words", "Student must find the right heading and read through a list"],
  ["Understands typos, Pidgin and short forms (sch fees, PUTME, wetin be)", "Only exact wording helps, and only with the browser's find tool"],
  ["Gives one focused answer with its official source link", "Shows every question, so the student reads many to find one"],
  ["Refers the student to the right office when it has no answer", "Silent when the answer is not on the page"],
  ["Saves unanswered questions so the admin can add them", "No record of what students looked for and did not find"],
  ["Logs questions and feedback, so usage can be measured", "No usage data"],
];

export default async function HowItWorksPage() {
  let data: { answers: number; thresholds: { answer: number; suggest: number }; sources: { source_url: string; n: number }[]; rules: { kind: string; n: number }[] };
  try {
    const [answers, thresholds, sources, rules] = await Promise.all([
      countAnswers(),
      getThresholds(),
      query<{ source_url: string; n: number }>(
        "SELECT source_url, COUNT(*) AS n FROM qa_pairs WHERE is_active = 1 AND source_url IS NOT NULL GROUP BY source_url ORDER BY n DESC, source_url LIMIT 8",
      ),
      query<{ kind: string; n: number }>("SELECT kind, COUNT(*) AS n FROM language_rules GROUP BY kind ORDER BY n DESC"),
    ]);
    data = { answers, thresholds, sources, rules };
  } catch {
    return (
      <StudentShell>
        <DbOffline />
      </StudentShell>
    );
  }

  const { answers, thresholds, sources, rules } = data;
  const ruleTotal = rules.reduce((sum, r) => sum + Number(r.n), 0);

  return (
    <StudentShell>
      <div className="scroll-area flex min-h-[calc(100dvh-32px)] flex-col gap-3 overflow-y-auto">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-10">
          <h1 className="max-w-[30ch] text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">How the EBSU Enquiry Bot finds an answer</h1>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
            It is a retrieval-based chatbot that uses natural language processing. It never makes up an answer: it compares your message with {answers} stored
            questions and returns the closest one, or tells you who to contact. Everything runs on this computer, without the internet.
          </p>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex flex-col gap-2 rounded-[16px] border border-line bg-surface-2 p-4">
                <span className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
                    <Icon size={18} />
                  </span>
                  {i < STEPS.length - 1 ? <ArrowRightIcon size={14} className="ml-auto hidden text-ink-3 xl:block" /> : null}
                </span>
                <span className="text-[14px] font-semibold">{title}</span>
                <span className="text-[13px] leading-snug text-ink-2">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Try the matcher</h2>
          <p className="mb-4 mt-1 text-[14px] text-ink-2">Type any question to see each step and the scores. Nothing you type here is saved.</p>
          <MatchPlayground />
        </section>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">When the bot does not know</h2>
            <dl className="mt-5 flex flex-col gap-4">
              <div className="flex gap-4">
                <dt className="tabular w-24 shrink-0 rounded-[10px] bg-good-soft px-2 py-1.5 text-center text-[13px] font-semibold text-good">
                  {thresholds.answer.toFixed(2)} or more
                </dt>
                <dd className="text-[14px] leading-relaxed text-ink-2">It gives the stored answer, with a link to the official page it came from.</dd>
              </div>
              <div className="flex gap-4">
                <dt className="tabular w-24 shrink-0 rounded-[10px] bg-warn-soft px-2 py-1.5 text-center text-[13px] font-semibold text-warn">
                  {thresholds.suggest.toFixed(2)} to {(thresholds.answer - 0.01).toFixed(2)}
                </dt>
                <dd className="text-[14px] leading-relaxed text-ink-2">It is not sure, so it asks &ldquo;Did you mean...?&rdquo; and offers the closest questions.</dd>
              </div>
              <div className="flex gap-4">
                <dt className="tabular w-24 shrink-0 rounded-[10px] bg-canvas px-2 py-1.5 text-center text-[13px] font-semibold text-ink-2">
                  below {thresholds.suggest.toFixed(2)}
                </dt>
                <dd className="text-[14px] leading-relaxed text-ink-2">
                  It says &ldquo;I don&apos;t have that yet&rdquo;, names the office to contact, and saves the question to the admin&apos;s Unanswered list so the knowledge
                  base can grow.
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-[13px] text-ink-3">
              The language rules ({ruleTotal} in total) cover {rules.map((r) => `${r.n} ${r.kind}`).join(", ")} entries.
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">Where the answers come from</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              Each answer is stored in MySQL with the official EBSU page it was taken from. The most used sources:
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {sources.map((s) => (
                <li key={s.source_url} className="flex items-center gap-3 text-[13.5px]">
                  <LinkSimpleIcon size={16} className="shrink-0 text-ink-3" />
                  <a href={s.source_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                    {s.source_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                  <span className="tabular shrink-0 text-ink-3">{s.n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">How this differs from an FAQ page</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead>
                <tr className="text-ink-2">
                  <th className="w-1/2 pb-3 pr-6 font-semibold">EBSU Enquiry Bot</th>
                  <th className="w-1/2 pb-3 font-semibold">A static FAQ page</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([bot, faq]) => (
                  <tr key={bot} className="border-t border-line align-top">
                    <td className="py-3 pr-6">
                      <span className="flex gap-2.5">
                        <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-good" />
                        {bot}
                      </span>
                    </td>
                    <td className="py-3 text-ink-2">{faq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </StudentShell>
  );
}
