// Browser version of the EBSU Enquiry Bot: the app's own chat interface and matching engine,
// with the knowledge base built in, as one page that needs no server, MySQL or install.
// Build: npm run build:browser-demo (see demo/browser/README.md).
import { AddressBookIcon, ArrowRightIcon, ChatsCircleIcon, FlowArrowIcon, QuestionIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ArrowRightIcon as ArrowIcon,
  BroomIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  GlobeSimpleIcon,
  LinkSimpleIcon,
  ListMagnifyingGlassIcon,
  MagicWandIcon,
  MapPinIcon,
  PhoneIcon,
  ScalesIcon,
  TextAaIcon,
  TranslateIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { ChatWorkspace } from "@/components/chat-workspace";
import { MatchPlayground } from "@/components/match-playground";
import { MobileNav } from "@/components/mobile-nav";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { formatScore } from "@/lib/format";
import { answerCount, chatReply, explainMessage, featured, offices, ruleCounts, thresholds, topSources, type Office } from "./engine";
import { getRoute, subscribe } from "./router";
import { saveUnanswered, watchUnanswered, type SavedQuestion } from "./saved";

// ---------------------------------------------------------------------------
// The chat components call the app's API routes. Here those calls are answered in the page.
const nativeFetch = window.fetch.bind(window);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let path = url;
  try {
    path = new URL(url, window.location.href).pathname;
  } catch {
    /* keep the raw string */
  }
  if (path !== "/api/chat" && path !== "/api/explain" && path !== "/api/feedback") return nativeFetch(input, init);

  let body: { message?: unknown } = {};
  try {
    body = JSON.parse(String(init?.body ?? "{}"));
  } catch {
    /* empty body */
  }
  if (path === "/api/feedback") return json({ ok: true });
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "Type a question first." }, 400);
  if (path === "/api/explain") return json(explainMessage(message));
  await new Promise((resolve) => setTimeout(resolve, 280)); // a short pause so the reply reads like a chat
  return json(await chatReply(message, saveUnanswered));
};

// ---------------------------------------------------------------------------
// Layout: the app's student shell, with the staff card replaced by a note on this version.
const NAV: NavItem[] = [
  { href: "/", label: "Ask a question", icon: <ChatsCircleIcon size={20} /> },
  { href: "/how-it-works", label: "How it works", icon: <FlowArrowIcon size={20} /> },
  { href: "/contacts", label: "Offices and contacts", icon: <AddressBookIcon size={20} /> },
  { href: "/admin", label: "Unanswered questions", icon: <QuestionIcon size={20} /> },
];

function VersionCard() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(150deg,#e8613c_0%,#c44a1f_70%)] p-4 text-white shadow-lift">
      <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10" aria-hidden />
      <p className="text-[15px] font-semibold">Browser version</p>
      <p className="mt-1 text-[13px] leading-snug text-white/90">
        The same matching engine and {answerCount} answers, running in this page. Adding answers, chat logs and the test bench are in the full app.
      </p>
      <Link
        href="/admin"
        className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-[13px] font-semibold text-accent-ink transition-transform active:scale-[0.98]"
      >
        Unanswered list <ArrowRightIcon size={14} weight="bold" />
      </Link>
    </div>
  );
}

function DemoShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[1480px] flex-col lg:flex-row">
      <MobileNav brand={<Brand />}>
        <NavLinks items={NAV} />
        <VersionCard />
      </MobileNav>
      <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col gap-8 px-5 py-6 lg:flex">
        <Brand />
        <nav aria-label="Main">
          <NavLinks items={NAV} />
        </nav>
        <div className="mt-auto">
          <VersionCard />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-3 sm:p-4 lg:py-4 lg:pl-0 lg:pr-4">{children}</main>
    </div>
  );
}

const Page = ({ children }: { children: ReactNode }) => <div className="scroll-area flex min-h-[calc(100dvh-32px)] flex-col gap-3 overflow-y-auto">{children}</div>;
const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section className={`rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8 ${className}`}>{children}</section>
);

// ---------------------------------------------------------------------------
// How it works (src/app/how-it-works/page.tsx, with the data from the built-in knowledge base)
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

function HowItWorksView() {
  const rules = ruleCounts();
  const ruleTotal = rules.reduce((sum, r) => sum + r.n, 0);
  return (
    <Page>
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-10">
        <h1 className="max-w-[30ch] text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">How the EBSU Enquiry Bot finds an answer</h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-2">
          It is a retrieval-based chatbot that uses natural language processing. It never makes up an answer: it compares your message with {answerCount} stored
          questions and returns the closest one, or tells you who to contact. In this browser version the matcher and the knowledge base run inside the page.
        </p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative flex flex-col gap-2 rounded-[16px] border border-line bg-surface-2 p-4">
              <span className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-[10px] bg-accent-soft text-accent-ink">
                  <Icon size={18} />
                </span>
                {i < STEPS.length - 1 ? <ArrowIcon size={14} className="ml-auto hidden text-ink-3 xl:block" /> : null}
              </span>
              <span className="text-[14px] font-semibold">{title}</span>
              <span className="text-[13px] leading-snug text-ink-2">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <h2 className="text-xl font-semibold tracking-tight">Try the matcher</h2>
        <p className="mb-4 mt-1 text-[14px] text-ink-2">Type any question to see each step and the scores. Nothing you type here is saved.</p>
        <MatchPlayground />
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <h2 className="text-xl font-semibold tracking-tight">When the bot does not know</h2>
          <dl className="mt-5 flex flex-col gap-4">
            <div className="flex gap-4">
              <dt className="tabular w-24 shrink-0 rounded-[10px] bg-good-soft px-2 py-1.5 text-center text-[13px] font-semibold text-good">{thresholds.answer.toFixed(2)} or more</dt>
              <dd className="text-[14px] leading-relaxed text-ink-2">It gives the stored answer, with a link to the official page it came from.</dd>
            </div>
            <div className="flex gap-4">
              <dt className="tabular w-24 shrink-0 rounded-[10px] bg-warn-soft px-2 py-1.5 text-center text-[13px] font-semibold text-warn">
                {thresholds.suggest.toFixed(2)} to {(thresholds.answer - 0.01).toFixed(2)}
              </dt>
              <dd className="text-[14px] leading-relaxed text-ink-2">It is not sure, so it asks &ldquo;Did you mean...?&rdquo; and offers the closest questions.</dd>
            </div>
            <div className="flex gap-4">
              <dt className="tabular w-24 shrink-0 rounded-[10px] bg-canvas px-2 py-1.5 text-center text-[13px] font-semibold text-ink-2">below {thresholds.suggest.toFixed(2)}</dt>
              <dd className="text-[14px] leading-relaxed text-ink-2">
                It says &ldquo;I don&apos;t have that yet&rdquo;, names the office to contact, and saves the question to the Unanswered list so the knowledge base can grow.
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-[13px] text-ink-3">
            The language rules ({ruleTotal} in total) cover {rules.map((r) => `${r.n} ${r.kind}`).join(", ")} entries.
          </p>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold tracking-tight">Where the answers come from</h2>
          <p className="mt-1 text-[14px] text-ink-2">Each answer is stored with the official EBSU page it was taken from. The most used sources:</p>
          <ul className="mt-4 flex flex-col gap-2">
            {topSources().map((s) => (
              <li key={s.source_url} className="flex items-center gap-3 text-[13.5px]">
                <LinkSimpleIcon size={16} className="shrink-0 text-ink-3" />
                <a href={s.source_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                  {s.source_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
                <span className="tabular shrink-0 text-ink-3">{s.n}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
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
      </Card>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Offices and contacts (src/app/contacts/page.tsx)
function OfficeCard({ office }: { office: Office }) {
  const has = office.email || office.phone || office.location || office.website;
  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-5">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">{office.name}</h2>
        {office.handles ? <p className="mt-0.5 text-[13.5px] text-ink-2">{office.handles}</p> : null}
      </div>
      {has ? (
        <ul className="flex flex-col gap-2 text-[14px] text-ink-2">
          {office.email ? (
            <li className="flex items-start gap-2.5">
              <EnvelopeSimpleIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="flex flex-wrap gap-x-3 break-all font-medium text-ink select-all">{office.email.split(/[,;]\s*/).join("  ")}</span>
            </li>
          ) : null}
          {office.phone ? (
            <li className="flex items-start gap-2.5">
              <PhoneIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="tabular select-all">{office.phone}</span>
            </li>
          ) : null}
          {office.location ? (
            <li className="flex items-start gap-2.5">
              <MapPinIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span>{office.location}</span>
            </li>
          ) : null}
          {office.website ? (
            <li className="flex items-start gap-2.5">
              <GlobeSimpleIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <a href={office.website} target="_blank" rel="noreferrer" className="break-all font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                {office.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-ink-3">Contact details for this office are not on the EBSU website yet. Ask at the Office of the Registrar.</p>
      )}
    </article>
  );
}

function ContactsView() {
  const reachable = offices.filter((o) => o.email || o.phone);
  const pending = offices.filter((o) => !o.email && !o.phone);
  return (
    <Page>
      <Card>
        <h1 className="text-3xl font-semibold tracking-tight">Offices and contacts</h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
          Contact details below come from official EBSU web pages. When the bot cannot answer a question, it points you to one of these offices.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {reachable.map((o) => (
            <OfficeCard key={o.id} office={o} />
          ))}
        </div>
        {pending.length > 0 ? (
          <>
            <h2 className="mt-8 text-[15px] font-semibold text-ink-2">Offices without published contact details</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {pending.map((o) => (
                <OfficeCard key={o.id} office={o} />
              ))}
            </div>
          </>
        ) : null}
      </Card>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Unanswered questions (the full app's Admin > Unanswered, read-only here)
const when = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return iso;
  }
};

function StaffView() {
  const [items, setItems] = useState<SavedQuestion[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => watchUnanswered(setItems, () => setUnavailable(true)), []);

  return (
    <Page>
      <Card>
        <h1 className="text-3xl font-semibold tracking-tight">Unanswered questions</h1>
        <p className="mt-2 max-w-[66ch] text-[15px] leading-relaxed text-ink-2">
          Questions the chat could not answer with confidence, saved so the knowledge base can be improved. In the full app, staff turn each one into a new answer, or
          link it to an existing answer as another phrasing, from Admin &gt; Unanswered.
        </p>

        <div className="mt-6">
          {unavailable ? (
            <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-[14px] text-ink-2">Saved questions can&apos;t be shown in this view.</p>
          ) : items === null ? (
            <p className="text-[14px] text-ink-3">Loading saved questions...</p>
          ) : items.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-[14px] text-ink-2">
              Nothing saved yet. Ask the chat something it does not know, for example &ldquo;How much is hostel accommodation per session?&rdquo;, and it appears here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((q) => (
                <li key={q.id} className="rounded-[18px] border border-line bg-surface p-4 sm:p-5">
                  <p className="text-[15px] font-medium text-ink">&ldquo;{q.question}&rdquo;</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-3">
                    <span>Last asked {when(q.lastAskedAt)}</span>
                    {q.office ? <span>Referred to {q.office}</span> : null}
                  </p>
                  {q.closest ? (
                    <p className="mt-1.5 text-[13px] text-ink-2">
                      Closest stored question: <span className="text-ink">{q.closest}</span>
                      {typeof q.score === "number" ? <span className="tabular text-ink-3"> (score {formatScore(q.score)})</span> : null}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold tracking-tight">What the full app adds</h2>
        <ul className="mt-4 grid gap-2 text-[14px] text-ink-2 sm:grid-cols-2">
          {[
            "Staff login, and an answer editor with sources and extra phrasings",
            "Answering saved questions with one click",
            "Chat logs, ratings and a usage dashboard",
            "The test bench: 30 held-out test questions, re-run live",
            "Editing office contacts and the matching thresholds",
            "Everything on one computer with XAMPP, without internet",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <CheckCircleIcon size={18} weight="fill" className="mt-0.5 shrink-0 text-good" />
              {t}
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}

// ---------------------------------------------------------------------------
function App() {
  const route = useSyncExternalStore(subscribe, getRoute, getRoute);
  return (
    <DemoShell>
      {route === "chat" ? (
        <ChatWorkspace suggestions={featured} totalAnswers={answerCount} />
      ) : route === "how-it-works" ? (
        <HowItWorksView />
      ) : route === "contacts" ? (
        <ContactsView />
      ) : (
        <StaffView />
      )}
    </DemoShell>
  );
}

document.body.classList.add("app-backdrop", "min-h-[100dvh]", "antialiased");
createRoot(document.getElementById("root")!).render(<App />);
