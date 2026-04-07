---
phase: 03-live-streaming-session
plan: 05
subsystem: mobile, session
tags: [react-native, expo-camera, zustand, expo-keep-awake, gemini-live, session-orchestration, navigation]

requires:
  - phase: 03-live-streaming-session
    plan: 01
    provides: "Zustand session store, Gemini protocol types, tRPC session router"
  - phase: 03-live-streaming-session
    plan: 02
    provides: "GeminiConnection WebSocket manager, reconnection with exponential backoff"
  - phase: 03-live-streaming-session
    plan: 03
    provides: "AudioPlayback, AudioCapture, FrameCapture, ToolRelay pipeline utilities"
  - phase: 03-live-streaming-session
    plan: 04
    provides: "AIDisclosureModal, SessionHUD, EndSessionDialog, ConnectionLostOverlay UI components"
provides:
  - "useGeminiSession: orchestration hook wiring connection, audio, video, tools, reconnection, cleanup"
  - "usePermissions: camera + microphone permission check/request hook"
  - "useBackgroundAudio: Android foreground service for background audio via notifee"
  - "SessionScreen: full-screen camera + HUD overlay session orchestrator component"
  - "Session route registered in Expo Router stack with gesture disabled"
  - "Home screen Start Session navigates to /session route (two-tap flow)"
affects: [04-01-PLAN, 04-02-PLAN]

tech-stack:
  added: [expo-keep-awake]
  patterns: [lazy-require-native-modules, camera-ref-forwarding, zustand-getstate-outside-react]

key-files:
  created:
    - apps/mobile/hooks/useGeminiSession.ts
    - apps/mobile/hooks/useGeminiSession.test.ts
    - apps/mobile/hooks/usePermissions.ts
    - apps/mobile/hooks/useBackgroundAudio.ts
    - apps/mobile/components/session/SessionScreen.tsx
    - apps/mobile/app/(app)/session.tsx
  modified:
    - apps/mobile/app/(app)/_layout.tsx
    - apps/mobile/app/(app)/(tabs)/index.tsx
    - apps/mobile/lib/gemini/audio-playback.ts
    - apps/mobile/lib/gemini/audio-capture.ts

key-decisions:
  - "Lazy require() for react-native-audio-api to avoid Expo Go module evaluation crash"
  - "CameraView ref forwarded from SessionScreen to useGeminiSession for frame capture"
  - "Zustand getState() used outside React render cycle for WebSocket callbacks"

patterns-established:
  - "Lazy native module loading: require() instead of top-level import for modules that crash in Expo Go"
  - "Camera ref forwarding: SessionScreen owns CameraView ref, passes to useGeminiSession for frame capture"
  - "Zustand external access: getState()/setState() in WebSocket onMessage callbacks that fire outside React"
  - "Session lifecycle state machine: idle -> requesting-permissions -> disclosure -> connecting -> active -> reconnecting/completed/failed/timeout"

requirements-completed: [SESS-01, SESS-09, UX-03, UX-05, COMP-06]

duration: ~15min
completed: 2026-04-04
---

# Phase 3 Plan 5: Session Integration and Orchestration Summary

**End-to-end session flow wiring useGeminiSession orchestration hook, full-screen camera SessionScreen, and two-tap navigation from Home to live AI session with lazy-loaded native audio modules**

## Performance

- **Duration:** ~15 min (across multiple sessions with device verification checkpoint)
- **Started:** 2026-04-04T17:00:00Z
- **Completed:** 2026-04-04T18:30:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- useGeminiSession orchestration hook wiring the full session lifecycle: token acquisition via tRPC, GeminiConnection WebSocket, AudioCapture/AudioPlayback, FrameCapture at 1 FPS, ToolRelay for mid-conversation tool calls, reconnection with backoff, and cleanup
- SessionScreen component rendering full-screen CameraView with HUD overlay, managing the state machine from permission request through AI disclosure to active session and end
- Two-tap session start flow working: Home "Start Session" button -> AI disclosure "I Understand" -> live camera + AI
- Session end flow: stop button -> "End this session?" confirmation dialog -> navigate Home
- Screen stays awake during active session via expo-keep-awake
- Lazy require() pattern for react-native-audio-api preventing Expo Go crashes at module evaluation
- Device-verified UI flow confirmed working on simulator/device

## Task Commits

Each task was committed atomically:

1. **Task 1: Orchestration hooks (useGeminiSession, usePermissions, useBackgroundAudio)** - `b58d32e` (feat)
2. **Task 2: Session route, SessionScreen, Home screen navigation** - `a887a3e` (feat)
3. **Task 3: Fix Expo Go crash from react-native-audio-api** - `c20a67f` (fix)

## Files Created/Modified

- `apps/mobile/hooks/useGeminiSession.ts` - Main session orchestration hook: token -> connect -> stream -> tools -> reconnect -> cleanup
- `apps/mobile/hooks/useGeminiSession.test.ts` - Tests for session lifecycle coordination with mocked dependencies
- `apps/mobile/hooks/usePermissions.ts` - Camera + microphone permission check/request via expo-camera hooks
- `apps/mobile/hooks/useBackgroundAudio.ts` - Android foreground service notification via @notifee/react-native for background audio
- `apps/mobile/components/session/SessionScreen.tsx` - Full-screen camera + HUD overlay orchestrator with session state machine
- `apps/mobile/app/(app)/session.tsx` - Expo Router session route rendering SessionScreen
- `apps/mobile/app/(app)/_layout.tsx` - Stack route registration for session screen with gestureEnabled: false
- `apps/mobile/app/(app)/(tabs)/index.tsx` - Home screen "Start Session" navigates to /session route (replaced Coming Soon alert)
- `apps/mobile/lib/gemini/audio-playback.ts` - Lazy require() for react-native-audio-api AudioContext
- `apps/mobile/lib/gemini/audio-capture.ts` - Lazy require() for react-native-audio-api AudioContext

## Decisions Made

- **Lazy require() for native modules:** react-native-audio-api crashes during module evaluation in Expo Go because its native module bridge is not available. Switched to lazy require() inside class methods so the import only happens at runtime when actually starting a session (which requires a dev build anyway). This keeps the rest of the app functional in Expo Go for non-session development.
- **CameraView ref pattern:** SessionScreen creates the CameraView ref and passes it to useGeminiSession. The hook creates FrameCapture with the ref for 1 FPS JPEG capture. This keeps camera ownership in the component while letting the hook orchestrate capture timing.
- **Zustand getState() for WebSocket callbacks:** WebSocket onMessage handlers fire outside the React render cycle. Using `useSessionStore.getState()` and `.setState()` directly avoids stale closure issues that would occur with hook-based selectors in callbacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lazy-load react-native-audio-api to prevent Expo Go crash**
- **Found during:** Task 3 (device verification checkpoint)
- **Issue:** Top-level `import { AudioContext } from 'react-native-audio-api'` in audio-playback.ts and audio-capture.ts caused a module evaluation crash in Expo Go because the native module is not linked in Expo Go builds
- **Fix:** Replaced top-level imports with lazy `require('react-native-audio-api')` inside class methods that are only called during active sessions (which require dev builds)
- **Files modified:** apps/mobile/lib/gemini/audio-playback.ts, apps/mobile/lib/gemini/audio-capture.ts
- **Verification:** App launches successfully in Expo Go; audio modules load correctly in dev builds
- **Committed in:** `c20a67f`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for developer experience -- allows non-session development in Expo Go. No scope creep.

## Issues Encountered

- Pre-existing typecheck failures in test files from prior plans (reconnection.test.ts, tool-relay.test.ts) -- not caused by this plan's changes. Out of scope per deviation rules.

## Known Stubs

None -- all hooks and components are fully wired with real integration points. The session flow connects all Plan 01-04 artifacts into a working end-to-end experience.

## User Setup Required

None - no external service configuration required. (GEMINI_API_KEY and server deployment are prerequisites from Phase 2.)

## Next Phase Readiness

- Phase 3 is complete: all 5 plans executed, delivering a working end-to-end live AI session
- Ready for Phase 4 (Session Lifecycle): post-session feedback, data persistence, automated summaries
- SessionScreen's endSession flow provides the natural integration point for Phase 4's feedback prompt
- Session store's status transitions provide hooks for persisting session metadata on completion

---
*Phase: 03-live-streaming-session*
*Completed: 2026-04-04*

## Self-Check: PASSED

All 10 key files verified on disk. All 3 commit hashes (b58d32e, a887a3e, c20a67f) verified in git log.
