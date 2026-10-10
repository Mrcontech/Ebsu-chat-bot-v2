"use client";

import { useActionState } from "react";
import { saveOfficeAction, type FormState } from "@/app/admin/actions";
import type { Office } from "@/lib/kb";
import { buttonClass, Field, inputClass } from "./ui";

export function OfficeForm({ office }: { office: Office }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveOfficeAction, {});
  const id = (name: string) => `${name}-${office.id}`;
  const missing = !office.email && !office.phone;
  return (
    <form action={action} className={`flex flex-col gap-4 rounded-[16px] border p-5 ${missing ? "border-warn/40 bg-warn-soft/40" : "border-line"}`}>
      <input type="hidden" name="id" value={office.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Office name" htmlFor={id("name")}>
          <input id={id("name")} name="name" defaultValue={office.name} required className={inputClass} />
        </Field>
        <Field label="Handles" htmlFor={id("handles")}>
          <input id={id("handles")} name="handles" defaultValue={office.handles ?? ""} className={inputClass} />
        </Field>
        <Field label="Email (separate several with commas)" htmlFor={id("email")}>
          <input id={id("email")} name="email" defaultValue={office.email ?? ""} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor={id("phone")}>
          <input id={id("phone")} name="phone" defaultValue={office.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Location" htmlFor={id("location")}>
          <input id={id("location")} name="location" defaultValue={office.location ?? ""} className={inputClass} />
        </Field>
        <Field label="Website" htmlFor={id("website")}>
          <input id={id("website")} name="website" type="url" defaultValue={office.website ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving..." : "Save office"}
        </button>
        {missing ? <span className="text-[13px] text-warn">No email or phone yet. Add them from an official source.</span> : null}
        {state.ok ? <span className="text-[13px] font-medium text-good">{state.ok}</span> : null}
        {state.error ? <span className="text-[13px] font-medium text-bad">{state.error}</span> : null}
      </div>
    </form>
  );
}
