---
phase: 03-live-streaming-session
plan: 01
subsystem: mobile, api
tags: [zustand, websocket, gemini-live, vitest, nativewind, react-native-audio-api, tRPC]

requires:
  - phase: 02-ai-pipeline-and-tool-system
    provides: "Tool dispatcher, tool registry, assembleToolPool, lookupErrorCode, logFinding tools"
  - phase: 01-foundation-and-auth
    provides: "tRPC orgProcedure middleware, errorConverter, Expo mobile app scaffold"
provides:
  - "Gemini Live WebSocket protocol types (all message contracts)"
  - "Zustand session store with 10-state lifecycle machine"
  - "Mobile vitest test infrastructure"
  - "Tailwind overlay color tokens for session UI"
  - "Server dispatchToolCalls tRPC mutation for tool relay"
  - "Mock utilities for WebSocket and AudioContext testing"
  - "app.json with microphone/camera permissions and iOS background audio"
affects: [03-02-PLAN, 03-03-PLAN, 03-04-PLAN, 03-05-PLAN]

tech-stack:
  added: [react-native-audio-api@0.11.7, expo-keep-awake@55.0.6, "@notifee/react-native@9.1.8", "@react-native-community/netinfo@12.0.1"]
  patterns: [zustand-state-machine, gemini-ws-protocol-types, mobile-vitest-config]

key-files:
  created:
    - apps/mobile/lib/gemini/protocol.ts
    - apps/mobile/stores/session-store.ts
    - apps/mobile/stores/session-store.test.ts
    - apps/mobile/vitest.config.ts
    - apps/mobile/lib/gemini/__mocks__/websocket.ts
    - apps/mobile/lib/gemini/__mocks__/audio.ts
  modified:
    - apps/mobile/package.json
    - apps/mobile/app.json
    - apps/mobile/tailwind.config.js
    - apps/mobile/constants/colors.ts
    - vitest.config.ts
    - packages/api/src/routers/session.router.ts
    - packages/api/src/routers/session.router.test.ts

key-decisions:
  - "z.record(z.string(), z.any()) for tool args instead of z.record(z.unknown()) due to Zod 4 _zod parsing issue"
  - "Flat Zustand state shape with individual setters per CLAUDE.md simplicity rule"
  - "ctx.orgId and ctx.userId from withOrgScope middleware, not ctx.session.* for dispatchToolCalls"

patterns-established:
  - "Zustand session store: flat state, getState()/setState() for external access from WebSocket callbacks"
  - "Gemini protocol types: canonical type file at apps/mobile/lib/gemini/protocol.ts with type guards"
  - "Mobile test mocks: __mocks__/ directory co-located with module under test"
  - "Mobile vitest config: defineProject with stores/hooks/lib includes"

requirements-completed: [SESS-06, SESS-07, UX-02, UX-05, UX-07]

duration: 8min
completed: 2026-04-04
---

# Phase 3 Plan 1: Foundation Summary

**Gemini WebSocket protocol types, Zustand session state machine, overlay design tokens, mobile test infra, and server-side tool dispatch endpoint**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-04T14:43:59Z
- **Completed:** 2026-04-04T14:52:16Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments

- Complete Gemini Live WebSocket protocol type system (setup, audio, video, tool call, resumption, goAway messages with type guards)
- Zustand session store with 10-state lifecycle machine (idle through timeout) accessible outside React for WebSocket/audio callbacks
- Server dispatchToolCalls tRPC mutation relaying Gemini tool calls to existing @aucta/ai dispatcher
- Mobile vitest infrastructure with 47 passing tests (38 store + 9 router)
- Overlay color tokens and native permissions for camera/mic/background audio

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependencies, config, test infrastructure, and protocol types** - `0ee5962` (feat)
2. **Task 2: Zustand session store with state machine** - `edb1ba8` (test:RED), `9ba875c` (feat:GREEN)
3. **Task 3: Server-side dispatchToolCalls tRPC endpoint** - `4905aa3` (test:RED), `d623f2c` (feat:GREEN)

## Files Created/Modified

- `apps/mobile/lib/gemini/protocol.ts` - All Gemini Live WebSocket message types, constants, and type guards
- `apps/mobile/stores/session-store.ts` - Zustand store with 10 session statuses, 3 connection quality levels, all actions
- `apps/mobile/stores/session-store.test.ts` - 38 tests covering all state transitions and external access
- `apps/mobile/vitest.config.ts` - Vitest project config for mobile (stores/hooks/lib)
- `apps/mobile/lib/gemini/__mocks__/websocket.ts` - MockWebSocket with simulate helpers for testing
- `apps/mobile/lib/gemini/__mocks__/audio.ts` - MockAudioContext/Buffer/SourceNode for audio testing
- `apps/mobile/package.json` - Added react-native-audio-api, expo-keep-awake, @notifee/react-native, netinfo, vitest
- `apps/mobile/app.json` - Microphone permission, iOS background audio, Android RECORD_AUDIO/FOREGROUND_SERVICE
- `apps/mobile/tailwind.config.js` - Overlay color tokens (overlay-bg, status-connected/reconnecting/lost, ai-indicator-bg)
- `apps/mobile/constants/colors.ts` - overlayColors constant object
- `vitest.config.ts` - Root workspace includes apps/mobile
- `packages/api/src/routers/session.router.ts` - dispatchToolCalls mutation with Zod input validation
- `packages/api/src/routers/session.router.test.ts` - 3 new tests for dispatchToolCalls endpoint

## Decisions Made

- **z.record(z.string(), z.any()) for tool args:** Zod 4's z.record(z.unknown()) causes `_zod` parsing error in tRPC input validation. Using z.any() avoids the issue while maintaining the same runtime behavior since tool args are passed to the dispatcher which validates with tool-specific schemas.
- **Flat Zustand state shape:** Individual setters (setStatus, setConnectionQuality, etc.) instead of a single update function. Follows CLAUDE.md simplicity rules and Zustand flat state recommendation.
- **ctx.orgId/ctx.userId from middleware:** Uses the flattened context properties provided by withOrgScope middleware rather than reaching into ctx.session. Cleaner and respects the middleware abstraction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod 4 z.record(z.unknown()) parsing failure**
- **Found during:** Task 3 (dispatchToolCalls implementation)
- **Issue:** `z.record(z.unknown())` causes `Cannot read properties of undefined (reading '_zod')` in Zod 4.3.6 when used as tRPC input validator
- **Fix:** Changed to `z.record(z.string(), z.any())` which parses correctly
- **Files modified:** packages/api/src/routers/session.router.ts
- **Verification:** All 9 router tests pass
- **Committed in:** d623f2c

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal -- Zod schema still validates the same shape. No scope creep.

## Issues Encountered

- Pre-existing typecheck failures in apps/mobile (missing `@/lib/api-url` module, missing `packages/db/src/schema/auth.ts`) -- not caused by this plan's changes, out of scope.

## Known Stubs

None -- all code is wired to real implementations. No placeholder data or TODO markers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Protocol types ready for Plans 02 (WebSocket connection), 03 (audio pipeline), 04 (video pipeline)
- Session store ready for Plans 02-04 to read/write lifecycle state from WebSocket and audio callbacks
- Overlay colors ready for Plan 05 (session UI)
- dispatchToolCalls endpoint ready for Plan 02 (WebSocket tool relay)
- Mock utilities ready for all subsequent test files

---
*Phase: 03-live-streaming-session*
*Completed: 2026-04-04*

## Self-Check: PASSED

All 6 created files verified on disk. All 5 commit hashes verified in git log.
