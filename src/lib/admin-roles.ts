const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-cased, trimmed address, or null when it isn't plausibly an email. */
export function parseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

export type RoleError = "already_admin" | "not_admin" | "last_admin";

/** Whether `target` may be promoted (`grant`) or demoted (`revoke`), given the current admin count. */
export function checkRoleChange(
  action: "grant" | "revoke",
  target: { isAdmin: boolean },
  adminCount: number,
): RoleError | null {
  if (action === "grant") return target.isAdmin ? "already_admin" : null;
  if (!target.isAdmin) return "not_admin";
  return adminCount <= 1 ? "last_admin" : null;
}
