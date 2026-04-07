---
phase: 03-live-streaming-session
plan: 06
subsystem: audio
tags: [react-native-audio-api, pcm, audio-capture, audio-playback, lazy-import, expo-go]

requires:
  - phase: 03-live-streaming-session
    provides: "AudioCapture stub and AudioPlayback class from plans 03-01/03-02"
provides:
  - "Working AudioCapture with real microphone PCM streaming via AudioRecorder.onAudioReady"
  - "Crash-safe lazy loading of react-native-audio-api in both audio modules"
  - "float32ToPcm16Base64 utility for PCM format conversion"
affects: [03-live-streaming-session, session-integration]

tech-stack:
  added: []
  patterns:
    - "Dynamic import() for native modules that crash in Expo Go"
    - "Constructor injection of AudioContext factory for testable audio playback"

key-files:
  created: []
  modified:
    - "apps/mobile/lib/gemini/audio-capture.ts"
    - "apps/mobile/lib/gemini/audio-capture.test.ts"
    - "apps/mobile/lib/gemini/audio-playback.ts"
    - "apps/mobile/lib/gemini/audio-playback.test.ts"
    - "apps/mobile/hooks/useGeminiSession.test.ts"

key-decisions:
  - "Dynamic import() instead of require() for AudioCapture -- vitest ESM mode does not intercept require() calls from source modules"
  - "Constructor injection (AudioContextFactory) for AudioPlayback instead of vi.mock -- cleaner testability, follows project DI conventions"

patterns-established:
  - "Dynamic import() pattern: native modules loaded via await import() inside async methods to prevent Expo Go crash"
  - "Factory injection pattern: AudioPlayback accepts optional AudioContextFactory parameter, defaulting to lazy require()"

requirements-completed: [SESS-03]

duration: 7min
completed: 2026-04-04
---

# Phase 03 Plan 06: Audio Capture & Playback Gap Closure Summary

**AudioCapture rewritten from stub to real AudioRecorder pipeline with float32-to-PCM16 conversion, plus crash-safe lazy loading in both audio modules**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-04T19:23:53Z
- **Completed:** 2026-04-04T19:31:48Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- AudioCapture.start() now creates an AudioRecorder, registers onAudioReady with 16kHz/mono/4096 config, converts Float32 PCM to Int16 base64 via float32ToPcm16Base64, and calls deps.onChunk() with real microphone data
- Neither audio-capture.ts nor audio-playback.ts have top-level react-native-audio-api imports -- Expo Go no longer crashes when these modules are evaluated
- 30 tests pass across audio-capture (14), audio-playback (8), and useGeminiSession (8) suites

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement AudioCapture microphone pipeline with lazy import** - `de2e6a0` (feat)
2. **Task 2: Fix AudioPlayback lazy require for react-native-audio-api** - `8e6eaab` (fix)

## Files Created/Modified
- `apps/mobile/lib/gemini/audio-capture.ts` - Replaced AudioContext stub with AudioRecorder pipeline, added float32ToPcm16Base64 utility
- `apps/mobile/lib/gemini/audio-capture.test.ts` - Complete rewrite: 14 tests covering AudioRecorder lifecycle, onChunk callback chain, PCM conversion, error handling
- `apps/mobile/lib/gemini/audio-playback.ts` - Removed top-level import, added createNativeAudioContext with lazy require(), accepted optional factory parameter
- `apps/mobile/lib/gemini/audio-playback.test.ts` - Switched from vi.mock to factory injection with MockAudioContext, added lazy-load verification test
- `apps/mobile/hooks/useGeminiSession.test.ts` - Updated AudioPlayback construction to use mock factory injection

## Decisions Made
- **Dynamic import() for AudioCapture**: vitest 4.x in ESM mode does not intercept `require()` calls from source modules. Used `await import("react-native-audio-api")` inside the async `start()` method instead. Achieves the same lazy-loading goal while being mock-compatible.
- **Constructor injection for AudioPlayback**: Rather than fighting vitest's `require()` interception, AudioPlayback now accepts an optional `AudioContextFactory` parameter. Production code passes nothing (defaults to `createNativeAudioContext` which uses `require()`), tests pass a mock factory. This follows the project's constructor injection convention from CLAUDE.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Changed require() to dynamic import() in AudioCapture**
- **Found during:** Task 1 (AudioCapture implementation)
- **Issue:** vitest ESM mode does not intercept `require()` calls from source modules -- all tests using the mock failed with "Cannot find module" errors
- **Fix:** Used `await import("react-native-audio-api")` instead of `require()` in the async `start()` method. Used class-based mock instead of `vi.fn().mockImplementation()` since arrow functions are not constructable.
- **Files modified:** audio-capture.ts, audio-capture.test.ts
- **Verification:** All 14 tests pass
- **Committed in:** de2e6a0

**2. [Rule 3 - Blocking] Added factory injection to AudioPlayback for testability**
- **Found during:** Task 2 (AudioPlayback lazy require)
- **Issue:** Same vitest ESM/require() incompatibility. `require()` inside `createNativeAudioContext` bypassed `vi.mock` in audio-playback.test.ts and useGeminiSession.test.ts
- **Fix:** Added optional `AudioContextFactory` constructor parameter. Tests pass mock factory directly instead of relying on vi.mock. Updated useGeminiSession.test.ts to use the same pattern.
- **Files modified:** audio-playback.ts, audio-playback.test.ts, useGeminiSession.test.ts
- **Verification:** All 30 tests pass across 3 suites
- **Committed in:** 8e6eaab

---

**Total deviations:** 2 auto-fixed (2 blocking -- Rule 3)
**Impact on plan:** Both deviations were necessary to make tests pass. The core lazy-loading goal (no top-level react-native-audio-api imports) is fully achieved. The API changes are backward-compatible.

## Issues Encountered
- Worktree was behind branch head -- fast-forward merge resolved this
- `bun install` needed in worktree for node_modules

## Known Stubs
None -- all stubs from the original AudioCapture implementation have been replaced with working code.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AudioCapture now produces real PCM data from the microphone
- AudioPlayback lazy-loads safely in Expo Go
- SESS-03 gap (microphone streams PCM) is closed
- Ready for end-to-end session integration testing

---
*Phase: 03-live-streaming-session*
*Completed: 2026-04-04*

## Self-Check: PASSED

All files exist, all commits verified.
