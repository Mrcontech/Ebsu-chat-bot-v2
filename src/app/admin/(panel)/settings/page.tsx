import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { PasswordForm, ThresholdForm } from "@/components/admin/settings-forms";
import { requireAdmin } from "@/lib/auth";
import { dbConfig, query } from "@/lib/db";
import { getThresholds } from "@/lib/kb";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [thresholds, [counts], [version]] = await Promise.all([
    getThresholds(),
    query<{ qa: number; variants: number; rules: number; logs: number }>(
      "SELECT (SELECT COUNT(*) FROM qa_pairs) AS qa, (SELECT COUNT(*) FROM qa_variants) AS variants, (SELECT COUNT(*) FROM language_rules) AS rules, (SELECT COUNT(*) FROM chat_logs) AS logs",
    ),
    query<{ v: string }>("SELECT VERSION() AS v"),
  ]);

  return (
    <AdminPage title="Settings" description="Matching thresholds, your password and system details.">
      <div className="flex flex-col gap-6">
        <section className="rounded-[16px] border border-line p-5">
          <h2 className="text-[16px] font-semibold">Matching thresholds</h2>
          <p className="mb-4 mt-1 max-w-[70ch] text-[14px] text-ink-2">
            A higher answer threshold makes the bot more careful (fewer wrong answers, more fallbacks). Check the effect on the Test bench after saving.
          </p>
          <ThresholdForm answer={thresholds.answer} suggest={thresholds.suggest} />
        </section>

        <section className="rounded-[16px] border border-line p-5">
          <h2 className="mb-4 text-[16px] font-semibold">Change password</h2>
          <PasswordForm />
        </section>

        <section className="rounded-[16px] border border-line p-5">
          <h2 className="text-[16px] font-semibold">System</h2>
          <dl className="tabular mt-3 grid gap-x-8 gap-y-2 text-[14px] sm:grid-cols-[200px_1fr]">
            <dt className="text-ink-2">Database</dt>
            <dd>
              {dbConfig.database} on {dbConfig.host}:{dbConfig.port} ({version?.v})
            </dd>
            <dt className="text-ink-2">Knowledge base</dt>
            <dd>
              {counts.qa} entries, {counts.variants} extra phrasings, {counts.rules} language rules
            </dd>
            <dt className="text-ink-2">Chat log</dt>
            <dd>{counts.logs} messages</dd>
          </dl>
        </section>
      </div>
    </AdminPage>
  );
}
