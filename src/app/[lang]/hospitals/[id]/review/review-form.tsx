"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { BODY_MAX, BODY_MIN, TREATMENT_MAX, charCount } from "@/lib/review-input";
import { submitReview, type ReviewState } from "./actions";

type Text = {
  write: {
    visitMonth: string;
    treatment: string;
    treatmentPlaceholder: string;
    rating: string;
    ratingWords: string[];
    ratingHelp: string;
    body: string;
    bodyHelp: string;
    categoriesHelp: string;
    publishTitle: string;
    publishBody: string;
    consents: string[];
    after: string;
  };
  review: {
    pickReceipt: string;
    categories: string;
    english: string;
    englishOptions: Record<"none" | "basic" | "fluent", string>;
    interpreter: string;
    director: string;
    priceExplained: string;
    noUpselling: string;
    submit: string;
    submitting: string;
    alreadyUsed: string;
  };
  errors: Record<string, string>;
};

const field =
  "w-full min-h-[52px] rounded-sm border border-border bg-white p-3.5 text-sm outline-none focus:border-focus";
const label = "text-[13px] font-bold";
const chip =
  "flex min-h-10 cursor-pointer items-center rounded-full border border-border bg-white px-3.5 py-2 text-[13px] text-muted has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:font-bold has-[:checked]:text-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus";

export function ReviewForm({
  lang,
  hospitalId,
  receipts,
  defaultMonth,
  treatmentSuggestions,
  text,
}: {
  lang: string;
  hospitalId: string;
  receipts: { id: string; label: string }[];
  defaultMonth: string;
  treatmentSuggestions: string[];
  text: Text;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const w = text.write;
  const length = charCount(body);

  const error = state?.error
    ? state.error === "alreadyUsed"
      ? text.review.alreadyUsed
      : state.error === "consent"
        ? text.errors.consent
        : (text.errors[state.error] ?? text.errors.generic)
    : null;

  return (
    <form action={action} className="space-y-[30px]">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="hospitalId" value={hospitalId} />

      {receipts.length === 1 ? (
        <input type="hidden" name="receiptId" value={receipts[0].id} />
      ) : (
        <label className="block space-y-2">
          <span className={label}>{text.review.pickReceipt}</span>
          <select name="receiptId" required className={field}>
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className={label}>{w.visitMonth} *</span>
          <input type="month" name="visitMonth" required defaultValue={defaultMonth} max={defaultMonth} className={field} />
        </label>
        <label className="block space-y-2">
          <span className={label}>{w.treatment} *</span>
          <input
            name="treatment"
            required
            maxLength={TREATMENT_MAX}
            list="treatment-suggestions"
            placeholder={w.treatmentPlaceholder}
            className={field}
          />
          <datalist id="treatment-suggestions">
            {treatmentSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className={`${label} mb-3`}>{w.rating} *</legend>
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className={`flex size-11 cursor-pointer items-center justify-center rounded-sm border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
                n <= rating ? "border-transparent bg-star-soft" : "border-border bg-white"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                required
                checked={rating === n}
                onChange={() => setRating(n)}
                className="sr-only"
              />
              <Star className={`size-7 ${n <= rating ? "fill-star text-star" : "text-border"}`} aria-hidden />
              <span className="sr-only">{w.ratingWords[n - 1]}</span>
            </label>
          ))}
          <p className="text-sm font-bold" aria-live="polite">
            {rating > 0 ? w.ratingWords[rating - 1] : ""}
          </p>
        </div>
        <p className="text-[11px] text-muted">{w.ratingHelp}</p>
      </fieldset>

      <label className="block space-y-2">
        <span className={label}>{w.body} *</span>
        <textarea
          name="body"
          required
          rows={7}
          minLength={BODY_MIN}
          maxLength={BODY_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${field} min-h-[160px] leading-relaxed`}
        />
        <span className={`block text-xs ${length > 0 && length < BODY_MIN ? "text-error" : "text-muted"}`}>
          {w.bodyHelp.replace("{n}", String(length))}
        </span>
      </label>

      <fieldset className="space-y-4 rounded-[12px] border border-border p-5">
        <legend className="px-1 text-[13px] font-bold">{text.review.categories}</legend>
        <p className="text-xs text-muted">{w.categoriesHelp}</p>
        <div className="space-y-2">
          <p className="text-xs font-bold">{text.review.english}</p>
          <div className="flex flex-wrap gap-2">
            {(["none", "basic", "fluent"] as const).map((level) => (
              <label key={level} className={chip}>
                <input type="radio" name="english" value={level} defaultChecked={level === "none"} className="sr-only" />
                {text.review.englishOptions[level]}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["interpreter", text.review.interpreter],
              ["director", text.review.director],
              ["priceExplained", text.review.priceExplained],
              ["noUpselling", text.review.noUpselling],
            ] as const
          ).map(([name, labelText]) => (
            <label key={name} className={chip}>
              <input type="checkbox" name={name} className="sr-only" />
              {labelText}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5 rounded-[12px] bg-brand-soft p-5">
        <p className="text-sm font-bold text-brand">{w.publishTitle}</p>
        <p className="text-xs leading-relaxed text-muted">{w.publishBody}</p>
      </div>

      <div className="space-y-3 text-[13px]">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="consentPublish" required className="mt-1 size-4 accent-brand" />
          <span className="font-bold">{w.consents[0]}</span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="consentOwn" required className="mt-1 size-4 accent-brand" />
          <span>{w.consents[1]}</span>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-sm bg-error-soft p-3.5 text-xs text-error">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          disabled={pending}
          className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-60"
        >
          {pending ? text.review.submitting : text.review.submit}
        </button>
      </div>
      <p className="text-[11px] text-muted">{w.after}</p>
    </form>
  );
}
