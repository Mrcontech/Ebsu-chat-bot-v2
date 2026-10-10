"use client";

import { SignInIcon } from "@phosphor-icons/react";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Username" htmlFor="username">
        <input id="username" name="username" autoComplete="username" defaultValue={state.fields?.username} required className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state.error ? (
        <p role="alert" className="rounded-[12px] bg-bad-soft px-4 py-3 text-[14px] text-bad">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${buttonClass.primary} h-11`}>
        <SignInIcon size={18} weight="bold" /> {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
