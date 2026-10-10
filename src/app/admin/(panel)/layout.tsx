import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DbOffline } from "@/components/db-offline";
import { getPendingCount } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { isConnectionError } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Every page in the admin panel requires a signed-in admin. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  let pending = 0;
  let name = "";
  try {
    const admin = await requireAdmin();
    name = admin.full_name || admin.username;
    pending = await getPendingCount();
  } catch (error) {
    if (isConnectionError(error)) return <DbOffline />;
    throw error; // includes the redirect to the login page
  }
  return (
    <AdminShell adminName={name} pending={pending}>
      {children}
    </AdminShell>
  );
}
