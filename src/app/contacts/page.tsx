import { EnvelopeSimpleIcon, GlobeSimpleIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { DbOffline } from "@/components/db-offline";
import { StudentShell } from "@/components/student-shell";
import { getOffices, type Office } from "@/lib/kb";

export const metadata: Metadata = { title: "Offices and contacts" };
export const dynamic = "force-dynamic";

function OfficeCard({ office }: { office: Office }) {
  const has = office.email || office.phone || office.location || office.website;
  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-5">
      <div>
        <h2 className="text-[16px] font-semibold tracking-tight">{office.name}</h2>
        {office.handles ? <p className="mt-0.5 text-[13.5px] text-ink-2">{office.handles}</p> : null}
      </div>
      {has ? (
        <ul className="flex flex-col gap-2 text-[14px] text-ink-2">
          {office.email ? (
            <li className="flex items-start gap-2.5">
              <EnvelopeSimpleIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="flex flex-wrap gap-x-3">
                {office.email.split(/[,;]\s*/).map((e) => (
                  <a key={e} href={`mailto:${e}`} className="break-all font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                    {e}
                  </a>
                ))}
              </span>
            </li>
          ) : null}
          {office.phone ? (
            <li className="flex items-start gap-2.5">
              <PhoneIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span className="tabular">{office.phone}</span>
            </li>
          ) : null}
          {office.location ? (
            <li className="flex items-start gap-2.5">
              <MapPinIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <span>{office.location}</span>
            </li>
          ) : null}
          {office.website ? (
            <li className="flex items-start gap-2.5">
              <GlobeSimpleIcon size={17} className="mt-0.5 shrink-0 text-ink-3" />
              <a href={office.website} target="_blank" rel="noreferrer" className="break-all font-medium text-accent-ink underline decoration-accent/40 underline-offset-2">
                {office.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="rounded-[12px] bg-surface-2 px-3 py-2 text-[13px] text-ink-3">
          Contact details for this office are not on the EBSU website yet. Ask at the Office of the Registrar.
        </p>
      )}
    </article>
  );
}

export default async function ContactsPage() {
  let offices: Office[];
  try {
    offices = await getOffices();
  } catch {
    return (
      <StudentShell>
        <DbOffline />
      </StudentShell>
    );
  }
  const reachable = offices.filter((o) => o.email || o.phone);
  const pending = offices.filter((o) => !o.email && !o.phone);

  return (
    <StudentShell>
      <div className="scroll-area flex min-h-[calc(100dvh-32px)] flex-col gap-3 overflow-y-auto">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight">Offices and contacts</h1>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
            Contact details below come from official EBSU web pages. When the bot cannot answer a question, it points you to one of these offices.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {reachable.map((o) => (
              <OfficeCard key={o.id} office={o} />
            ))}
          </div>
          {pending.length > 0 ? (
            <>
              <h2 className="mt-8 text-[15px] font-semibold text-ink-2">Offices without published contact details</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {pending.map((o) => (
                  <OfficeCard key={o.id} office={o} />
                ))}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </StudentShell>
  );
}
