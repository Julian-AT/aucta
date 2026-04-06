import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

vi.mock("@aucta/db/client", () => ({
  db: {
    execute: vi.fn(),
  },
}));

vi.mock("@aucta/db/repositories/knowledge-article.repository", () => {
  return {
    KnowledgeArticleRepository: class {
      findStaleArticles = vi.fn().mockResolvedValue([]);
      findCoverageGaps = vi.fn().mockResolvedValue([]);
      findConflictingArticles = vi.fn().mockResolvedValue([]);
    },
  };
});

vi.mock("@aucta/ai/knowledge", () => ({
  runHealthCheck: vi.fn(),
}));

vi.mock("./inngest-client.js", () => ({
  inngest: {
    createFunction: vi.fn((_config: unknown, handler: unknown) => {
      // Store handler for testing
      (globalThis as Record<string, unknown>).__knowledgeHealthHandler =
        handler;
      return { id: "knowledge-health" };
    }),
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

import { inngest } from "./inngest-client.js";
import { runHealthCheck } from "@aucta/ai/knowledge";
import { db } from "@aucta/db/client";

const mockRunHealthCheck = vi.mocked(runHealthCheck);
const mockDbExecute = vi.mocked(db.execute);
const mockInngestSend = vi.mocked(inngest.send);

function createMockStep() {
  const results = new Map<string, unknown>();
  return {
    run: vi.fn(async (name: string, fn: () => Promise<unknown>) => {
      const result = await fn();
      results.set(name, result);
      return result;
    }),
    results,
  };
}

describe("knowledgeHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is configured as a cron job triggering daily at 3 AM", async () => {
    // Import triggers the createFunction call
    await import("./knowledge-health.js");

    expect(inngest.createFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "knowledge-health",
        triggers: [{ cron: "0 3 * * *" }],
      }),
      expect.any(Function),
    );
  });

  it("returns no-orgs when no knowledge articles exist", async () => {
    await import("./knowledge-health.js");
    const handler = (globalThis as Record<string, unknown>)
      .__knowledgeHealthHandler as (ctx: {
      step: ReturnType<typeof createMockStep>;
    }) => Promise<unknown>;

    mockDbExecute.mockResolvedValue({ rows: [] } as never);

    const step = createMockStep();
    const result = await handler({ step });

    expect(result).toEqual({ status: "no-orgs" });
  });

  it("runs health check per org and aggregates results", async () => {
    await import("./knowledge-health.js");
    const handler = (globalThis as Record<string, unknown>)
      .__knowledgeHealthHandler as (ctx: {
      step: ReturnType<typeof createMockStep>;
    }) => Promise<unknown>;

    mockDbExecute.mockResolvedValue({
      rows: [{ org_id: "org-1" }, { org_id: "org-2" }],
    } as never);

    mockRunHealthCheck.mockResolvedValue({
      coverageGaps: [],
      staleArticles: [],
      conflictingArticles: [],
      checkedAt: new Date(),
    });

    const step = createMockStep();
    const result = (await handler({ step })) as {
      status: string;
      orgCount: number;
      results: Array<{
        orgId: string;
        gaps: number;
        stale: number;
        conflicts: number;
      }>;
    };

    expect(result.status).toBe("completed");
    expect(result.orgCount).toBe(2);
    expect(result.results).toHaveLength(2);
  });

  it("emits knowledge/health-check-complete event when issues found", async () => {
    await import("./knowledge-health.js");
    const handler = (globalThis as Record<string, unknown>)
      .__knowledgeHealthHandler as (ctx: {
      step: ReturnType<typeof createMockStep>;
    }) => Promise<unknown>;

    mockDbExecute.mockResolvedValue({
      rows: [{ org_id: "org-1" }],
    } as never);

    mockRunHealthCheck.mockResolvedValue({
      coverageGaps: [
        { equipmentBrand: "Daikin", equipmentModel: "FTXM25", sessionCount: 3 },
      ],
      staleArticles: [],
      conflictingArticles: [],
      checkedAt: new Date(),
    });

    const step = createMockStep();
    await handler({ step });

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "knowledge/health-check-complete",
      }),
    );
  });

  it("does not emit event when no issues found across all orgs", async () => {
    await import("./knowledge-health.js");
    const handler = (globalThis as Record<string, unknown>)
      .__knowledgeHealthHandler as (ctx: {
      step: ReturnType<typeof createMockStep>;
    }) => Promise<unknown>;

    mockDbExecute.mockResolvedValue({
      rows: [{ org_id: "org-1" }],
    } as never);

    mockRunHealthCheck.mockResolvedValue({
      coverageGaps: [],
      staleArticles: [],
      conflictingArticles: [],
      checkedAt: new Date(),
    });

    const step = createMockStep();
    await handler({ step });

    expect(mockInngestSend).not.toHaveBeenCalled();
  });
});
