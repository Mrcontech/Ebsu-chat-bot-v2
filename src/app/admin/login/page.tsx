import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Brand } from "@/components/brand";
import { ChatBookIllustration } from "@/components/illustration";
import { currentAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin login" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const admin = await currentAdmin().catch(() => null);
  if (admin) redirect("/admin");

  return (
    <div className="mx-auto grid min-h-[100dvh] max-w-[1200px] items-stretch gap-3 p-3 sm:p-4 lg:grid-cols-[1fr_1.05fr]">
      <section className="flex flex-col justify-between gap-10 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-10">
        <Brand subtitle="Admin area" />
        <div className="mx-auto flex w-full max-w-[380px] flex-col gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-2 text-[15px] text-ink-2">Manage answers, review unanswered questions and test the matcher.</p>
          </div>
          <LoginForm />
        </div>
        <p className="text-[13px] text-ink-3">For knowledge base administrators only. Students do not need an account.</p>
      </section>
      <section className="relative hidden overflow-hidden rounded-[var(--radius-card)] bg-[linear-gradient(155deg,#e8613c_0%,#c44a1f_58%,#a63d17_100%)] p-10 text-white shadow-lift lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-black/10" aria-hidden />
        <p className="relative max-w-[30ch] text-2xl font-semibold leading-snug tracking-tight">Every unanswered question is a new answer waiting to be added.</p>
        <ChatBookIllustration className="relative mx-auto w-full max-w-[420px]" />
        <p className="relative text-[14px] text-white/90">Answers come only from official EBSU sources.</p>
      </section>
    </div>
  );
}
