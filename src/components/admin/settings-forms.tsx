"use client";

import { useActionState } from "react";
import { changePasswordAction, saveThresholdsAction, type FormState } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "./ui";

function Result({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-[12px] bg-bad-soft px-4 py-3 text-[14px] text-bad">{state.error}</p>;
  if (state.ok) return <p className="rounded-[12px] bg-good-soft px-4 py-3 text-[14px] text-good">{state.ok}</p>;
  return null;
}

export function ThresholdForm({ answer, suggest }: { answer: number; suggest: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveThresholdsAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Answer threshold" htmlFor="answer_threshold" help="Scores at or above this get a direct answer.">
          <input id="answer_threshold" name="answer_threshold" type="number" min="0.05" max="1" step="0.01" defaultValue={answer.toFixed(2)} className={inputClass} />
        </Field>
        <Field label="Suggestion threshold" htmlFor="suggest_threshold" help="Scores from here up to the answer threshold get 'Did you mean...?'.">
          <input id="suggest_threshold" name="suggest_threshold" type="number" min="0.01" max="1" step="0.01" defaultValue={suggest.toFixed(2)} className={inputClass} />
        </Field>
      </div>
      <Result state={state} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving..." : "Save thresholds"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="current">
          <input id="current" name="current" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <Field label="New password" htmlFor="next" help="At least 8 characters.">
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
        </Field>
        <Field label="Repeat new password" htmlFor="confirm">
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
        </Field>
      </div>
      <Result state={state} />
      <div>
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Saving..." : "Change password"}
        </button>
      </div>
    </form>
  );
}
