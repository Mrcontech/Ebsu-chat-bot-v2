"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState } from "react";
import { saveQaAction, type FormState } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "./ui";

export type QaFormValues = {
  id?: number;
  question: string;
  answer: string;
  category_id: number | "";
  office_id: number | "";
  source_url: string;
  source_note: string;
  variants: string;
  is_active: boolean;
  is_featured: boolean;
  from_unanswered?: number;
};

export function QaForm({
  values,
  categories,
  offices,
}: {
  values: QaFormValues;
  categories: { id: number; name: string }[];
  offices: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQaAction, {});
  const v = state.fields;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {values.from_unanswered ? <input type="hidden" name="from_unanswered" value={values.from_unanswered} /> : null}

      <div className="flex flex-col gap-5">
        <Field label="Main question" htmlFor="question" help="Write it the way a student would ask it.">
          <input id="question" name="question" required maxLength={500} defaultValue={v?.question ?? values.question} className={inputClass} />
        </Field>

        <Field
          label="Other ways students ask this"
          htmlFor="variants"
          help="One per line. Include short forms, Pidgin and common misspellings. More phrasings give better matching."
        >
          <textarea id="variants" name="variants" rows={6} defaultValue={v?.variants ?? values.variants} className={`${inputClass} leading-relaxed`} />
        </Field>

        <Field
          label="Answer"
          htmlFor="answer"
          help="Plain text. Leave a blank line between paragraphs. Start lines with - for bullets or 1. for steps. Wrap words in **double stars** for bold."
        >
          <textarea id="answer" name="answer" rows={10} required defaultValue={v?.answer ?? values.answer} className={`${inputClass} leading-relaxed`} />
        </Field>
      </div>

      <div className="flex flex-col gap-5">
        <Field label="Topic" htmlFor="category_id">
          <select id="category_id" name="category_id" required defaultValue={v?.category_id ?? String(values.category_id)} className={inputClass}>
            <option value="">Choose a topic</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Office to contact" htmlFor="office_id" help="Shown with the answer when students need more help.">
          <select id="office_id" name="office_id" defaultValue={v?.office_id ?? String(values.office_id)} className={inputClass}>
            <option value="">None</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Official source (web address)" htmlFor="source_url" help="The EBSU page or document the answer comes from.">
          <input id="source_url" name="source_url" type="url" defaultValue={v?.source_url ?? values.source_url} placeholder="https://ebsu.edu.ng/..." className={inputClass} />
        </Field>

        <Field label="Source note" htmlFor="source_note" help="For example: 2026/2027 Post-UTME notice.">
          <input id="source_note" name="source_note" maxLength={255} defaultValue={v?.source_note ?? values.source_note} className={inputClass} />
        </Field>

        <fieldset className="flex flex-col gap-3 rounded-[14px] border border-line p-4">
          <legend className="px-1 text-[14px] font-medium">Visibility</legend>
          <label className="flex items-start gap-3 text-[14px]">
            <input type="checkbox" name="is_active" defaultChecked={values.is_active} className="mt-0.5 size-4 accent-[#c44a1f]" />
            <span>
              Live
              <span className="block text-[13px] text-ink-3">The bot can give this answer.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-[14px]">
            <input type="checkbox" name="is_featured" defaultChecked={values.is_featured} className="mt-0.5 size-4 accent-[#c44a1f]" />
            <span>
              Show in Suggested questions
              <span className="block text-[13px] text-ink-3">Listed in the chat sidebar for students to tap.</span>
            </span>
          </label>
        </fieldset>

        {state.error ? (
          <p role="alert" className="rounded-[12px] bg-bad-soft px-4 py-3 text-[14px] text-bad">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            <FloppyDiskIcon size={17} weight="bold" /> {pending ? "Saving..." : "Save"}
          </button>
          <Link href="/admin/knowledge" className={buttonClass.secondary}>
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
