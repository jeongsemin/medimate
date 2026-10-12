"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";

type Text = {
  receiptLabel: string;
  receiptHelp: string;
  receiptPrivacy: string;
  upload: string;
  uploading: string;
  status: Record<string, string>;
  errors: Record<string, string>;
  reasons: Record<string, string>;
};

type Outcome = { kind: "ok" | "wait" | "error"; message: string; reasons?: string[] };

export function ReceiptUploader({ hospitalId, text }: { hospitalId: string; text: Text }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setOutcome(null);
    try {
      const body = new FormData();
      body.set("hospitalId", hospitalId);
      body.set("file", file);
      const res = await fetch("/api/receipts", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        setOutcome({ kind: "error", message: text.errors[json.error] ?? text.errors.generic });
      } else {
        setOutcome({
          kind: json.status === "pending" ? "wait" : "ok",
          message: text.status[json.status],
          reasons: json.status === "pending" ? json.reasons : undefined,
        });
        setPreview(null);
        if (input.current) input.current.value = "";
        router.refresh();
      }
    } catch {
      setOutcome({ kind: "error", message: text.errors.generic });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={upload} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="receipt-file">
        {text.receiptLabel}
      </label>
      <input
        id="receipt-file"
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        required
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-brand-strong"
      />
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="max-h-56 rounded-lg border border-border" />
      )}
      <p className="text-xs text-muted">{text.receiptHelp}</p>
      <p className="text-xs text-muted">{text.receiptPrivacy}</p>
      <button
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-strong disabled:opacity-60"
      >
        <Camera className="size-4" aria-hidden />
        {busy ? text.uploading : text.upload}
      </button>

      <div aria-live="polite">
        {outcome && (
          <div
            className={`rounded-lg p-3 text-sm ${
              outcome.kind === "ok"
                ? "bg-brand-soft text-brand-strong"
                : outcome.kind === "wait"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-red-50 text-red-700"
            }`}
          >
            <p>{outcome.message}</p>
            {outcome.reasons && outcome.reasons.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-xs">
                {outcome.reasons.map((r) => (
                  <li key={r}>{text.reasons[r] ?? r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
