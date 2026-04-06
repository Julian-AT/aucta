import { describe, expect, it } from "vitest";
import { generateInviteCode, normalizeInviteCode } from "./invite-code.js";

const VALID_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const AMBIGUOUS_CHARS = ["I", "O", "0", "1"];

describe("generateInviteCode", () => {
  it("returns a string of exactly 6 characters", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("only contains characters from the allowed charset", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode();
      for (const char of code) {
        expect(VALID_CHARSET).toContain(char);
      }
    }
  });

  it("does not contain ambiguous characters I, O, 0, or 1", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      for (const ambiguous of AMBIGUOUS_CHARS) {
        expect(code).not.toContain(ambiguous);
      }
    }
  });

  it("produces different codes on consecutive calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 10; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("normalizeInviteCode", () => {
  it("converts lowercase to uppercase", () => {
    expect(normalizeInviteCode("abc123")).toBe("ABC123");
  });

  it("trims whitespace", () => {
    expect(normalizeInviteCode("  ABC  ")).toBe("ABC");
  });

  it("handles mixed case input", () => {
    expect(normalizeInviteCode("aBcDeF")).toBe("ABCDEF");
  });
});
