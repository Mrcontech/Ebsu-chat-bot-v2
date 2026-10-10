import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-shell";
import { QaForm } from "@/components/admin/qa-form";
import { getUnanswered } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getCategories, getOffices } from "@/lib/kb";

export const metadata: Metadata = { title: "Add question" };

export default async function NewQaPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireAdmin();
  const { from } = await searchParams;
  const [categories, offices, unanswered] = await Promise.all([
    getCategories(),
    getOffices(),
    from && Number(from) > 0 ? getUnanswered(Number(from)) : Promise.resolve(null),
  ]);

  return (
    <AdminPage
      title="Add a question"
      description={
        unanswered
          ? `Answering a student's question: "${unanswered.question}". Add the answer only from an official EBSU source.`
          : "Add the answer only from an official EBSU source, and link to it."
      }
    >
      <QaForm
        categories={categories}
        offices={offices}
        values={{
          question: unanswered?.question ?? "",
          answer: "",
          category_id: "",
          office_id: "",
          source_url: "",
          source_note: "",
          variants: "",
          is_active: true,
          is_featured: false,
          from_unanswered: unanswered?.id,
        }}
      />
    </AdminPage>
  );
}
