"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { REPORT_REASONS, DETAIL_MAX } from "@/lib/report-input";
import { submitReport, type ReportState } from "./actions";

type Text = {
  open: string;
  intro: string;
  reason: string;
  reasons: Record<(typeof REPORT_REASONS)[number], string>;
  detail: string;
  detailHelp: string;
  submit: string;
  submitting: string;
  done: string;
  errors: Record<"invalid" | "own" | "already" | "suspended" | "limit" | "notLoggedIn" | "generic", string>;
};

export function ReportForm({ lang, reviewId, text }: { lang: string; reviewId: string; text: Text }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, null);
  const [reason, setReason] = useState("");
  // <form action> would reset the form after an error and wipe what the member typed.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  if (state?.ok) {
    return (
      <p role="status" className="rounded-md bg-brand-soft p-5 text-sm font-bold text-brand">
        {text.done}
      </p>
    );
  }

  return (
    <details className="rounded-md border border-border bg-card p-5">
      <summary className="min-h-6 cursor-pointer text-sm font-bold text-muted hover:text-foreground">{text.open}</summary>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="reviewId" value={reviewId} />
        <p className="text-xs text-muted">{text.intro}</p>

        <fieldset className="space-y-2.5">
          <legend className="text-[13px] font-bold">{text.reason}</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="reason"
                value={r}
                required
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 accent-brand"
              />
              {text.reasons[r]}
            </label>
          ))}
        </fieldset>

        <label className="block space-y-2">
          <span className="text-[13px] font-bold">{text.detail}</span>
          <textarea
            name="detail"
            rows={3}
            maxLength={DETAIL_MAX}
            required={reason === "other"}
            className="w-full rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus"
          />
          <span className="block text-xs text-muted">{text.detailHelp}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={pending}
            className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
          >
            {pending ? text.submitting : text.submit}
          </button>
          {state?.error && (
            <p role="alert" className="text-xs text-error">
              {text.errors[state.error]}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
