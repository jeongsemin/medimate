export const REPORT_REASONS = ["spam", "abuse", "personal_info", "false_info", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const DETAIL_MAX = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isReportReason = (v: unknown): v is ReportReason => (REPORT_REASONS as readonly unknown[]).includes(v);

export type ReportInput = { reviewId: string; reason: ReportReason; detail: string | null };

/** Counts by code point so emoji and Korean/Japanese/Chinese text are measured like the form shows them. */
const charCount = (s: string) => [...s].length;

/**
 * Reads a report form. The reason must be one of the known ones; "other" needs an explanation,
 * and an explanation longer than the limit is rejected rather than silently cut.
 */
export function parseReportInput(get: (key: string) => string | null): ReportInput | null {
  const reviewId = (get("reviewId") ?? "").trim();
  const reason = get("reason");
  if (!UUID.test(reviewId) || !isReportReason(reason)) return null;

  const detail = (get("detail") ?? "").replace(/\s+/g, " ").trim();
  if (charCount(detail) > DETAIL_MAX) return null;
  if (reason === "other" && detail === "") return null;
  return { reviewId, reason, detail: detail || null };
}

export type ReportRow = { review_id: string; reason: string; detail: string | null; created_at: string };

export type ReportGroup = {
  reviewId: string;
  count: number;
  reasons: Partial<Record<ReportReason, number>>;
  details: string[];
  latestAt: string;
};

/** Groups open reports by review: most reported first, then most recently reported. */
export function groupReports(rows: ReportRow[]): ReportGroup[] {
  const groups = new Map<string, ReportGroup>();
  for (const r of rows) {
    const g = groups.get(r.review_id) ?? { reviewId: r.review_id, count: 0, reasons: {}, details: [], latestAt: r.created_at };
    g.count += 1;
    if (isReportReason(r.reason)) g.reasons[r.reason] = (g.reasons[r.reason] ?? 0) + 1;
    if (r.detail) g.details.push(r.detail);
    if (r.created_at > g.latestAt) g.latestAt = r.created_at;
    groups.set(r.review_id, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || (a.latestAt < b.latestAt ? 1 : -1));
}
