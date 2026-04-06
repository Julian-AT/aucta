import type { HealthCheckResult } from "../core/types.js";

const DEFAULT_STALE_DAYS = 90;

export interface HealthCheckDeps {
  findStaleArticles: (
    orgId: string,
    staleDays: number,
  ) => Promise<
    Array<{ id: string; title: string; updatedAt: Date | string }>
  >;
  findCoverageGaps: (
    orgId: string,
  ) => Promise<HealthCheckResult["coverageGaps"]>;
  findConflictingArticles: (
    orgId: string,
  ) => Promise<HealthCheckResult["conflictingArticles"]>;
}

/**
 * Run health checks for an org's knowledge base.
 * Detects: coverage gaps, stale articles, conflicting articles.
 */
export async function runHealthCheck(
  deps: HealthCheckDeps,
  orgId: string,
  staleDays: number = DEFAULT_STALE_DAYS,
): Promise<HealthCheckResult> {
  const [coverageGaps, staleArticles, conflictingArticles] = await Promise.all([
    deps.findCoverageGaps(orgId),
    detectStaleArticles(deps, orgId, staleDays),
    deps.findConflictingArticles(orgId),
  ]);

  return {
    coverageGaps,
    staleArticles,
    conflictingArticles,
    checkedAt: new Date(),
  };
}

/**
 * Find articles not updated in staleDays+ days, mapping to HealthCheckResult format.
 */
async function detectStaleArticles(
  deps: HealthCheckDeps,
  orgId: string,
  staleDays: number,
): Promise<HealthCheckResult["staleArticles"]> {
  const stale = await deps.findStaleArticles(orgId, staleDays);

  return stale.map((article) => ({
    articleId: article.id,
    title: article.title,
    daysSinceUpdate: Math.floor(
      (Date.now() - new Date(article.updatedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  }));
}
