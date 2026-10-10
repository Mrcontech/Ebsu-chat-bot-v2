import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { OfficeForm } from "@/components/admin/office-form";
import { requireAdmin } from "@/lib/auth";
import { getOffices } from "@/lib/kb";

export const metadata: Metadata = { title: "Offices" };

export default async function OfficesPage() {
  await requireAdmin();
  const offices = await getOffices();
  const missing = offices.filter((o) => !o.email && !o.phone).length;
  return (
    <AdminPage
      title="Offices"
      description={`Where the bot sends students when it has no answer.${missing ? ` ${missing} offices still have no published email or phone; until you add them, the bot also shows the Registrar's general contact.` : ""}`}
    >
      <div className="flex flex-col gap-3">
        {offices.map((o) => (
          <OfficeForm key={o.id} office={o} />
        ))}
      </div>
    </AdminPage>
  );
}
