"use client";

import { useActionState } from "react";
import { grantAdmin, revokeAdmin, type GrantState } from "./actions";

type Text = {
  emailLabel: string;
  emailHelp: string;
  emailPlaceholder: string;
  add: string;
  adding: string;
  added: string;
  errors: Record<"invalidEmail" | "notFound" | "already_admin" | "forbidden" | "generic", string>;
};

export function GrantAdminForm({ lang, text }: { lang: string; text: Text }) {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantAdmin, null);
  const error = state?.error;
  const message = state?.ok ? text.added : error ? (text.errors[error as keyof Text["errors"]] ?? text.errors.generic) : "";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <label className="block space-y-2">
        <span className="text-[13px] font-bold">{text.emailLabel}</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder={text.emailPlaceholder}
          className="min-h-[52px] w-full rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus"
        />
        <span className="block text-xs text-muted">{text.emailHelp}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? text.adding : text.add}
        </button>
        <p role="status" className={`text-xs ${error ? "text-error" : "text-brand"}`}>
          {message}
        </p>
      </div>
    </form>
  );
}

export function RevokeAdminForm({
  lang,
  userId,
  label,
  confirmText,
}: {
  lang: string;
  userId: string;
  label: string;
  confirmText: string;
}) {
  return (
    <form
      action={revokeAdmin}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="userId" value={userId} />
      <button className="flex min-h-12 items-center justify-center rounded-sm px-5 py-3 text-sm font-bold text-error hover:bg-error-soft">
        {label}
      </button>
    </form>
  );
}
