import { sql } from "drizzle-orm";
import { runHealthCheck } from "@aucta/ai/knowledge";
import type { HealthCheckDeps } from "@aucta/ai/knowledge";
import { KnowledgeArticleRepository } from "@aucta/db/repositories/knowledge-article.repository";
import { db } from "@aucta/db/client";
import { inngest } from "./inngest-client.js";

export const knowledgeHealth = inngest.createFunction(
  {
    id: "knowledge-health",
    retries: 2,
    triggers: [{ cron: "0 3 * * *" }],
  },
  async ({ step }) => {
    const orgIds = await step.run("get-active-orgs", async () => {
      const result = await db.execute(
        sql`SELECT DISTINCT org_id FROM knowledge_articles`,
      );
      return (result.rows ?? []).map((row: Record<string, unknown>) =>
        String(row.org_id),
      );
    });

    if (orgIds.length === 0) return { status: "no-orgs" };

    const results: Array<{
      orgId: string;
      gaps: number;
      stale: number;
      conflicts: number;
    }> = [];

    for (const orgId of orgIds) {
      const result = await step.run(`health-check-${orgId}`, async () => {
        const articleRepo = new KnowledgeArticleRepository(db);
        const deps: HealthCheckDeps = {
          findStaleArticles: (oId, staleDays) =>
            articleRepo.findStaleArticles(oId, staleDays),
          findCoverageGaps: (oId) => articleRepo.findCoverageGaps(oId),
          findConflictingArticles: (oId) =>
            articleRepo.findConflictingArticles(oId),
        };
        return runHealthCheck(deps, orgId);
      });

      results.push({
        orgId,
        gaps: result.coverageGaps.length,
        stale: result.staleArticles.length,
        conflicts: result.conflictingArticles.length,
      });
    }

    if (results.some((r) => r.gaps > 0 || r.stale > 0 || r.conflicts > 0)) {
      await step.run("emit-results", async () => {
        await inngest.send({
          name: "knowledge/health-check-complete",
          data: { results, checkedAt: new Date().toISOString() },
        });
      });
    }

    return { status: "completed", orgCount: orgIds.length, results };
  },
);
