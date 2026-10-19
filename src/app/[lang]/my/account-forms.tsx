"use client";

import { useActionState } from "react";
import { NICKNAME_MAX } from "@/lib/profile-input";
import { deleteReview, updateNickname, type NicknameState } from "./actions";

export function NicknameForm({
  lang,
  nickname,
  text,
}: {
  lang: string;
  nickname: string;
  text: {
    nickname: string;
    nicknameHelp: string;
    save: string;
    saving: string;
    saved: string;
    error: string;
    notLoggedIn: string;
    generic: string;
  };
}) {
  const [state, action, pending] = useActionState<NicknameState, FormData>(updateNickname, null);
  const message = state?.ok
    ? text.saved
    : state?.error === "invalid"
      ? text.error
      : state?.error === "notLoggedIn"
        ? text.notLoggedIn
        : state?.error
          ? text.generic
          : "";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <label className="block space-y-2">
        <span className="text-[13px] font-bold">{text.nickname}</span>
        <input
          name="nickname"
          defaultValue={nickname}
          required
          maxLength={NICKNAME_MAX * 2}
          className="min-h-[52px] w-full rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus"
        />
        <span className="block text-xs text-muted">{text.nicknameHelp}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? text.saving : text.save}
        </button>
        <p role="status" className={`text-xs ${state?.error ? "text-error" : "text-brand"}`}>
          {message}
        </p>
      </div>
    </form>
  );
}

export function DeleteReviewForm({
  lang,
  reviewId,
  label,
  confirmText,
}: {
  lang: string;
  reviewId: string;
  label: string;
  confirmText: string;
}) {
  return (
    <form
      action={deleteReview}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <button className="flex min-h-12 items-center justify-center rounded-sm px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft">
        {label}
      </button>
    </form>
  );
}
