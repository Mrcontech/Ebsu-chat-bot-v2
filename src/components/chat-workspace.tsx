"use client";

import {
  AddressBookIcon,
  ArrowClockwiseIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CircleIcon,
  CopyIcon,
  EnvelopeSimpleIcon,
  FlowArrowIcon,
  GlobeSimpleIcon,
  ListBulletsIcon,
  MapPinIcon,
  PaperPlaneRightIcon,
  PhoneIcon,
  PlusIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BotReply, OfficeCard } from "@/lib/chat";
import { formatScore } from "@/lib/format";
import { AnswerText } from "./answer-text";
import { BrandTile } from "./brand-tile";
import { MatchDetails } from "./match-details";

export type Suggestion = { id: number; question: string; category_slug: string; category_name: string };

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "bot"; reply: BotReply; feedback?: 1 | -1 }
  | { id: string; role: "error"; text: string; retry: string };

const STORE_KEY = "ebsu-chat-v1";
const SESSION_KEY = "ebsu-session-id";
const MAX_LENGTH = 500;

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function readStore<T>(key: string, storage: "local" | "session"): T | null {
  try {
    const raw = (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStore(key: string, value: unknown, storage: "local" | "session") {
  try {
    (storage === "local" ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* storage can be unavailable in private windows; the chat still works */
  }
}

function sourceLabel(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    const short = path.length > 34 ? `${path.slice(0, 32)}...` : path;
    return `${u.hostname.replace(/^www\./, "")}${short}`;
  } catch {
    return url;
  }
}

export function ChatWorkspace({ suggestions, totalAnswers }: { suggestions: Suggestion[]; totalAnswers: number }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [topic, setTopic] = useState<string>("all");
  const sessionId = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [ready, setReady] = useState(false);

  // Restore this browser tab's conversation and the anonymous session id.
  useEffect(() => {
    const saved = readStore<ChatItem[]>(STORE_KEY, "session");
    if (saved?.length) setItems(saved);
    let id = readStore<string>(SESSION_KEY, "local");
    if (!id) {
      id = uid();
      writeStore(SESSION_KEY, id, "local");
    }
    sessionId.current = id;
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) writeStore(STORE_KEY, items.slice(-60), "session");
  }, [items, ready]);

  useEffect(() => {
    const log = logRef.current;
    if (!log || items.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [items, pending]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim().slice(0, MAX_LENGTH);
      if (!message || pending) return;
      setPanelOpen(false);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "";
      setItems((prev) => [...prev, { id: uid(), role: "user", text: message }]);
      setPending(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId: sessionId.current }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
        setItems((prev) => [...prev, { id: uid(), role: "bot", reply: data as BotReply }]);
      } catch (error) {
        const text =
          error instanceof TypeError
            ? "The chat server is not responding. Check that npm start is still running, then try again."
            : (error as Error).message;
        setItems((prev) => [...prev, { id: uid(), role: "error", text, retry: message }]);
      } finally {
        setPending(false);
        inputRef.current?.focus();
      }
    },
    [pending],
  );

  const rate = useCallback(async (itemId: string, logId: number | null, value: 1 | -1) => {
    setItems((prev) => prev.map((it) => (it.id === itemId && it.role === "bot" ? { ...it, feedback: value } : it)));
    if (!logId) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId, value, sessionId: sessionId.current }),
      });
    } catch {
      /* feedback is optional */
    }
  }, []);

  const clear = () => {
    setItems([]);
    writeStore(STORE_KEY, [], "session");
    inputRef.current?.focus();
  };

  const topics = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of suggestions) if (!seen.has(s.category_slug)) seen.set(s.category_slug, s.category_name);
    return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
  }, [suggestions]);

  const starters = useMemo(() => {
    const firstPerTopic = new Map<string, Suggestion>();
    for (const s of suggestions) if (!firstPerTopic.has(s.category_slug)) firstPerTopic.set(s.category_slug, s);
    return [...firstPerTopic.values()].slice(0, 6);
  }, [suggestions]);

  const visible = topic === "all" ? suggestions : suggestions.filter((s) => s.category_slug === topic);

  const panel = (
    <SuggestionsPanel
      topics={topics}
      topic={topic}
      setTopic={setTopic}
      items={visible}
      total={totalAnswers}
      onPick={send}
      onClose={() => setPanelOpen(false)}
      showClose={panelOpen}
    />
  );

  return (
    <div className="grid h-[calc(100dvh-80px)] min-h-[520px] gap-3 sm:h-[calc(100dvh-88px)] lg:h-[calc(100dvh-32px)] xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft" aria-label="Chat">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">Student enquiry chat</h1>
            <p className="hidden truncate text-[13px] text-ink-3 sm:block">Ask in your own words. English, Pidgin and short forms are fine.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label="Suggested questions"
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 active:scale-[0.98] sm:px-3 xl:hidden"
            >
              <ListBulletsIcon size={16} /> <span className="hidden sm:inline">Questions</span>
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={items.length === 0}
              aria-label="New chat"
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-2.5 text-[13px] font-medium text-ink-2 hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50 sm:px-3"
            >
              <PlusIcon size={16} /> <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </header>

        <div ref={logRef} className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6" role="log" aria-live="polite" aria-relevant="additions">
          {items.length === 0 ? (
            <Welcome starters={starters} onPick={send} />
          ) : (
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              {items.map((item) =>
                item.role === "user" ? (
                  <UserBubble key={item.id} text={item.text} />
                ) : item.role === "bot" ? (
                  <BotMessage key={item.id} reply={item.reply} feedback={item.feedback} onRate={(v) => rate(item.id, item.reply.logId, v)} onPick={send} />
                ) : (
                  <ErrorMessage key={item.id} text={item.text} onRetry={() => send(item.retry)} />
                ),
              )}
              {pending ? <Typing /> : null}
            </div>
          )}
        </div>

        <form
          className="border-t border-line px-3 pb-3 pt-3 sm:px-6"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="mx-auto flex max-w-[760px] items-end gap-2 rounded-[16px] border border-line-strong bg-surface-2 p-1.5 pl-4 focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent/20">
            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_LENGTH}
              placeholder="Type your question"
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              aria-label="Send question"
              className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent-strong text-white transition-[transform,background-color] duration-200 hover:bg-accent-hover active:scale-[0.96] disabled:bg-line-strong disabled:text-ink-3"
            >
              <PaperPlaneRightIcon size={20} weight="fill" />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-[760px] text-center text-[12px] text-ink-3">
            Answers come from official EBSU pages. Always confirm fees and deadlines with the office named.
          </p>
        </form>
      </section>

      <div className="hidden min-h-0 xl:block">{panel}</div>

      {panelOpen ? (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Suggested questions">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close suggestions" onClick={() => setPanelOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-16 animate-rise p-3 sm:left-auto sm:top-3 sm:w-[360px]">{panel}</div>
        </div>
      ) : null}
    </div>
  );
}

function Welcome({ starters, onPick }: { starters: Suggestion[]; onPick: (q: string) => void }) {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-8 pt-2 sm:pt-8">
      <div className="flex flex-col gap-3">
        <BrandTile size={44} />
        <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">Hello. What would you like to know about EBSU?</h2>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
          I answer questions on admission, Post-UTME, school fees, registration, courses, hostels, exams, results, transcripts and who to contact.
        </p>
      </div>
      {starters.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-medium text-ink-2">Try one of these</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.question)}
                className="group flex items-start justify-between gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3 text-left transition-[background-color,border-color,transform] duration-200 hover:border-line-strong hover:bg-accent-wash active:scale-[0.99]"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-semibold text-accent-ink">{s.category_name}</span>
                  <span className="text-[14px] leading-snug text-ink">{s.question}</span>
                </span>
                <ArrowUpRightIcon size={16} className="mt-0.5 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-[14px] text-ink-2">
          The knowledge base is empty. An admin can add questions from the Admin area.
        </p>
      )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex animate-rise justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-[6px] bg-accent-soft px-4 py-2.5 text-[15px] leading-relaxed text-ink">{text}</p>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-3" aria-label="The bot is typing">
      <BrandTile size={32} />
      <div className="flex gap-1.5 rounded-[14px] bg-surface-2 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-blink rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

function ErrorMessage({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="flex animate-rise items-start gap-3 rounded-[14px] border border-bad/20 bg-bad-soft px-4 py-3 text-[14px] text-bad">
      <WarningCircleIcon size={20} className="mt-0.5 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <p>{text}</p>
        <button type="button" onClick={onRetry} className="inline-flex w-fit items-center gap-1.5 font-semibold underline underline-offset-2">
          <ArrowClockwiseIcon size={14} /> Try again
        </button>
      </div>
    </div>
  );
}

function OfficeDetails({ office, compact = false }: { office: OfficeCard; compact?: boolean }) {
  const hasContact = office.email || office.phone || office.location || office.website;
  return (
    <div className={`rounded-[14px] border border-line bg-surface ${compact ? "p-3" : "p-4"}`}>
      <p className="text-[14px] font-semibold text-ink">{office.name}</p>
      {office.handles && !compact ? <p className="mt-0.5 text-[13px] text-ink-3">{office.handles}</p> : null}
      {hasContact ? (
        <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px] text-ink-2">
          {office.email ? (
            <li className="flex items-start gap-2">
              <EnvelopeSimpleIcon size={16} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="flex flex-wrap gap-x-2">
                {office.email.split(/[,;]\s*/).map((e) => (
                  <a key={e} href={`mailto:${e}`} className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                    {e}
                  </a>
                ))}
              </span>
            </li>
          ) : null}
          {office.phone ? (
            <li className="flex items-start gap-2">
              <PhoneIcon size={16} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="tabular">{office.phone}</span>
            </li>
          ) : null}
          {office.location ? (
            <li className="flex items-start gap-2">
              <MapPinIcon size={16} className="mt-0.5 shrink-0 text-ink-3" />
              <span>{office.location}</span>
            </li>
          ) : null}
          {office.website ? (
            <li className="flex items-start gap-2">
              <GlobeSimpleIcon size={16} className="mt-0.5 shrink-0 text-ink-3" />
              <a href={office.website} target="_blank" rel="noreferrer" className="break-all font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                {office.website.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-1 text-[13px] text-ink-3">Contact details for this office are not in the knowledge base yet.</p>
      )}
    </div>
  );
}

function BotMessage({
  reply,
  feedback,
  onRate,
  onPick,
}: {
  reply: BotReply;
  feedback?: 1 | -1;
  onRate: (v: 1 | -1) => void;
  onPick: (q: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const isAnswer = reply.kind === "answer";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reply.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; ignore */
    }
  };

  return (
    <div className="flex animate-rise items-start gap-3">
      <BrandTile size={32} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`flex flex-col gap-3 rounded-[18px] rounded-tl-[6px] px-4 py-3.5 ${reply.kind === "fallback" ? "border border-line bg-accent-wash" : "bg-surface-2"}`}>
          {isAnswer && reply.qa ? <p className="text-[12px] font-semibold text-accent-ink">{reply.qa.category}</p> : null}
          <AnswerText text={reply.text} />

          {reply.kind === "suggestions" && reply.suggestions?.length ? (
            <div className="flex flex-col gap-2">
              {reply.suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.question)}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left text-[14px] text-ink transition-colors hover:border-line-strong hover:bg-accent-wash"
                >
                  {s.question}
                  <ArrowUpRightIcon size={15} className="shrink-0 text-ink-3" />
                </button>
              ))}
              {reply.office ? <p className="text-[13px] text-ink-3">None of these? Contact {reply.office.name}.</p> : null}
            </div>
          ) : null}

          {reply.kind === "fallback" && reply.office ? <OfficeDetails office={reply.office} /> : null}
          {reply.kind === "fallback" && reply.generalOffice ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-ink-2">Until those details are added, the general enquiries office can direct you:</p>
              <OfficeDetails office={reply.generalOffice} compact />
            </div>
          ) : null}

          {isAnswer && reply.qa?.sourceUrl ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2.5 text-[12.5px] text-ink-3">
              <span>Source:</span>
              <a href={reply.qa.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                {sourceLabel(reply.qa.sourceUrl)}
              </a>
              {reply.qa.sourceNote ? <span>({reply.qa.sourceNote})</span> : null}
            </p>
          ) : null}
        </div>

        {reply.kind !== "empty" ? (
          <div className="flex flex-wrap items-center gap-1 text-ink-3">
            {isAnswer ? (
              <>
                <IconButton label="Helpful" active={feedback === 1} disabled={feedback !== undefined} onClick={() => onRate(1)}>
                  <ThumbsUpIcon size={16} weight={feedback === 1 ? "fill" : "regular"} />
                </IconButton>
                <IconButton label="Not helpful" active={feedback === -1} disabled={feedback !== undefined} onClick={() => onRate(-1)}>
                  <ThumbsDownIcon size={16} weight={feedback === -1 ? "fill" : "regular"} />
                </IconButton>
                <IconButton label={copied ? "Copied" : "Copy answer"} onClick={copy}>
                  {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                </IconButton>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2"
            >
              <FlowArrowIcon size={15} /> {showDetails ? "Hide matching steps" : "How I matched this"}
            </button>
            {reply.confidence !== null && reply.kind === "answer" ? (
              <span className="tabular ml-auto text-[12px]">Match score {formatScore(reply.confidence)}</span>
            ) : null}
            {feedback !== undefined ? <span className="ml-2 text-[12px]">Thanks for the feedback.</span> : null}
          </div>
        ) : null}

        {showDetails ? <MatchDetails explanation={reply.explanation} /> : null}
      </div>
    </div>
  );
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-[9px] transition-colors hover:bg-surface-2 hover:text-ink disabled:hover:bg-transparent ${active ? "text-accent-strong" : ""}`}
    >
      {children}
    </button>
  );
}

function SuggestionsPanel({
  topics,
  topic,
  setTopic,
  items,
  total,
  onPick,
  onClose,
  showClose,
}: {
  topics: { slug: string; name: string }[];
  topic: string;
  setTopic: (t: string) => void;
  items: Suggestion[];
  total: number;
  onPick: (q: string) => void;
  onClose: () => void;
  showClose: boolean;
}) {
  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-soft" aria-label="Suggested questions">
      <div className="flex items-center justify-between gap-2 px-5 pb-3 pt-4">
        <h2 className="text-[16px] font-semibold tracking-tight">Suggested questions</h2>
        <div className="flex items-center gap-2">
          <span className="tabular rounded-full bg-canvas px-2.5 py-0.5 text-[12px] font-medium text-ink-2" title="Answers in the knowledge base">
            {total} answers
          </span>
          {showClose ? (
            <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-[9px] text-ink-2 hover:bg-surface-2 xl:hidden">
              <XIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="scroll-area flex snap-x scroll-px-5 gap-1.5 overflow-x-auto px-5 pb-3">
        {[{ slug: "all", name: "All" }, ...topics].map((t) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => setTopic(t.slug)}
            aria-pressed={topic === t.slug}
            className={`shrink-0 snap-start rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
              topic === t.slug ? "border-accent-strong bg-accent-strong text-white" : "border-line text-ink-2 hover:border-line-strong hover:text-ink"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <ul className="scroll-area flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
        {items.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s.question)} className="group flex w-full items-start gap-3 rounded-[12px] px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
              <CircleIcon size={18} className="mt-0.5 shrink-0 text-line-strong group-hover:text-accent" />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold text-ink">{s.category_name}</span>
                <span className="line-clamp-2 text-[13px] leading-snug text-ink-3">{s.question}</span>
              </span>
            </button>
          </li>
        ))}
        {items.length === 0 ? <li className="px-2 py-6 text-center text-[13px] text-ink-3">No suggested questions in this topic yet.</li> : null}
      </ul>

      <div className="border-t border-line p-3">
        <Link
          href="/contacts"
          className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-line py-2.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2 active:scale-[0.99]"
        >
          <AddressBookIcon size={16} /> Offices and contacts
        </Link>
      </div>
    </aside>
  );
}
