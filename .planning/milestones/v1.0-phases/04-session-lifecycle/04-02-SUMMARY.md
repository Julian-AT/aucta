---
phase: 04-session-lifecycle
plan: 02
subsystem: api
tags: [trpc, inngest, gemini, bun-server, session-lifecycle, background-jobs]

requires:
  - phase: 04-session-lifecycle
    plan: 01
    provides: SessionRepository, SessionFindingRepository, SessionToolCallRepository, Zod DTOs
provides:
  - tRPC session router with 8 lifecycle endpoints (create, end, feedback, findings, tool calls, queries)
  - Inngest client with id "aucta"
  - session-summarize Inngest function with 3-step pipeline (fetch/generate/save)
  - Gemini 2.5 Pro summary generation with structured markdown output
  - Bun server /api/inngest handler route
  - "session/ended" event flow from tRPC to Inngest
affects: [04-03, mobile-session-hooks, dashboard-session-views]

tech-stack:
  added: [inngest@4.1.2]
  patterns: [inngest-v4-triggers-api, session-summary-pipeline, bun-server-inngest-route]

key-files:
  created:
    - packages/api/src/jobs/inngest-client.ts
    - packages/api/src/jobs/session-summarize.ts
    - packages/api/src/jobs/session-summarize.test.ts
    - packages/api/src/jobs/index.ts
    - apps/server/src/index.ts
    - apps/server/package.json
    - apps/server/tsconfig.json
  modified:
    - packages/api/src/routers/session.router.ts
    - packages/api/src/routers/session.router.test.ts
    - packages/api/package.json

key-decisions:
  - "Inngest v4 uses triggers array in config object, not separate second argument"
  - "generateSessionSummary accepts plain interface (not DTO types) to handle Inngest JSON serialization of dates"
  - "Summary model configurable via GEMINI_SUMMARY_MODEL env var, defaults to gemini-2.5-pro"
  - "apps/server created in this plan with Bun server handling auth, trpc, and inngest routes"

patterns-established:
  - "Inngest v4 createFunction: { id, retries, triggers: [{ event: name }] } as single config object"
  - "Exported generateSessionSummary for unit testing separate from Inngest step orchestration"
  - "Repository instantiation inside step.run() for independent step retry isolation"

requirements-completed: [SESS-11, SESS-12, INFRA-08, COMP-07]

duration: 13min
completed: 2026-04-04
---

# Phase 04 Plan 02: Session Lifecycle Server Integration Summary

**tRPC session lifecycle endpoints (create/end/feedback/incremental persistence) with Inngest background summary pipeline via Gemini 2.5 Pro and Bun server handler at /api/inngest**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-04T21:17:02Z
- **Completed:** 2026-04-04T21:30:43Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Extended session router with 8 new procedures: createSession, endSession, addFinding, addToolCall, submitFeedback, getSession, getRecentSessions, getSessionSummary
- Built Inngest session-summarize function with 3 independent steps (fetch-session, generate-summary, save-summary) using Gemini 2.5 Pro for structured markdown summaries
- Registered Inngest handler at /api/inngest on the Bun server alongside existing auth and tRPC routes
- Session end mutation sends "session/ended" event to Inngest for async summary generation
- 27 passing tests across router (21) and summary generation (6)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend tRPC session router with lifecycle endpoints** - `992329d` (feat)
2. **Task 2: Inngest client, summary job, and Bun server handler** - `9b16cf5` (feat)

## Files Created/Modified
- `packages/api/src/routers/session.router.ts` - Extended with 8 new lifecycle procedures (create, end, feedback, findings, tool calls, queries)
- `packages/api/src/routers/session.router.test.ts` - 21 tests covering all procedures including mock repos and Inngest
- `packages/api/src/jobs/inngest-client.ts` - Inngest client instance with id "aucta"
- `packages/api/src/jobs/session-summarize.ts` - Inngest function with 3-step pipeline + generateSessionSummary helper
- `packages/api/src/jobs/session-summarize.test.ts` - 6 tests for summary generation including prompt structure verification
- `packages/api/src/jobs/index.ts` - Barrel export for inngest client and summary function
- `packages/api/package.json` - Added inngest dependency and jobs export path
- `apps/server/src/index.ts` - Bun server with /api/auth, /api/trpc, and /api/inngest routes
- `apps/server/package.json` - Server package with inngest and trpc dependencies
- `apps/server/tsconfig.json` - TypeScript config for server app

## Decisions Made
- **Inngest v4 API:** Uses triggers array in config object (`{ id, triggers: [{ event }] }`) instead of the v3 separate-argument pattern. Discovered during implementation when v3 syntax threw at runtime.
- **generateSessionSummary interface:** Uses plain interface (not DTO types with Date) to handle Inngest step.run() JSON serialization which converts Date to string. Keeps the function testable standalone.
- **Summary model configurable:** `GEMINI_SUMMARY_MODEL` env var defaults to `gemini-2.5-pro` per D-09 (best available model for quality summaries).
- **apps/server committed:** Created the full Bun server in this plan since it was untracked in the main working tree. Includes auth, tRPC, and Inngest route handlers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inngest v4 API signature changed**
- **Found during:** Task 2 (session-summarize implementation)
- **Issue:** Plan specified v3-style `inngest.createFunction(config, { event }, handler)` but Inngest v4 requires `createFunction({ id, triggers: [{ event }] }, handler)`
- **Fix:** Changed to v4 triggers-in-config pattern
- **Files modified:** packages/api/src/jobs/session-summarize.ts
- **Verification:** Tests pass, typecheck clean

**2. [Rule 3 - Blocking] Inngest step.run() serializes dates to strings**
- **Found during:** Task 2 (typecheck)
- **Issue:** TypeScript error because Inngest's `Jsonify` type converts Date to string in step output
- **Fix:** Created plain `SessionSummaryInput` interface with only the fields needed for summary generation (no Date fields)
- **Files modified:** packages/api/src/jobs/session-summarize.ts
- **Verification:** Typecheck passes, tests still green

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for Inngest v4 compatibility. No scope creep.

## Issues Encountered
- Pre-existing typecheck error in `@aucta/db` package (`auth.js` module not found) -- unrelated to this plan, file exists as untracked in main repo. No new type errors introduced.

## Known Stubs

None -- all endpoints, jobs, and server routes are fully implemented with no placeholder data.

## User Setup Required

None -- no external service configuration required. Inngest will attempt to connect to its cloud service when the server starts, but local development works without it via the Inngest dev server (`npx inngest-cli@latest dev`).

## Next Phase Readiness
- All 8 tRPC session endpoints ready for mobile client integration (Plan 03)
- Inngest summary pipeline ready for end-to-end testing when Gemini API key is configured
- Session store extensions in Plan 03 will call createSession, endSession, addFinding, addToolCall, submitFeedback mutations

## Self-Check: PASSED

- All 10 files verified present on disk
- Both task commits (992329d, 9b16cf5) verified in git history

---
*Phase: 04-session-lifecycle*
*Completed: 2026-04-04*
