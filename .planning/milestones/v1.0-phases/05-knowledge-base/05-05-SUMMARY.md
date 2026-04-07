---
phase: 05-knowledge-base
plan: 05
subsystem: api
tags: [inngest, cron, trpc, qdrant, health-monitoring, knowledge-management]

# Dependency graph
requires:
  - phase: 05-03
    provides: Hybrid search engine, Qdrant client, GeminiEmbeddingService
  - phase: 05-04
    provides: Knowledge article repository, linker, compilation pipeline
provides:
  - Health check service detecting coverage gaps, stale articles, and conflicting articles
  - Inngest cron job for daily knowledge base health monitoring
  - tRPC knowledge router for manual article CRUD with auto-embed and auto-link
affects: [dashboard, knowledge-base]

# Tech tracking
tech-stack:
  added: []
  patterns: [HealthCheckDeps abstract interface for testable health checks, repository-based SQL for coverage gaps and conflicts]

key-files:
  created:
    - packages/api/src/jobs/knowledge-health.ts
    - packages/api/src/jobs/knowledge-health.test.ts
    - packages/api/src/routers/knowledge.router.ts
    - packages/api/src/routers/knowledge.router.test.ts
  modified:
    - packages/ai/src/knowledge/health/health-check.ts
    - packages/ai/src/knowledge/health/health-check.test.ts
    - packages/ai/src/knowledge/index.ts
    - packages/api/src/jobs/index.ts
    - packages/api/src/root.ts
    - packages/db/src/repositories/knowledge-article.repository.ts

key-decisions:
  - "HealthCheckDeps uses abstract function interface (not articleRepo+db) for testability without Drizzle in packages/ai"
  - "Coverage gap and conflict detection SQL queries placed in KnowledgeArticleRepository (repository pattern compliance)"
  - "knowledgeRouter registered at root.ts as knowledge: knowledgeRouter"

patterns-established:
  - "Health check deps adapter: build HealthCheckDeps from repository methods in the wiring layer (Inngest job/router)"
  - "Cron job pattern: Inngest cron with per-org step functions for independent retries"

requirements-completed: [KB-08, KB-10]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 05 Plan 05: Health Monitoring and Knowledge Router Summary

**Knowledge base health monitoring (coverage gaps, stale articles, conflicts) via Inngest cron, plus tRPC CRUD router for manual article management with auto-embed and auto-link**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T07:06:07Z
- **Completed:** 2026-04-06T07:14:28Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Health check service detects coverage gaps (equipment with sessions but no articles), stale articles (90+ days), and conflicting articles (same equipment + procedure)
- Inngest cron job runs daily at 3 AM UTC, iterates over all orgs with knowledge articles, runs health checks with independent retries per org, emits event when issues found
- tRPC knowledge router with 5 org-scoped endpoints (create, update, list, getById, healthCheck) for manual article management
- Manual articles correctly labeled: sourceType "manual", confidenceLevel "technician_reviewed", isAiGenerated false
- Auto-embed to Qdrant and auto-link via generateLinks on create/update

## Task Commits

Each task was committed atomically:

1. **Task 1: Health check service** - `c379e07` (feat) - prior run
2. **Task 2: Health monitoring Inngest cron job** - `7d5b9be` (feat)
3. **Task 3: Knowledge management tRPC router** - `e46a6a2` (feat)

## Files Created/Modified
- `packages/ai/src/knowledge/health/health-check.ts` - Health check service with abstract HealthCheckDeps interface
- `packages/ai/src/knowledge/health/health-check.test.ts` - 6 tests for health check service
- `packages/ai/src/knowledge/index.ts` - Re-exports runHealthCheck and HealthCheckDeps
- `packages/api/src/jobs/knowledge-health.ts` - Inngest cron job for daily health monitoring
- `packages/api/src/jobs/knowledge-health.test.ts` - 5 tests for cron job
- `packages/api/src/jobs/index.ts` - Added knowledgeHealth export
- `packages/api/src/routers/knowledge.router.ts` - tRPC router with 5 CRUD endpoints
- `packages/api/src/routers/knowledge.router.test.ts` - 9 tests for router
- `packages/api/src/root.ts` - Registered knowledge router in appRouter
- `packages/db/src/repositories/knowledge-article.repository.ts` - Added findCoverageGaps and findConflictingArticles methods

## Decisions Made
- **HealthCheckDeps abstract interface:** The health check service uses an abstract function interface (findStaleArticles, findCoverageGaps, findConflictingArticles) instead of directly depending on articleRepo + db. This keeps packages/ai free of Drizzle dependencies and makes testing trivial with function mocks.
- **Repository-based SQL queries:** Coverage gap detection (cross-join session_findings + ai_sessions + knowledge_articles) and conflict detection (GROUP BY with HAVING) were added as methods on KnowledgeArticleRepository to comply with the repository pattern. The Inngest job and tRPC router build the HealthCheckDeps adapter from these repository methods.
- **Module-level repository instances:** The knowledge router instantiates articleRepo and linkRepo at module level (like session.router.ts pattern) for shared use across endpoints.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Moved SQL queries from Inngest job to KnowledgeArticleRepository**
- **Found during:** Task 2 (Health monitoring Inngest cron job)
- **Issue:** Plan placed raw SQL (coverage gaps, conflicts) directly in the Inngest job using drizzle-orm's sql template tag. This violated the repository pattern (CLAUDE.md: "All database access goes through Repository classes") and drizzle-orm is not a direct dependency of packages/api.
- **Fix:** Added findCoverageGaps() and findConflictingArticles() methods to KnowledgeArticleRepository. The Inngest job and tRPC router build a HealthCheckDeps adapter from these repository methods.
- **Files modified:** packages/db/src/repositories/knowledge-article.repository.ts, packages/api/src/jobs/knowledge-health.ts
- **Verification:** All tests pass, no drizzle-orm import in packages/api
- **Committed in:** 7d5b9be (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical - repository pattern compliance)
**Impact on plan:** Essential for architectural correctness. Better separation of concerns.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 05 (knowledge-base) is now complete with all 5 plans executed
- Full knowledge base backend: ingestion, compilation, retrieval, verification types, and health monitoring
- tRPC knowledge router ready for dashboard integration
- Ready for phase transition to next milestone

---
*Phase: 05-knowledge-base*
*Completed: 2026-04-06*

## Self-Check: PASSED

All 10 files verified present. All 3 commits verified in git log. 20 tests passing across 3 test files.
