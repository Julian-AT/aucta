---
phase: 03-live-streaming-session
plan: 03
subsystem: ai
tags: [pcm-audio, web-audio-api, react-native-audio-api, expo-camera, trpc, gemini-live, streaming]

requires:
  - phase: 03-01
    provides: "Protocol types, audio mocks, session store, dispatchToolCalls tRPC endpoint"
provides:
  - "AudioPlayback class: gapless PCM 24kHz playback with barge-in support"
  - "AudioCapture class: microphone PCM 16kHz streaming interface"
  - "FrameCapture class: JPEG 1 FPS camera capture with concurrent guard"
  - "ToolRelay class: tool call relay to server via tRPC with error mapping"
affects: [03-05-orchestration-hook, 03-04-ui-components]

tech-stack:
  added: []
  patterns:
    - "AudioBufferSourceNode scheduling for gapless PCM playback"
    - "AudioContext close/recreate for barge-in interrupt"
    - "Concurrent capture guard via isCapturing flag"
    - "Dependency injection for tRPC client in ToolRelay"
    - "RELAY_ERROR fallback responses on tool dispatch failure"

key-files:
  created:
    - apps/mobile/lib/gemini/audio-playback.ts
    - apps/mobile/lib/gemini/audio-playback.test.ts
    - apps/mobile/lib/gemini/audio-capture.ts
    - apps/mobile/lib/gemini/audio-capture.test.ts
    - apps/mobile/lib/gemini/frame-capture.ts
    - apps/mobile/lib/gemini/frame-capture.test.ts
    - apps/mobile/lib/gemini/tool-relay.ts
    - apps/mobile/lib/gemini/tool-relay.test.ts
  modified:
    - apps/mobile/lib/gemini/__mocks__/audio.ts

key-decisions:
  - "AudioContext close/recreate pattern for barge-in instead of tracking individual source nodes"
  - "AudioCapture structured as interface-stable class with swappable internals for pre-1.0 library risk"
  - "MockAudioContext enhanced with _sources/_buffers tracking arrays for precise test assertions"

patterns-established:
  - "pcm16ToFloat32: little-endian Int16 to Float32 conversion via (byte2 << 8) | byte1 with sign extension, divided by 32768"
  - "base64ToUint8Array: atob + charCodeAt loop for binary decode in React Native"
  - "Gapless scheduling: Math.max(nextStartTime, ctx.currentTime) + buffer.duration"
  - "Concurrent capture guard: isCapturing flag in try/finally for async interval callbacks"

requirements-completed: [SESS-02, SESS-03, SESS-04, SESS-06]

duration: 4min
completed: 2026-04-04
---

# Phase 3 Plan 3: Data Pipelines Summary

**PCM audio playback/capture, JPEG frame capture, and tool relay classes with 23 passing tests for the four Gemini Live data streams**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T15:10:34Z
- **Completed:** 2026-04-04T15:15:19Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- AudioPlayback schedules PCM 24kHz chunks as gapless AudioBufferSourceNode instances with barge-in support via AudioContext close/recreate
- AudioCapture provides microphone PCM 16kHz streaming interface with swappable internals for react-native-audio-api risk mitigation
- FrameCapture takes JPEG photos at 1 FPS with concurrent capture guard preventing overlapping takePictureAsync calls
- ToolRelay forwards Gemini tool calls to server via tRPC and maps failures to RELAY_ERROR responses
- 23 tests across 4 test files all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Audio playback and audio capture** - `123f676` (feat)
2. **Task 2: Frame capture and tool relay** - `b1563df` (feat)

## Files Created/Modified
- `apps/mobile/lib/gemini/audio-playback.ts` - PCM 24kHz gapless playback via AudioBufferSourceNode scheduling with barge-in interrupt
- `apps/mobile/lib/gemini/audio-playback.test.ts` - 7 tests: PCM conversion, scheduling, interrupt, destroy
- `apps/mobile/lib/gemini/audio-capture.ts` - Microphone PCM 16kHz capture interface with onChunk callback
- `apps/mobile/lib/gemini/audio-capture.test.ts` - 6 tests: lifecycle, sample rate, resource cleanup
- `apps/mobile/lib/gemini/frame-capture.ts` - JPEG 1 FPS capture with concurrent guard via expo-camera ref
- `apps/mobile/lib/gemini/frame-capture.test.ts` - 7 tests: intervals, guard, error handling, null ref
- `apps/mobile/lib/gemini/tool-relay.ts` - Tool call relay to server via injected tRPC dispatch with RELAY_ERROR fallback
- `apps/mobile/lib/gemini/tool-relay.test.ts` - 3 tests: success relay, input shape, error mapping
- `apps/mobile/lib/gemini/__mocks__/audio.ts` - Enhanced with _sources/_buffers tracking for precise assertions

## Decisions Made
- **AudioContext close/recreate for barge-in:** Instead of tracking individual AudioBufferSourceNode instances, closing the entire AudioContext and recreating it cancels all pre-scheduled audio instantly. Simpler and more reliable.
- **AudioCapture as interface-stable wrapper:** Since react-native-audio-api microphone capture is unverified (pre-1.0), AudioCapture is structured so the internal pipeline can be swapped to expo-audio file-based recording without changing the public interface.
- **MockAudioContext enhanced with tracking:** Added _sources and _buffers arrays to MockAudioContext so tests can assert on individual AudioBufferSourceNode scheduling (start times, sample rates, connections).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fake timer test compatibility with async intervals**
- **Found during:** Task 2 (frame-capture tests)
- **Issue:** `vi.advanceTimersByTime` does not resolve async promises in setInterval callbacks, causing the isCapturing guard to remain locked between intervals
- **Fix:** Changed to `vi.advanceTimersByTimeAsync` for all async interval tests in frame-capture
- **Files modified:** apps/mobile/lib/gemini/frame-capture.test.ts
- **Verification:** All 7 frame-capture tests pass
- **Committed in:** b1563df (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial test fix. No scope creep.

## Issues Encountered
None

## Known Stubs

- `apps/mobile/lib/gemini/audio-capture.ts` lines 40-47: Microphone capture setup is a placeholder. The class creates AudioContext but does not wire microphone input to the onChunk callback. This is intentional -- react-native-audio-api microphone capture API is unverified (pre-1.0, research open question #1). Device testing in Plan 05 integration will validate and complete the pipeline. The public interface is stable.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four data pipeline classes (audio in, audio out, video in, tool data) are ready for the orchestration hook in Plan 05
- AudioCapture microphone internals need device testing validation in Plan 05 integration
- AudioPlayback, FrameCapture, and ToolRelay are fully functional and tested

## Self-Check: PASSED

All 9 files verified present. Both commit hashes (123f676, b1563df) found in git log.

---
*Phase: 03-live-streaming-session*
*Completed: 2026-04-04*
