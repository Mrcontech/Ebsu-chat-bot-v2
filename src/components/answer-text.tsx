import { Fragment, type ReactNode } from "react";

/**
 * Renders stored answers. The knowledge base uses a tiny plain-text format so
 * admins never write HTML:
 *   blank line      new paragraph
 *   "- item"        bullet list
 *   "1. step"       numbered list
 *   **bold**        bold text
 *   https://...     clickable link
 */
const INLINE = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (/^https?:\/\//.test(part)) {
      const clean = part.replace(/[.,;:]+$/, "");
      const trail = part.slice(clean.length);
      return (
        <Fragment key={i}>
          <a href={clean} target="_blank" rel="noreferrer" className="break-words font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 hover:decoration-accent-ink">
            {clean.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
          {trail}
        </Fragment>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(part)) {
      const clean = part.replace(/[.,;:]+$/, "");
      return (
        <Fragment key={i}>
          <a href={`mailto:${clean}`} className="font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
            {clean}
          </a>
          {part.slice(clean.length)}
        </Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function AnswerText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  return (
    <div className={`flex flex-col gap-2.5 text-[15px] leading-relaxed text-ink ${className}`}>
      {blocks.map((block, b) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l))) {
          return (
            <ul key={b} className="flex flex-col gap-1.5 pl-1">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[0.72em] h-[1.5px] w-2.5 shrink-0 rounded-full bg-ink-3" aria-hidden />
                  <span>{inline(l.replace(/^\s*[-*]\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={b} className="flex flex-col gap-1.5">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="tabular mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">{i + 1}</span>
                  <span>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={b}>
            {lines.map((l, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
