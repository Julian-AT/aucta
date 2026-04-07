---
phase: 02-ai-pipeline-and-tool-system
plan: 02
subsystem: ai
tags: [zod, gemini, tools, hvac, error-codes, findings, vertical-slices]

requires:
  - phase: 02-ai-pipeline-and-tool-system
    provides: "buildTool() factory (ToolDef, ToolResult, GeminiFunctionDeclaration), @aucta/shared generateId, ErrorWithCode"
provides:
  - "lookupErrorCode tool for HVAC error code lookup across Daikin, Mitsubishi Electric, Fujitsu"
  - "logFinding tool for recording session observations, safety concerns, recommendations"
  - "ErrorCodeRepository interface for swappable error code data sources"
  - "InMemoryFindingStore for session-scoped finding storage"
  - "60 real HVAC error codes across 3 manufacturers"
affects: [02-03, 03-session-orchestration, 04-session-lifecycle]

tech-stack:
  added: []
  patterns: ["ErrorCodeRepository interface with JSON-backed implementation", "FindingStore interface with InMemoryFindingStore", "createXxxTool factory pattern for dependency injection into tools", "Discriminated union output (found/not-found) for lookup tools"]

key-files:
  created:
    - packages/ai/src/data/error-codes/daikin.json
    - packages/ai/src/data/error-codes/mitsubishi-electric.json
    - packages/ai/src/data/error-codes/fujitsu.json
    - packages/ai/src/data/error-codes/index.ts
    - packages/ai/src/data/error-codes/error-code-repository.test.ts
    - packages/ai/src/tools/lookupErrorCode/types.ts
    - packages/ai/src/tools/lookupErrorCode/index.ts
    - packages/ai/src/tools/lookupErrorCode/lookupErrorCode.test.ts
    - packages/ai/src/tools/logFinding/types.ts
    - packages/ai/src/tools/logFinding/index.ts
    - packages/ai/src/tools/logFinding/logFinding.test.ts
  modified:
    - packages/ai/tsconfig.json

key-decisions:
  - "createXxxTool() factory pattern for dependency injection into buildTool-based tools"
  - "Discriminated union output (found: true/false) instead of throwing on not-found (D-10)"
  - "JSON import with 'with { type: json }' assertion for static error code data"

patterns-established:
  - "createXxxTool(deps) factory: wraps buildTool() call, accepts injectable dependencies via closure"
  - "Discriminated union for lookup tools: { found: true, ...data } | { found: false, message }"
  - "ErrorCodeRepository interface: lookup(manufacturer, code) + listManufacturers()"
  - "FindingStore interface: add(sessionId, finding) + getBySession(sessionId)"

requirements-completed: [TOOL-04, TOOL-06]

duration: 6min
completed: 2026-04-04
---

# Phase 2 Plan 2: lookupErrorCode and logFinding Tools Summary

**lookupErrorCode tool with 60 HVAC error codes across Daikin/Mitsubishi Electric/Fujitsu and logFinding tool with 5-category InMemoryFindingStore**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-04T12:38:07Z
- **Completed:** 2026-04-04T12:44:18Z
- **Tasks:** 2
- **Files created:** 11
- **Files modified:** 1

## Accomplishments
- Created lookupErrorCode tool with 60 real HVAC error codes (20 Daikin, 20 Mitsubishi Electric, 20 Fujitsu) behind ErrorCodeRepository abstraction
- Created logFinding tool with InMemoryFindingStore supporting 5 categories, 4 severities, and optional equipment context
- Both tools built via buildTool() factory, confirming the Plan 01 tool system contract works with real implementations
- 30 tests covering repository lookup, tool call/validate/prompt, finding store operations, and input validation

## Task Commits

Each task was committed atomically with TDD (RED then GREEN):

1. **Task 1: Error code data + ErrorCodeRepository + lookupErrorCode tool**
   - `166e072` (test) - RED: failing tests for ErrorCodeRepository and lookupErrorCode
   - `6644721` (feat) - GREEN: implement ErrorCodeRepository, JSON data, and lookupErrorCode tool
2. **Task 2: logFinding tool with InMemoryFindingStore**
   - `acfdebb` (test) - RED: failing tests for logFinding and InMemoryFindingStore
   - `0433fa1` (feat) - GREEN: implement logFinding tool, types, and InMemoryFindingStore

## Files Created/Modified
- `packages/ai/src/data/error-codes/daikin.json` - 20 real Daikin HVAC error codes with severity, repair steps, causes
- `packages/ai/src/data/error-codes/mitsubishi-electric.json` - 20 real Mitsubishi Electric error codes including City Multi/VRF codes
- `packages/ai/src/data/error-codes/fujitsu.json` - 20 real Fujitsu error codes including EE:EE communication error
- `packages/ai/src/data/error-codes/index.ts` - ErrorCodeRepository interface + JsonErrorCodeRepository with case-insensitive lookup
- `packages/ai/src/data/error-codes/error-code-repository.test.ts` - 7 tests for repository lookup behavior
- `packages/ai/src/tools/lookupErrorCode/types.ts` - Zod schemas for input/output with discriminated union
- `packages/ai/src/tools/lookupErrorCode/index.ts` - lookupErrorCode tool via buildTool() + createLookupErrorCodeTool factory
- `packages/ai/src/tools/lookupErrorCode/lookupErrorCode.test.ts` - 9 tests for tool interface and behavior
- `packages/ai/src/tools/logFinding/types.ts` - Zod schemas for 5 categories, 4 severities, Finding interface
- `packages/ai/src/tools/logFinding/index.ts` - logFinding tool, FindingStore interface, InMemoryFindingStore
- `packages/ai/src/tools/logFinding/logFinding.test.ts` - 14 tests for tool and store behavior
- `packages/ai/tsconfig.json` - Added JSON files to include pattern for type-checking

## Decisions Made
- Used `createXxxTool(deps)` factory pattern that wraps buildTool() and accepts dependencies via closure, enabling constructor injection for tool testing (D-03)
- lookupErrorCode returns a discriminated union `{ found: true, ...data } | { found: false, message }` instead of throwing on unknown codes (D-10) -- Gemini can use the message to inform the technician and offer alternative help
- JSON import uses `with { type: "json" }` import assertion for static error code data files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added JSON files to tsconfig.json include pattern**
- **Found during:** Task 1 (typecheck verification)
- **Issue:** TypeScript could not find JSON files imported by index.ts since they were not in the project file list
- **Fix:** Changed tsconfig.json `include` from `["src"]` to `["src", "src/**/*.json"]`
- **Files modified:** packages/ai/tsconfig.json
- **Verification:** `bun run --filter @aucta/ai typecheck` exits 0
- **Committed in:** 6644721 (Task 1 GREEN commit)

**2. [Rule 3 - Blocking] Fixed @aucta/shared import path**
- **Found during:** Task 2 (logFinding test run)
- **Issue:** Import `@aucta/shared/utils/id.js` failed because the package exports map uses `./utils/*` -> `./src/utils/*.ts` (no .js extension)
- **Fix:** Changed import to `@aucta/shared/utils/id` (without .js extension)
- **Files modified:** packages/ai/src/tools/logFinding/index.ts
- **Verification:** Tests pass, module resolves correctly
- **Committed in:** 0433fa1 (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for compilation and module resolution. No scope creep.

## Issues Encountered

**Pre-existing typecheck issue:** `bun run --filter @aucta/ai typecheck` reports `TS2304: Cannot find name 'crypto'` in `packages/shared/src/utils/id.ts`. This is a pre-existing issue from Phase 01 -- the `global.d.ts` declaring crypto is scoped to the shared package's compilation but not visible when the ai package typechecks shared sources via composite project references. Confirmed broken before this plan's changes. Does not affect runtime (Bun and Node.js provide crypto global).

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all data is real HVAC error codes, all tools are fully functional.

## Next Phase Readiness
- lookupErrorCode and logFinding tools ready for Plan 03 tool registry (assembleToolPool) and dispatcher
- Both tools confirm buildTool() factory contract from Plan 01 works with real implementations
- ErrorCodeRepository interface ready for future database-backed implementation (deferred to Phase 4+)
- InMemoryFindingStore ready for session orchestration in Phase 3

## Self-Check: PASSED

All 11 created files verified present. All 4 task commits (166e072, 6644721, acfdebb, 0433fa1) verified in git log.

---
*Phase: 02-ai-pipeline-and-tool-system*
*Completed: 2026-04-04*
