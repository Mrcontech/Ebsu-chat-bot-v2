"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode; badge?: number | null };

/** Sidebar links. The current page gets the raised white pill, as in the reference design. */
export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/" || item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[14px] transition-colors duration-200 ${
                active ? "bg-surface font-medium text-ink shadow-soft" : "text-ink-2 hover:bg-surface/60 hover:text-ink"
              }`}
            >
              <span className={active ? "text-accent-strong" : "text-ink-3 group-hover:text-ink-2"}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="tabular rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-ink">{item.badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
