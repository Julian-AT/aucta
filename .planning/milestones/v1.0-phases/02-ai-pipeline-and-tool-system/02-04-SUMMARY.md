---
phase: 02-ai-pipeline-and-tool-system
plan: 04
subsystem: ai, api
tags: [typescript, typecheck, variance, generics, ambient-types, bun]

# Dependency graph
requires:
  - phase: 02-ai-pipeline-and-tool-system (plans 01-03)
    provides: tool system (base, registry, dispatcher), ephemeral token endpoint
provides:
  - Zero typecheck errors in @aucta/ai and @aucta/api packages
  - AnyToolDef type alias for heterogeneous tool collections
  - Global ambient type declarations (setTimeout, crypto) for Bun runtime
  - Modality enum usage for Gemini SDK type safety
affects: [all future Phase 02+ plans that import from @aucta/ai or @aucta/api]

# Tech tracking
tech-stack:
  added: []
  patterns: [AnyToolDef (ToolDef<any, any>) for heterogeneous collections with Zod runtime safety, global.d.ts for Bun runtime ambient types]

key-files:
  created:
    - packages/ai/src/global.d.ts
  modified:
    - packages/ai/src/tools/base.ts
    - packages/ai/src/tools/registry.ts
    - packages/ai/src/index.ts
    - packages/api/src/routers/session.router.ts
    - packages/api/src/routers/session.router.test.ts

key-decisions:
  - "AnyToolDef uses ToolDef<any, any> with eslint-disable comment; runtime safety enforced by Zod validateInput()"
  - "Global ambient declarations (setTimeout, crypto) in global.d.ts rather than file-scoped declare statements"

patterns-established:
  - "AnyToolDef type alias: use ToolDef<any, any> for maps, arrays, function params accepting mixed tool types"
  - "global.d.ts for Bun-provided globals not in lib: ES2024 (setTimeout, crypto)"

requirements-completed: [TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-06, TOOL-07, TOOL-08, COMP-03, COMP-04, COMP-05]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 02 Plan 04: TypeCheck Gap Closure Summary

**AnyToolDef variance fix, Bun ambient types, and Modality enum -- zero typecheck errors in @aucta/ai and @aucta/api**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T13:15:24Z
- **Completed:** 2026-04-04T13:19:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All TypeScript typecheck errors in @aucta/ai resolved (variance errors, setTimeout missing type)
- All TypeScript typecheck errors in @aucta/api resolved (unused param, Modality enum, ToolDef variance)
- All 74 existing tests continue to pass (68 ai + 6 api)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix ToolDef variance and setTimeout type in packages/ai** - `eb055c8` (fix)
2. **Task 2: Fix Modality enum and unused parameter in packages/api** - `2730859` (fix)

## Files Created/Modified
- `packages/ai/src/global.d.ts` - Ambient declarations for setTimeout and crypto (Bun globals not in ES2024 lib)
- `packages/ai/src/tools/base.ts` - Added AnyToolDef type alias (ToolDef<any, any>) for heterogeneous collections
- `packages/ai/src/tools/registry.ts` - Updated ToolPool and assembleToolPool to use AnyToolDef
- `packages/ai/src/index.ts` - Re-exported AnyToolDef
- `packages/api/src/routers/session.router.ts` - Imported Modality enum, used Modality.AUDIO, renamed ctx to _ctx
- `packages/api/src/routers/session.router.test.ts` - Added Modality to @google/genai mock

## Decisions Made
- Used `ToolDef<any, any>` (AnyToolDef) instead of alternatives like existential types or conditional types. The `any` is safe because runtime validation via Zod `validateInput()` catches type mismatches. The eslint-disable comment documents this trade-off.
- Created `packages/ai/src/global.d.ts` for ambient type declarations rather than per-file `declare` statements. This ensures all files in the package (including tests) see the declarations.
- Redeclared `crypto` in ai package's global.d.ts because @aucta/shared's global.d.ts is not visible when tsc resolves shared files during ai package compilation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] setTimeout declaration scope: global.d.ts instead of file-scoped declare**
- **Found during:** Task 1 (setTimeout type fix)
- **Issue:** Plan specified adding `declare function setTimeout` at top of dispatcher.ts. However, file-scoped `declare` only applies to that file -- the test file (dispatcher.test.ts) also uses setTimeout and would remain broken.
- **Fix:** Created `packages/ai/src/global.d.ts` with ambient declarations instead of a file-scoped declare. Also added crypto declaration since @aucta/shared's global.d.ts is not visible during ai package compilation.
- **Files modified:** packages/ai/src/global.d.ts (created), packages/ai/src/tools/dispatcher.ts (no declare added)
- **Verification:** Both dispatcher.ts and dispatcher.test.ts compile clean. All 68 ai tests pass.
- **Committed in:** eb055c8 (Task 1 commit)

**2. [Rule 3 - Blocking] Test mock missing Modality export**
- **Found during:** Task 2 (Modality enum import)
- **Issue:** After importing Modality enum in session.router.ts, the test file's `vi.mock("@google/genai")` returned only `GoogleGenAI` but not `Modality`. The mock lacked the new export, causing 4 test failures.
- **Fix:** Added `Modality` object to the mock return value with all enum values.
- **Files modified:** packages/api/src/routers/session.router.test.ts
- **Verification:** All 6 session router tests pass.
- **Committed in:** 2730859 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes directly caused by task changes and necessary for correctness. No scope creep.

## Issues Encountered
None - all issues were covered by the deviation auto-fixes above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - this plan only fixes type errors, no new functionality or data wiring.

## Next Phase Readiness
- Both @aucta/ai and @aucta/api pass tsc --noEmit with zero errors
- CI typecheck gate should now pass for Phase 02 code
- Ready for Phase 03 (streaming session orchestration) which depends on the tool system being type-safe

---
*Phase: 02-ai-pipeline-and-tool-system*
*Completed: 2026-04-04*
