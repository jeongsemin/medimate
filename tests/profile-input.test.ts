import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NICKNAME_MAX, parseNickname } from "../src/lib/profile-input.ts";

describe("parseNickname", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(parseNickname("  Jamie   K. "), "Jamie K.");
  });
  it("accepts CJK and emoji, counting code points", () => {
    assert.equal(parseNickname("정세민"), "정세민");
    assert.equal(parseNickname("😀".repeat(NICKNAME_MAX)), "😀".repeat(NICKNAME_MAX));
    assert.equal(parseNickname("😀".repeat(NICKNAME_MAX + 1)), null);
  });
  it("rejects empty, too long and control characters", () => {
    assert.equal(parseNickname("   "), null);
    assert.equal(parseNickname(null), null);
    assert.equal(parseNickname("a".repeat(NICKNAME_MAX + 1)), null);
    assert.equal(parseNickname("bad\u0000name"), null);
    assert.equal(parseNickname("zero​width"), null);
  });
});
