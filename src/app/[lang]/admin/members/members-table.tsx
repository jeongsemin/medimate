"use client";

import { useState } from "react";
import { setSuspension } from "../actions";

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  joined: string;
  country: string;
  age: string;
  gender: string;
  receipts: number;
  reviews: number;
  isAdmin: boolean;
  suspended: boolean;
  reason: string | null;
  /** The signed-in admin's own row: shown, but never selectable for suspension. */
  isSelf: boolean;
};

type Text = {
  columns: Record<"member" | "joined" | "country" | "age" | "gender" | "receipts" | "reviews" | "status", string>;
  status: Record<"active" | "suspended" | "admin", string>;
  selectAll: string;
  selectRow: string;
  selected: string;
  reasonPlaceholder: string;
  suspend: string;
  restore: string;
  suspendConfirm: string;
  restoreConfirm: string;
  empty: string;
};

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export function MembersTable({ lang, rows, text }: { lang: string; rows: MemberRow[]; text: Text }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const selectable = rows.filter((r) => !r.isAdmin && !r.isSelf);
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.id));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const th = "whitespace-nowrap px-4 py-3 text-left text-xs font-bold text-muted";
  const td = "px-4 py-3 align-top";

  return (
    <form
      action={setSuspension}
      onSubmit={(e) => {
        const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
        const message = decision === "restore" ? text.restoreConfirm : text.suspendConfirm;
        if (!window.confirm(fill(message, { n: picked.size }))) e.preventDefault();
      }}
      className="space-y-4"
    >
      <input type="hidden" name="lang" value={lang} />

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-4">
        <p role="status" className="text-sm font-bold">
          {fill(text.selected, { n: picked.size })}
        </p>
        <input
          name="reason"
          maxLength={200}
          placeholder={text.reasonPlaceholder}
          className="min-h-12 min-w-[220px] flex-1 rounded-sm border border-border bg-white px-3.5 text-sm outline-none focus:border-focus"
        />
        <button
          name="decision"
          value="suspend"
          disabled={picked.size === 0}
          className="min-h-12 rounded-sm border border-error bg-white px-5 py-3 text-sm font-bold text-error hover:bg-error-soft disabled:opacity-40"
        >
          {text.suspend}
        </button>
        <button
          name="decision"
          value="restore"
          disabled={picked.size === 0}
          className="min-h-12 rounded-sm bg-brand px-5 py-3 text-sm font-bold text-white hover:bg-brand-strong disabled:opacity-40"
        >
          {text.restore}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{text.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead className="border-b border-border bg-surface">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={text.selectAll}
                    checked={allPicked}
                    disabled={selectable.length === 0}
                    onChange={() => setPicked(allPicked ? new Set() : new Set(selectable.map((r) => r.id)))}
                    className="size-4 accent-brand"
                  />
                </th>
                <th className={th}>{text.columns.member}</th>
                <th className={th}>{text.columns.joined}</th>
                <th className={th}>{text.columns.country}</th>
                <th className={th}>{text.columns.age}</th>
                <th className={th}>{text.columns.gender}</th>
                <th className={`${th} text-right`}>{text.columns.receipts}</th>
                <th className={`${th} text-right`}>{text.columns.reviews}</th>
                <th className={th}>{text.columns.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className={r.suspended ? "bg-error-soft/40" : undefined}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      name="ids"
                      value={r.id}
                      aria-label={fill(text.selectRow, { name: r.name })}
                      checked={picked.has(r.id)}
                      disabled={r.isAdmin || r.isSelf}
                      onChange={() => toggle(r.id)}
                      className="size-4 accent-brand disabled:opacity-30"
                    />
                  </td>
                  <td className={`${td} min-w-[200px]`}>
                    <p className="font-bold">{r.name}</p>
                    <p className="break-all text-xs text-muted">{r.email}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{r.joined}</td>
                  <td className={td}>{r.country}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.age}</td>
                  <td className={`${td} whitespace-nowrap`}>{r.gender}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.receipts}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.reviews}</td>
                  <td className={td}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.isAdmin && (
                        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand">{text.status.admin}</span>
                      )}
                      {r.suspended ? (
                        <span className="rounded-full bg-error-soft px-2.5 py-1 text-[11px] font-bold text-error">{text.status.suspended}</span>
                      ) : (
                        !r.isAdmin && <span className="text-xs text-muted">{text.status.active}</span>
                      )}
                    </div>
                    {r.suspended && r.reason && <p className="mt-1 max-w-[220px] break-words text-xs text-error">{r.reason}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
