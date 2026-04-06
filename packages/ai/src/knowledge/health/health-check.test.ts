import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HealthCheckDeps } from "./health-check.js";
import { runHealthCheck } from "./health-check.js";

const mockFindStaleArticles = vi.fn();
const mockFindCoverageGaps = vi.fn();
const mockFindConflictingArticles = vi.fn();

const deps: HealthCheckDeps = {
  findStaleArticles: mockFindStaleArticles,
  findCoverageGaps: mockFindCoverageGaps,
  findConflictingArticles: mockFindConflictingArticles,
};

describe("runHealthCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindCoverageGaps.mockResolvedValue([]);
    mockFindStaleArticles.mockResolvedValue([]);
    mockFindConflictingArticles.mockResolvedValue([]);
  });

  it("returns HealthCheckResult with all three check categories", async () => {
    const result = await runHealthCheck(deps, "org-1");

    expect(result).toHaveProperty("coverageGaps");
    expect(result).toHaveProperty("staleArticles");
    expect(result).toHaveProperty("conflictingArticles");
    expect(result).toHaveProperty("checkedAt");
    expect(result.checkedAt).toBeInstanceOf(Date);
  });

  it("detects stale articles from repo", async () => {
    const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    mockFindStaleArticles.mockResolvedValue([
      { id: "art-1", title: "Stale Article", updatedAt: oldDate },
    ]);

    const result = await runHealthCheck(deps, "org-1", 90);

    expect(result.staleArticles).toHaveLength(1);
    expect(result.staleArticles[0]!.articleId).toBe("art-1");
    expect(result.staleArticles[0]!.daysSinceUpdate).toBeGreaterThanOrEqual(99);
  });

  it("detects coverage gaps via deps", async () => {
    mockFindCoverageGaps.mockResolvedValue([
      {
        equipmentBrand: "Daikin",
        equipmentModel: "FTXM25",
        sessionCount: 5,
      },
    ]);

    const result = await runHealthCheck(deps, "org-1");

    expect(result.coverageGaps).toHaveLength(1);
    expect(result.coverageGaps[0]!.equipmentBrand).toBe("Daikin");
    expect(result.coverageGaps[0]!.equipmentModel).toBe("FTXM25");
    expect(result.coverageGaps[0]!.sessionCount).toBe(5);
  });

  it("detects conflicting articles via deps", async () => {
    mockFindConflictingArticles.mockResolvedValue([
      {
        procedureKey: "Daikin/FTXM25/error_diagnosis",
        articleIds: ["a1", "a2"],
      },
    ]);

    const result = await runHealthCheck(deps, "org-1");

    expect(result.conflictingArticles).toHaveLength(1);
    expect(result.conflictingArticles[0]!.procedureKey).toBe(
      "Daikin/FTXM25/error_diagnosis",
    );
    expect(result.conflictingArticles[0]!.articleIds).toEqual(["a1", "a2"]);
  });

  it("uses default staleDays of 90 when not specified", async () => {
    await runHealthCheck(deps, "org-1");

    expect(mockFindStaleArticles).toHaveBeenCalledWith("org-1", 90);
  });

  it("runs all three checks in parallel", async () => {
    await runHealthCheck(deps, "org-1");

    expect(mockFindCoverageGaps).toHaveBeenCalledTimes(1);
    expect(mockFindStaleArticles).toHaveBeenCalledTimes(1);
    expect(mockFindConflictingArticles).toHaveBeenCalledTimes(1);
  });
});
