import { AddressBookIcon, ArrowRightIcon, ChatsCircleIcon, FlowArrowIcon, LockKeyIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";

const NAV: NavItem[] = [
  { href: "/", label: "Ask a question", icon: <ChatsCircleIcon size={20} /> },
  { href: "/how-it-works", label: "How it works", icon: <FlowArrowIcon size={20} /> },
  { href: "/contacts", label: "Offices and contacts", icon: <AddressBookIcon size={20} /> },
];

function StaffCard() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(150deg,#e8613c_0%,#c44a1f_70%)] p-4 text-white shadow-lift">
      <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-white/10" aria-hidden />
      <span className="grid size-9 place-items-center rounded-[10px] bg-white/15">
        <LockKeyIcon size={18} weight="bold" />
      </span>
      <p className="mt-3 text-[15px] font-semibold">Staff area</p>
      <p className="mt-1 text-[13px] leading-snug text-white/90">Add answers and review questions the bot could not answer.</p>
      <Link
        href="/admin/login"
        className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-surface px-3 py-1.5 text-[13px] font-semibold text-accent-ink transition-transform active:scale-[0.98]"
      >
        Admin login <ArrowRightIcon size={14} weight="bold" />
      </Link>
    </div>
  );
}

/** Three-part student layout: sidebar, main content and (optionally) a right panel inside the page. */
export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[1480px] flex-col lg:flex-row">
      <MobileNav brand={<Brand />}>
        <NavLinks items={NAV} />
        <StaffCard />
      </MobileNav>

      <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col gap-8 px-5 py-6 lg:flex">
        <Brand />
        <nav aria-label="Main">
          <NavLinks items={NAV} />
        </nav>
        <div className="mt-auto">
          <StaffCard />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-3 sm:p-4 lg:py-4 lg:pl-0 lg:pr-4">{children}</main>
    </div>
  );
}
