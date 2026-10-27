"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { NICKNAME_MAX } from "@/lib/profile-input";
import { deleteReview, updateMemberDetails, updateNickname, type DetailsState, type NicknameState } from "./actions";

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

type DetailsText = {
  title: string;
  help: string;
  country: string;
  age: string;
  gender: string;
  none: string;
  ageOptions: Record<string, string>;
  genderOptions: Record<string, string>;
  save: string;
  saving: string;
  saved: string;
  error: string;
  notLoggedIn: string;
  generic: string;
};

export function MemberDetailsForm({
  lang,
  countries,
  current,
  text,
}: {
  lang: string;
  countries: { code: string; name: string }[];
  current: { country: string | null; age_group: string | null; gender: string | null };
  text: DetailsText;
}) {
  const [state, action, pending] = useActionState<DetailsState, FormData>(updateMemberDetails, null);
  // Passing the action to <form action> makes React reset the form when it finishes. The selects
  // would then fall back to the options they were first rendered with, i.e. the old saved values.
  // Submitting inside a transition keeps what the member picked on screen.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
  const message = state?.ok
    ? text.saved
    : state?.error === "invalid"
      ? text.error
      : state?.error === "notLoggedIn"
        ? text.notLoggedIn
        : state?.error
          ? text.generic
          : "";
  const select =
    "min-h-[52px] w-full rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus";
  return (
    <form onSubmit={submit} className="space-y-4">
      <input type="hidden" name="lang" value={lang} />
      <div className="space-y-1">
        <p className="text-[15px] font-bold">{text.title}</p>
        <p className="text-xs text-muted">{text.help}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-[13px] font-bold">{text.country}</span>
          <select name="country" defaultValue={current.country ?? ""} className={select}>
            <option value="">{text.none}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[13px] font-bold">{text.age}</span>
          <select name="age_group" defaultValue={current.age_group ?? ""} className={select}>
            <option value="">{text.none}</option>
            {Object.entries(text.ageOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[13px] font-bold">{text.gender}</span>
          <select name="gender" defaultValue={current.gender ?? ""} className={select}>
            <option value="">{text.none}</option>
            {Object.entries(text.genderOptions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
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
