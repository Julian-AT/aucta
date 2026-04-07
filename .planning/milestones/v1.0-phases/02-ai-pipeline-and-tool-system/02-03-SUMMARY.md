---
phase: 02-ai-pipeline-and-tool-system
plan: 03
subsystem: ai
tags: [gemini, tools, registry, dispatcher, ephemeral-tokens, tRPC, zod, timeout]

requires:
  - phase: 02-ai-pipeline-and-tool-system
    provides: "buildTool() factory, lookupErrorCode tool, logFinding tool, buildEffectiveSystemPrompt(), prompt layers"
  - phase: 01-foundation-and-auth
    provides: "tRPC middleware chain (orgProcedure, rateLimiter, errorConverter), @aucta/shared ErrorWithCode"
provides:
  - "assembleToolPool() for registering tools and exporting Gemini function declarations"
  - "dispatchToolCalls() for routing Gemini function call events to correct tools with validation and timeout"
  - "session.createToken tRPC mutation for ephemeral Gemini token issuance with locked constraints"
affects: [03-session-orchestration, 04-session-lifecycle, mobile-session-ui]

tech-stack:
  added: ["@google/genai ^1.48.0 (in packages/api)"]
  patterns: ["assembleToolPool() for tool collection and Gemini declaration export", "dispatchToolCalls() with Promise.race timeout and ZodError handling", "Ephemeral token endpoint with liveConnectConstraints locking model/prompt/modality"]

key-files:
  created:
    - packages/ai/src/tools/registry.ts
    - packages/ai/src/tools/registry.test.ts
    - packages/ai/src/tools/dispatcher.ts
    - packages/ai/src/tools/dispatcher.test.ts
    - packages/api/src/routers/session.router.ts
    - packages/api/src/routers/session.router.test.ts
  modified:
    - packages/ai/src/index.ts
    - packages/api/src/root.ts
    - packages/api/package.json
    - .env.example

key-decisions:
  - "Ephemeral token creation uses GoogleGenAI httpOptions { apiVersion: 'v1alpha' } at constructor level (not per-request)"
  - "Tool declarations returned separately in token response so mobile client can include them in WebSocket setup message"
  - "dispatchToolCalls handles ZodError from validateInput as VALIDATION_ERROR, TimeoutError as TIMEOUT, and tool.call errors as TOOL_ERROR"

patterns-established:
  - "assembleToolPool(tools): collects ToolDef array into ToolPool with Map, functionDeclarations, and getTool()"
  - "dispatchToolCalls(event, pool, context, timeout): parallel dispatch via Promise.all with Promise.race timeout"
  - "session.createToken: orgProcedure -> rateLimiter -> errorConverter -> build prompt + tools + token"

requirements-completed: [TOOL-02, TOOL-03, TOOL-07]

duration: 5min
completed: 2026-04-04
---

# Phase 2 Plan 3: Tool Registry, Dispatcher, and Ephemeral Token Endpoint Summary

**assembleToolPool/dispatchToolCalls pipeline with 10s timeout and Zod validation, plus session.createToken tRPC endpoint issuing ephemeral Gemini tokens with locked system prompt and tool declarations**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T12:47:44Z
- **Completed:** 2026-04-04T12:52:21Z
- **Tasks:** 2
- **Files created:** 6
- **Files modified:** 4

## Accomplishments
- Built assembleToolPool() that collects ToolDef instances into a ToolPool with Map-based lookup, Gemini function declaration export, and duplicate name rejection
- Built dispatchToolCalls() that routes Gemini function call events to correct tools with Zod input validation (D-12), 10-second timeout via Promise.race (D-11), and structured error responses for all failure cases
- Created session.createToken tRPC mutation that authenticates via orgProcedure, rate-limits at 5/60s, builds layered system prompt, assembles tool pool, and issues ephemeral Gemini tokens with liveConnectConstraints locking model, prompt, and audio modality
- 19 new tests (13 registry/dispatcher + 6 session router) covering tool routing, validation errors, timeout, duplicate names, token creation config, and prompt assembly

## Task Commits

Each task was committed atomically:

1. **Task 1: Tool registry (assembleToolPool) and dispatcher (dispatchToolCalls)** - `b94db52` (feat)
2. **Task 2: Ephemeral token endpoint (session.router.ts)** - `4c6ea88` (feat)

## Files Created/Modified
- `packages/ai/src/tools/registry.ts` - assembleToolPool function and ToolPool interface
- `packages/ai/src/tools/registry.test.ts` - 6 tests for registry assembly, lookup, duplicates
- `packages/ai/src/tools/dispatcher.ts` - dispatchToolCalls function with TimeoutError, validation, parallel execution
- `packages/ai/src/tools/dispatcher.test.ts` - 7 tests for routing, timeout, validation, error handling
- `packages/ai/src/index.ts` - Added exports for registry, dispatcher, lookupErrorCodeTool, logFindingTool
- `packages/api/src/routers/session.router.ts` - session.createToken mutation with orgProcedure, rate limiting, ephemeral token
- `packages/api/src/routers/session.router.test.ts` - 6 tests for token creation, config, prompt, error handling
- `packages/api/src/root.ts` - Added session router to appRouter
- `packages/api/package.json` - Added @google/genai and @aucta/ai dependencies
- `.env.example` - Added GEMINI_API_KEY and GEMINI_LIVE_MODEL

## Decisions Made
- Used GoogleGenAI constructor-level httpOptions `{ apiVersion: "v1alpha" }` rather than per-request, since ephemeral tokens always require v1alpha
- Tool declarations are returned separately in the token response (alongside token and model name) so the mobile client can include them in the WebSocket setup message during Phase 3
- dispatchToolCalls catches ZodError specifically (from validateInput which calls schema.parse) to distinguish validation failures from tool execution errors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required at this time. The GEMINI_API_KEY environment variable will be needed when testing with a real Gemini API key, documented in .env.example.

## Known Stubs

None - all code is fully functional. The session.createToken endpoint requires a valid GEMINI_API_KEY at runtime but is fully wired and tested with mocks.

## Next Phase Readiness
- Tool dispatch pipeline ready for Phase 3 session orchestration: WebSocket handler can call dispatchToolCalls with incoming Gemini function call events
- Ephemeral token endpoint ready for mobile client: the client can call session.createToken, receive token + model + toolDeclarations, then open a WebSocket to Gemini Live API
- ToolPool.functionDeclarations array is ready to be passed in the WebSocket setup message
- assembleToolPool and dispatchToolCalls exported from @aucta/ai for use in session orchestration

## Self-Check: PASSED

All 6 created files verified present. Both task commits (b94db52, 4c6ea88) verified in git log.

---
*Phase: 02-ai-pipeline-and-tool-system*
*Completed: 2026-04-04*
