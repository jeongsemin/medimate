"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReview, type ReviewState } from "./actions";

type Text = {
  pickReceipt: string;
  rating: string;
  body: string;
  bodyPlaceholder: string;
  visitDate: string;
  treatment: string;
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
  errors: Record<string, string>;
};

export function ReviewForm({
  lang,
  hospitalId,
  receipts,
  text,
}: {
  lang: string;
  hospitalId: string;
  receipts: { id: string; label: string }[];
  text: Text;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, null);
  const [rating, setRating] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

  const error = state?.error
    ? state.error === "alreadyUsed"
      ? text.alreadyUsed
      : (text.errors[state.error] ?? text.errors.generic)
    : null;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="hospitalId" value={hospitalId} />
      <input type="hidden" name="rating" value={rating} />

      {receipts.length === 1 ? (
        <input type="hidden" name="receiptId" value={receipts[0].id} />
      ) : (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{text.pickReceipt}</span>
          <select name="receiptId" required className="w-full rounded-lg border border-border bg-card px-3 py-2">
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-medium">{text.rating}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n}`}
              aria-pressed={rating === n}
            >
              <Star
                className={`size-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-border"}`}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">{text.body}</span>
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder={text.bodyPlaceholder}
          className="w-full rounded-lg border border-border bg-card px-3 py-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{text.visitDate}</span>
          <input
            type="date"
            name="visitDate"
            max={today}
            className="w-full rounded-lg border border-border bg-card px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{text.treatment}</span>
          <input
            name="treatment"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-card px-3 py-2"
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium">{text.categories}</legend>
        <div className="text-sm">
          <p className="mb-1">{text.english}</p>
          <div className="flex flex-wrap gap-3">
            {(["none", "basic", "fluent"] as const).map((level) => (
              <label key={level} className="flex items-center gap-1.5">
                <input type="radio" name="english" value={level} defaultChecked={level === "none"} />
                {text.englishOptions[level]}
              </label>
            ))}
          </div>
        </div>
        {(
          [
            ["interpreter", text.interpreter],
            ["director", text.director],
            ["priceExplained", text.priceExplained],
            ["noUpselling", text.noUpselling],
          ] as const
        ).map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={name} />
            {label}
          </label>
        ))}
      </fieldset>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <button
        disabled={pending || rating === 0}
        className="rounded-full bg-brand px-6 py-2.5 font-medium text-white hover:bg-brand-strong disabled:opacity-50"
      >
        {pending ? text.submitting : text.submit}
      </button>
    </form>
  );
}
