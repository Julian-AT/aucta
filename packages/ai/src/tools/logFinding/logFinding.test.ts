import { describe, it, expect, beforeEach } from "vitest";
import {
  createLogFindingTool,
  logFindingTool,
  InMemoryFindingStore,
} from "./index.js";
import type { ToolContext } from "../../types.js";

const testContext: ToolContext = {
  orgId: "org_test123",
  userId: "usr_test456",
  sessionId: "ses_test789",
};

describe("logFinding tool", () => {
  it("has name 'logFinding'", () => {
    expect(logFindingTool.name).toBe("logFinding");
  });

  it("is not read-only", () => {
    expect(logFindingTool.isReadOnly()).toBe(false);
  });

  it("records a safety finding with critical severity", async () => {
    const store = new InMemoryFindingStore();
    const tool = createLogFindingTool(store);

    const result = await tool.call(
      {
        category: "safety",
        description: "Gas leak detected",
        severity: "critical",
      },
      testContext,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.findingId).toMatch(/^fnd_/);
      expect(result.data.recorded).toBe(true);
      expect(result.data.message).toContain("safety");
      expect(result.data.message).toContain("critical");
    }
  });

  it("records finding with optional equipment fields (D-09)", async () => {
    const store = new InMemoryFindingStore();
    const tool = createLogFindingTool(store);

    const result = await tool.call(
      {
        category: "observation",
        description: "Worn belt noticed on outdoor unit",
        severity: "low",
        equipmentModel: "FTXM25",
        manufacturer: "Daikin",
      },
      testContext,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recorded).toBe(true);
    }

    const findings = store.getBySession(testContext.sessionId);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.equipmentModel).toBe("FTXM25");
    expect(findings[0]!.manufacturer).toBe("Daikin");
  });

  it("validates all 5 categories (D-07)", () => {
    const categories = [
      "safety",
      "maintenance",
      "regulatory",
      "observation",
      "recommendation",
    ];
    for (const category of categories) {
      const parsed = logFindingTool.validateInput({
        category,
        description: "Test",
        severity: "low",
      });
      expect(parsed.category).toBe(category);
    }
  });

  it("validates all 4 severities (D-08)", () => {
    const severities = ["low", "medium", "high", "critical"];
    for (const severity of severities) {
      const parsed = logFindingTool.validateInput({
        category: "observation",
        description: "Test",
        severity,
      });
      expect(parsed.severity).toBe(severity);
    }
  });

  it("rejects missing required fields", () => {
    expect(() => logFindingTool.validateInput({})).toThrow();
    expect(() =>
      logFindingTool.validateInput({ category: "safety" }),
    ).toThrow();
    expect(() =>
      logFindingTool.validateInput({
        category: "safety",
        description: "Test",
      }),
    ).toThrow();
  });

  it("rejects invalid category value", () => {
    expect(() =>
      logFindingTool.validateInput({
        category: "invalid",
        description: "Test",
        severity: "low",
      }),
    ).toThrow();
  });

  it("rejects invalid severity value", () => {
    expect(() =>
      logFindingTool.validateInput({
        category: "safety",
        description: "Test",
        severity: "extreme",
      }),
    ).toThrow();
  });

  it("generates valid GeminiFunctionDeclaration", () => {
    const decl = logFindingTool.prompt();
    expect(decl.name).toBe("logFinding");
    expect(decl.description).toBeTruthy();
    expect(decl.parameters).toBeDefined();
  });
});

describe("InMemoryFindingStore", () => {
  let store: InMemoryFindingStore;

  beforeEach(() => {
    store = new InMemoryFindingStore();
  });

  it("stores a finding and returns fnd_ prefixed ID", () => {
    const id = store.add("ses_123", {
      category: "safety",
      description: "Gas leak",
      severity: "critical",
      timestamp: new Date(),
    });
    expect(id).toMatch(/^fnd_/);
  });

  it("retrieves all findings for a session", () => {
    store.add("ses_123", {
      category: "safety",
      description: "Gas leak",
      severity: "critical",
      timestamp: new Date(),
    });
    store.add("ses_123", {
      category: "observation",
      description: "Worn belt",
      severity: "low",
      timestamp: new Date(),
    });

    const findings = store.getBySession("ses_123");
    expect(findings).toHaveLength(2);
  });

  it("returns empty array for unknown session", () => {
    const findings = store.getBySession("ses_unknown");
    expect(findings).toHaveLength(0);
  });

  it("isolates findings by session ID", () => {
    store.add("ses_A", {
      category: "safety",
      description: "Finding A",
      severity: "high",
      timestamp: new Date(),
    });
    store.add("ses_B", {
      category: "maintenance",
      description: "Finding B",
      severity: "low",
      timestamp: new Date(),
    });

    expect(store.getBySession("ses_A")).toHaveLength(1);
    expect(store.getBySession("ses_B")).toHaveLength(1);
    expect(store.getBySession("ses_A")[0]!.description).toBe("Finding A");
  });
});
