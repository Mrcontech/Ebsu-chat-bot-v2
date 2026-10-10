import { TrashIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteQaAction } from "@/app/admin/actions";
import { AdminPage } from "@/components/admin/admin-shell";
import { QaForm } from "@/components/admin/qa-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { buttonClass } from "@/components/admin/ui";
import { getQa } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getOffices } from "@/lib/kb";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const qa = await getQa(Number(id));
  if (!qa) notFound();
  const [categories, offices] = await Promise.all([getCategories(), getOffices()]);

  return (
    <AdminPage
      title="Edit question"
      description="Changes take effect immediately: the matcher rebuilds its index on the next message."
      actions={
        <form action={deleteQaAction}>
          <input type="hidden" name="id" value={qa.id} />
          <ConfirmButton message="Delete this question and all its phrasings? This cannot be undone." className={buttonClass.danger}>
            <TrashIcon size={16} /> Delete
          </ConfirmButton>
        </form>
      }
    >
      <QaForm
        categories={categories}
        offices={offices}
        values={{
          id: qa.id,
          question: qa.question,
          answer: qa.answer,
          category_id: qa.category_id,
          office_id: qa.office_id ?? "",
          source_url: qa.source_url ?? "",
          source_note: qa.source_note ?? "",
          variants: qa.variants.join("\n"),
          is_active: Boolean(qa.is_active),
          is_featured: Boolean(qa.is_featured),
        }}
      />
    </AdminPage>
  );
}
