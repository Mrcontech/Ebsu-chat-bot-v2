import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr";

/** Shown when MySQL is not running, with the exact steps to fix it. */
export function DbOffline() {
  return (
    <div className="grid min-h-[calc(100dvh-32px)] place-items-center rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft">
      <div className="flex max-w-[460px] flex-col gap-4">
        <span className="grid size-12 place-items-center rounded-[14px] bg-warn-soft text-warn">
          <DatabaseIcon size={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">The knowledge base is not reachable</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">The chatbot keeps its questions and answers in MySQL. It looks like MySQL is not running.</p>
        <ol className="flex flex-col gap-2 text-[14px] text-ink-2">
          <li>1. Open the XAMPP Control Panel.</li>
          <li>2. Click Start next to MySQL and wait for it to turn green.</li>
          <li>3. Refresh this page.</li>
        </ol>
        <p className="text-[13px] text-ink-3">If the database was never created, stop the app and run npm start again; it sets everything up.</p>
      </div>
    </div>
  );
}
