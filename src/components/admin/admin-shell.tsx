import {
  BooksIcon,
  BuildingOfficeIcon,
  ChatTeardropTextIcon,
  GaugeIcon,
  GearSixIcon,
  QuestionIcon,
  SignOutIcon,
  FlaskIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { Brand } from "../brand";
import { MobileNav } from "../mobile-nav";
import { NavLinks, type NavItem } from "../nav-links";

function nav(pending: number): NavItem[] {
  return [
    { href: "/admin", label: "Dashboard", icon: <GaugeIcon size={20} /> },
    { href: "/admin/knowledge", label: "Knowledge base", icon: <BooksIcon size={20} /> },
    { href: "/admin/unanswered", label: "Unanswered", icon: <QuestionIcon size={20} />, badge: pending || null },
    { href: "/admin/logs", label: "Chat logs", icon: <ChatTeardropTextIcon size={20} /> },
    { href: "/admin/test", label: "Test bench", icon: <FlaskIcon size={20} /> },
    { href: "/admin/offices", label: "Offices", icon: <BuildingOfficeIcon size={20} /> },
    { href: "/admin/settings", label: "Settings", icon: <GearSixIcon size={20} /> },
  ];
}

function Footer({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/" className="rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-center text-[13px] font-medium text-ink-2 hover:text-ink">
        Open the student chat
      </Link>
      <form action={logoutAction} className="flex flex-col gap-1 border-t border-line px-1 pt-3">
        <span className="truncate text-[12.5px] text-ink-3">Signed in as {name}</span>
        <button type="submit" className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-[9px] py-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <SignOutIcon size={16} /> Log out
        </button>
      </form>
    </div>
  );
}

export function AdminShell({ children, adminName, pending }: { children: ReactNode; adminName: string; pending: number }) {
  const items = nav(pending);
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[1480px] flex-col lg:flex-row">
      <MobileNav brand={<Brand href="/admin" subtitle="Admin area" />}>
        <NavLinks items={items} />
        <Footer name={adminName} />
      </MobileNav>
      <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 flex-col gap-8 px-5 py-6 lg:flex">
        <Brand href="/admin" subtitle="Admin area" />
        <nav aria-label="Admin">
          <NavLinks items={items} />
        </nav>
        <div className="mt-auto">
          <Footer name={adminName} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-3 sm:p-4 lg:py-4 lg:pl-0 lg:pr-4">{children}</main>
    </div>
  );
}

/** White working surface used by every admin page. */
export function AdminPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-32px)] flex-col rounded-[var(--radius-card)] border border-line bg-surface shadow-soft">
      <header className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-0.5 max-w-[70ch] text-[14px] text-ink-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <div className="flex-1 px-5 py-6 sm:px-8">{children}</div>
    </div>
  );
}
