import { describe, expect, it } from "vitest";
import { generateId } from "./id.js";

describe("generateId", () => {
  it("returns a string starting with the given prefix followed by underscore", () => {
    const id = generateId("org");
    expect(id).toMatch(/^org_/);
  });

  it("works with different prefixes", () => {
    const invId = generateId("inv");
    expect(invId).toMatch(/^inv_/);

    const sessionId = generateId("ses");
    expect(sessionId).toMatch(/^ses_/);
  });

  it("generates default length of prefix + underscore + 21 characters", () => {
    const id = generateId("org");
    expect(id).toHaveLength("org_".length + 21);
  });

  it("respects custom length parameter", () => {
    const id = generateId("x", 10);
    expect(id).toHaveLength("x_".length + 10);
  });

  it("produces unique IDs on consecutive calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateId("test"));
    }
    expect(ids.size).toBe(10);
  });
});
