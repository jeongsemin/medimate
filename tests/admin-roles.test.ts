import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkRoleChange, parseEmail } from "../src/lib/admin-roles.ts";

describe("parseEmail", () => {
  it("trims and lower-cases a valid address", () => {
    assert.equal(parseEmail("  Me@Example.COM "), "me@example.com");
  });
  it("rejects malformed input and non-strings", () => {
    for (const bad of ["", "   ", "me", "me@", "@example.com", "me@example", "a b@example.com", "a@b@c.com", null, undefined, 42, {}]) {
      assert.equal(parseEmail(bad), null, `should reject ${String(bad)}`);
    }
  });
  it("rejects absurdly long addresses", () => {
    assert.equal(parseEmail(`${"a".repeat(250)}@example.com`), null);
  });
});

describe("checkRoleChange", () => {
  it("lets a non-admin be promoted and refuses a double promotion", () => {
    assert.equal(checkRoleChange("grant", { isAdmin: false }, 1), null);
    assert.equal(checkRoleChange("grant", { isAdmin: true }, 2), "already_admin");
  });
  it("lets an admin be demoted while another admin remains", () => {
    assert.equal(checkRoleChange("revoke", { isAdmin: true }, 2), null);
  });
  it("never demotes the last admin", () => {
    assert.equal(checkRoleChange("revoke", { isAdmin: true }, 1), "last_admin");
    assert.equal(checkRoleChange("revoke", { isAdmin: true }, 0), "last_admin");
  });
  it("refuses to demote someone who isn't an admin", () => {
    assert.equal(checkRoleChange("revoke", { isAdmin: false }, 3), "not_admin");
  });
});
