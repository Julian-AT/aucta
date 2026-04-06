import { describe, it, expect } from "vitest";
import { createLookupErrorCodeTool, lookupErrorCodeTool } from "./index.js";
import { JsonErrorCodeRepository } from "../../data/error-codes/index.js";
import type { ToolContext } from "../../types.js";

const testContext: ToolContext = {
  orgId: "org_test123",
  userId: "usr_test456",
  sessionId: "ses_test789",
};

describe("lookupErrorCode tool", () => {
  it("has name 'lookupErrorCode'", () => {
    expect(lookupErrorCodeTool.name).toBe("lookupErrorCode");
  });

  it("is read-only", () => {
    expect(lookupErrorCodeTool.isReadOnly()).toBe(true);
  });

  it("returns found result for Daikin U4", async () => {
    const result = await lookupErrorCodeTool.call(
      { manufacturer: "Daikin", errorCode: "U4" },
      testContext,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(true);
      if (result.data.found) {
        expect(result.data.manufacturer).toBe("Daikin");
        expect(result.data.code).toBe("U4");
        expect(result.data.meaning.toLowerCase()).toContain("communication");
        expect(result.data.severity).toBe("high");
        expect(result.data.repairSteps.length).toBeGreaterThan(0);
        expect(result.data.possibleCauses.length).toBeGreaterThan(0);
        expect(result.data.equipmentTypes.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns not-found result for unknown code (D-10)", async () => {
    const result = await lookupErrorCodeTool.call(
      { manufacturer: "Daikin", errorCode: "ZZZZ" },
      testContext,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(false);
      if (!result.data.found) {
        expect(result.data.message).toBeTruthy();
      }
    }
  });

  it("returns not-found for unknown manufacturer (D-10)", async () => {
    const result = await lookupErrorCodeTool.call(
      { manufacturer: "UnknownBrand", errorCode: "X1" },
      testContext,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(false);
    }
  });

  it("validates correct input", () => {
    const parsed = lookupErrorCodeTool.validateInput({
      manufacturer: "Daikin",
      errorCode: "U4",
    });
    expect(parsed.manufacturer).toBe("Daikin");
    expect(parsed.errorCode).toBe("U4");
  });

  it("rejects invalid input with missing fields", () => {
    expect(() => lookupErrorCodeTool.validateInput({})).toThrow();
  });

  it("generates valid GeminiFunctionDeclaration", () => {
    const decl = lookupErrorCodeTool.prompt();
    expect(decl.name).toBe("lookupErrorCode");
    expect(decl.description).toBeTruthy();
    expect(decl.parameters).toBeDefined();
  });

  it("accepts injected repository via createLookupErrorCodeTool", async () => {
    const repo = new JsonErrorCodeRepository();
    const tool = createLookupErrorCodeTool(repo);
    const result = await tool.call(
      { manufacturer: "Fujitsu", errorCode: "EE:EE" },
      testContext,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(true);
    }
  });
});
