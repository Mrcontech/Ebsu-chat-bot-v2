"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

/** Below the large breakpoint the sidebar folds into this slide-in drawer. */
export function MobileNav({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 lg:hidden">
      {brand}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-[var(--radius-control)] border border-line bg-surface text-ink-2 active:scale-[0.98]"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <ListIcon size={20} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(84vw,300px)] animate-rise flex-col gap-6 bg-canvas p-5 shadow-lift"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-[var(--radius-control)] text-ink-2 hover:bg-surface" aria-label="Close menu">
                <XIcon size={18} />
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
