"use client";

import { resolveReports, restoreReview } from "../actions";

type Text = {
  reasonPlaceholder: string;
  dismiss: string;
  hide: string;
  hideSuspend: string;
  confirmHide: string;
  confirmHideSuspend: string;
};

/** Decide every open report on one review. Hiding asks first; dismissing doesn't change anything public. */
export function ResolveForm({ lang, reviewId, alreadyHidden, text }: { lang: string; reviewId: string; alreadyHidden: boolean; text: Text }) {
  return (
    <form
      action={resolveReports}
      onSubmit={(e) => {
        const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        const message = decision === "hide" ? text.confirmHide : decision === "hide_suspend" ? text.confirmHideSuspend : null;
        if (message && !window.confirm(message)) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <input
        name="reason"
        maxLength={200}
        placeholder={text.reasonPlaceholder}
        className="min-h-12 w-full rounded-sm border border-border bg-white px-3.5 text-sm outline-none focus:border-focus"
      />
      <div className="flex flex-wrap gap-3">
        <button name="decision" value="dismiss" className="min-h-12 rounded-sm border border-border bg-white px-5 py-3 text-sm font-bold text-muted hover:text-foreground">
          {text.dismiss}
        </button>
        {!alreadyHidden && (
          <button name="decision" value="hide" className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong">
            {text.hide}
          </button>
        )}
        <button name="decision" value="hide_suspend" className="min-h-12 rounded-sm border border-error bg-white px-5 py-3 text-sm font-bold text-error hover:bg-error-soft">
          {text.hideSuspend}
        </button>
      </div>
    </form>
  );
}

export function RestoreForm({ lang, reviewId, label, confirmText }: { lang: string; reviewId: string; label: string; confirmText: string }) {
  return (
    <form
      action={restoreReview}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="reviewId" value={reviewId} />
      <button className="flex min-h-12 items-center justify-center rounded-sm px-5 py-3 text-sm font-bold text-brand hover:bg-brand-soft">{label}</button>
    </form>
  );
}
