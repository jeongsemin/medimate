import { isAgeGroup, isCountry, isGender } from "./member-details.ts";

export const PAGE_SIZE = 20;
export const STATUSES = ["all", "active", "suspended", "admin"] as const;
export type Status = (typeof STATUSES)[number];

/** A filter value is either empty (no filter), "unset" (members who left it blank) or a concrete value. */
export type MemberFilters = {
  q: string;
  country: string;
  age: string;
  gender: string;
  status: Status;
  from: string;
  to: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const isoDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? v : "";
};

const pick = (v: string, ok: (x: string) => boolean) => (v === "unset" || ok(v) ? v : "");

/** Turns the page's query string into a safe filter; anything unrecognised is dropped. */
export function parseMemberFilters(params: Params): MemberFilters {
  const status = first(params.status) as Status;
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    country: pick(first(params.country) === "unset" ? "unset" : first(params.country).toUpperCase(), isCountry),
    age: pick(first(params.age), isAgeGroup),
    gender: pick(first(params.gender), isGender),
    status: (STATUSES as readonly string[]).includes(status) ? status : "all",
    from: isoDate(first(params.from)),
    to: isoDate(first(params.to)),
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Query string for the current filters (defaults omitted), optionally for another page. */
export function memberQuery(f: MemberFilters, page = f.page): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.country) p.set("country", f.country);
  if (f.age) p.set("age", f.age);
  if (f.gender) p.set("gender", f.gender);
  if (f.status !== "all") p.set("status", f.status);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const hasMemberFilters = (f: MemberFilters) =>
  Boolean(f.q || f.country || f.age || f.gender || f.status !== "all" || f.from || f.to);

/** Members that a bulk suspension may touch: never an administrator, never the person acting. */
export function pickSuspendTargets(ids: string[], selfId: string, adminIds: ReadonlySet<string>): string[] {
  return [...new Set(ids)].filter((id) => id !== selfId && !adminIds.has(id));
}
