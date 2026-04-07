---
phase: 07-integration-hardening-tech-debt
plan: 01
subsystem: ai, api
tags: [gemini, ephemeral-tokens, tool-system, dead-code-removal, security]

# Dependency graph
requires:
  - phase: 02-ai-pipeline-tool-system
    provides: buildTool factory, tool registry, ephemeral token endpoint
  - phase: 06-wire-knowledge-pipeline
    provides: logFinding mobile persistence via addFinding tRPC
provides:
  - Stateless logFindingTool without InMemoryFindingStore dependency
  - Token-level tool declaration enforcement via liveConnectConstraints
affects: [07-02, mobile-session]

# Tech tracking
tech-stack:
  added: []
  patterns: [stateless-tool-pattern, token-level-tool-enforcement]

key-files:
  created: []
  modified:
    - packages/ai/src/tools/logFinding/index.ts
    - packages/ai/src/tools/logFinding/logFinding.test.ts
    - packages/api/src/routers/session.router.ts
    - packages/api/src/routers/session.router.test.ts

key-decisions:
  - "logFindingTool uses inline generateId('fnd') instead of FindingStore.add() -- store was dead code since Phase 6 wired mobile persistence"
  - "Gemini Live API tools format: tools: [{ functionDeclarations: [...] }] not functionDeclarations: [...] directly"

patterns-established:
  - "Stateless tool pattern: tools generate IDs inline, real persistence happens at the caller (mobile tRPC)"
  - "Token-level tool enforcement: tool declarations locked in ephemeral token constraints, not just passed in response"

requirements-completed: [TOOL-07]

# Metrics
duration: 9min
completed: 2026-04-07
---

# Phase 7 Plan 1: Tool System Hardening Summary

**Removed dead InMemoryFindingStore code and enforced tool declarations at ephemeral token level via liveConnectConstraints**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-07T12:49:17Z
- **Completed:** 2026-04-07T12:58:02Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Eliminated 47 lines of dead FindingStore/InMemoryFindingStore/createLogFindingTool code from logFinding tool
- Added security-in-depth: tool declarations now locked in Gemini ephemeral token constraints
- All 32 tests pass (10 logFinding + 22 session router including 1 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove InMemoryFindingStore and simplify logFindingTool** - `b42a584` (refactor)
2. **Task 2: Add tool declarations to ephemeral token liveConnectConstraints** - `43e9a2f` (feat)

## Files Created/Modified
- `packages/ai/src/tools/logFinding/index.ts` - Simplified to stateless buildTool() result with inline generateId
- `packages/ai/src/tools/logFinding/logFinding.test.ts` - Removed InMemoryFindingStore test suite, updated call tests
- `packages/api/src/routers/session.router.ts` - Added tools array to liveConnectConstraints.config
- `packages/api/src/routers/session.router.test.ts` - Added test verifying tool declarations in constraints

## Decisions Made
- logFindingTool uses inline generateId("fnd") rather than store dependency -- the InMemoryFindingStore was dead code since Phase 6 wired real persistence via mobile addFinding tRPC mutation
- Tool declarations use `tools: [{ functionDeclarations: pool.functionDeclarations }]` format per Gemini Live API spec (array of tool objects, not flat)
- Kept `toolDeclarations` in createToken response for backwards compatibility with mobile client

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - no stubs or placeholder data found.

## Next Phase Readiness
- Tool system hardened and ready for Plan 2 (settings screen real data)
- Pre-solved verifications confirmed: incrementFindingsCount (SC4) and addFindingMutation.mutate (SC5) already wired

---
## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 07-integration-hardening-tech-debt*
*Completed: 2026-04-07*
