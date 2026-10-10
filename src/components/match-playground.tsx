"use client";

import { FlaskIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { Explanation } from "@/lib/chat";
import { MatchDetails } from "./match-details";

const EXAMPLES = ["wetin be the putme fee", "how do i chek my admision status", "abeg how i go take apply for transcript", "is there a swimming pool"];

/** Type any question and watch every step of the matching pipeline. Nothing is logged. */
export function MatchPlayground() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Explanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (q: string) => {
    const message = q.trim();
    if (!message) return;
    setText(message);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not run the matcher.");
      setResult(data as Explanation);
    } catch (e) {
      setError(e instanceof TypeError ? "The server is not responding." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
      >
        <label htmlFor="playground" className="sr-only">
          Question to test
        </label>
        <input
          id="playground"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Type a question in any style"
          className="h-11 flex-1 rounded-[var(--radius-control)] border border-line-strong bg-surface px-4 text-[15px] outline-none placeholder:text-ink-3 focus:border-accent-strong focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent-strong px-5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:bg-line-strong disabled:text-ink-3"
        >
          <FlaskIcon size={18} weight="bold" /> {busy ? "Matching..." : "Show the steps"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button key={q} type="button" onClick={() => run(q)} className="rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2">
            {q}
          </button>
        ))}
      </div>
      {error ? <p className="rounded-[12px] bg-bad-soft px-4 py-3 text-[14px] text-bad">{error}</p> : null}
      {result ? <MatchDetails explanation={result} /> : null}
    </div>
  );
}
