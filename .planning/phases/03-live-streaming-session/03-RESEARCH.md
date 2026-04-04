# Phase 3: Live Streaming Session - Research

**Researched:** 2026-04-04
**Domain:** Real-time multimodal AI streaming (Gemini Live API + React Native audio/video + WebSocket)
**Confidence:** MEDIUM-HIGH

## Summary

This phase builds the core product experience: a technician points their phone camera at HVAC equipment, speaks naturally, and receives real-time spoken AI guidance via Gemini 2.5 Flash Live API. The implementation spans four major technical domains: (1) WebSocket connection management to Gemini Live, (2) bidirectional audio streaming (PCM recording + playback), (3) camera frame capture and encoding, and (4) a reactive session UI with connection state management, background audio, and EU AI Act compliance.

The primary technical risks are audio pipeline reliability (getting raw PCM from the microphone in real-time on both iOS and Android) and the pre-1.0 status of react-native-audio-api. The Gemini Live API protocol is well-documented with clear WebSocket message formats, and the existing codebase already has the ephemeral token endpoint, tool system, and session router ready to integrate. Zustand is installed but not yet used -- this phase introduces it as the session state manager.

**Primary recommendation:** Build a thin WebSocket wrapper around the raw Gemini Live WebSocket protocol (not the @google/genai SDK) for maximum control in React Native. Use react-native-audio-api for both microphone PCM capture (via AudioContext + AudioWorklet) and speaker PCM playback (via AudioBufferSourceNode scheduling). Dispatch tool calls through a new tRPC endpoint on the server.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full-screen camera with overlay HUD. Camera fills the entire screen. AI status, connection indicator, stop button, and AI indicator float as translucent overlays. The camera IS the interface.
- **D-02:** Non-dismissible AI indicator as a corner badge (top-left "AI" pill). Always visible, never covered by modals, keyboard, or rotation. Satisfies EU AI Act Art. 50.
- **D-03:** Landscape uses the same full-screen layout with repositioned controls. Stop button moves to right edge. Consistent experience across orientations.
- **D-04:** Animated audio indicator only for AI state feedback. Waveform/pulse near the mic icon when AI is speaking, static when listening. No text subtitles.
- **D-05:** Always-on microphone. Mic is hot from session start. Technician speaks whenever they want, AI listens continuously. Hands-free.
- **D-06:** Loudspeaker by default for AI audio output. If headphones/earbuds are connected, follow system audio route.
- **D-07:** Instant interrupt barge-in. When technician starts speaking, AI stops talking immediately and listens. Gemini Live supports this natively.
- **D-08:** Audio continues in background. Session keeps running when app is backgrounded. Foreground service notification on Android (@notifee/react-native), background audio mode on iOS. Camera pauses but reconnects when foregrounded.
- **D-09:** Start flow: Tap "Start Session" on Home screen -> system checks camera + mic permissions (prompts if not granted) -> AI disclosure screen ("You are interacting with an AI system, not a human expert") with "I understand" button -> session starts. Two taps: Start Session + I understand.
- **D-10:** Camera-first connecting. After AI disclosure, camera preview activates immediately while WebSocket connects in background. Camera feels instant, AI joins a moment later.
- **D-11:** End flow: Tap stop button -> confirmation dialog ("End this session?") -> session closes -> return to Home screen. Prevents accidental session ends with gloves.
- **D-12:** Voice end: AI recognizes "end session" / "stop session" phrases, confirms verbally and closes. Same flow as button confirmation.
- **D-13:** During network drops: camera stays live, overlay shows "Reconnecting..." with animated indicator, audio pauses. Last AI response status remains visible.
- **D-14:** Give-up threshold: 2 minutes of failed reconnection attempts (matches Gemini sessionResumption ~2-minute disconnection window). After timeout, show "Connection lost. Session ended." with "Start New Session" button.
- **D-15:** Traffic light connection status in top bar: green dot + "Connected" (normal), yellow dot + "Reconnecting..." (network drop), red dot + "Connection lost" (gave up or fatal error).

### Claude's Discretion
- WebSocket connection management implementation details (reconnection backoff algorithm, message queuing)
- Camera JPEG capture implementation (expo-camera frame extraction, compression, base64 encoding)
- Audio recording library choice (expo-audio vs expo-av via dev build) and PCM encoding details
- Audio playback implementation (react-native-audio-api or alternative if AudioBufferQueueSourceNode is unavailable)
- Zustand store shape for session state management
- Session screen route structure in Expo Router (modal vs stack vs separate group)
- Android foreground service notification content and behavior
- Screen wake lock implementation details (expo-keep-awake)
- Tool call visual feedback during mid-session execution (if any)
- Exact animation/transition details for state changes

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESS-01 | Start live AI session within two taps | Session start flow (D-09), route structure, permission checking |
| SESS-02 | Camera streams JPEG frames (1 FPS, 768px, base64) to Gemini Live | expo-camera takePictureAsync + setInterval, WebSocket realtimeInput.video message format |
| SESS-03 | Microphone streams PCM audio (16kHz, 16-bit, mono) to Gemini Live | react-native-audio-api AudioContext + microphone, WebSocket realtimeInput.audio message format |
| SESS-04 | AI spoken guidance streams back as PCM (24kHz) and plays through speaker | react-native-audio-api AudioBufferSourceNode scheduling, Gemini serverContent.modelTurn parsing |
| SESS-05 | Gemini auto-detects language and responds in same language (24+ languages) | Built into Gemini Live -- no client-side work needed, just configure voice in setup |
| SESS-06 | Tool calls execute mid-conversation without interrupting audio (async function calling) | New tRPC endpoint for tool dispatch, NON_BLOCKING behavior on function declarations |
| SESS-07 | Context window compression (SlidingWindow) configured in setup message | contextWindowCompression: { slidingWindow: {} } in LiveConnectConfig |
| SESS-08 | Reconnection with exponential backoff using sessionResumption handle | sessionResumption config, SessionResumptionUpdate messages, @react-native-community/netinfo or expo-network |
| SESS-09 | End session by tapping stop button or saying "end session" | Stop button with confirmation dialog (D-11), voice command handled by Gemini (D-12) |
| UX-01 | Glove-friendly touch targets (56x56dp minimum) | NativeWind minH-[56] minW-[56], session screen overlay components |
| UX-02 | High-contrast UI readable in direct sunlight (WCAG AAA) | Semi-transparent dark overlays on camera feed, white text on dark backgrounds |
| UX-03 | Audio-first interaction, no typing required | Always-on mic (D-05), voice commands (D-12) |
| UX-04 | Works in portrait and landscape | Expo orientation: "default" already set, responsive overlay positioning |
| UX-05 | Screen stays awake during active session | expo-keep-awake activateKeepAwakeAsync/deactivateKeepAwake |
| UX-07 | Clear connection status indicator | Traffic light pattern (D-15), Zustand session state machine |
| UX-08 | Visual feedback during AI processing | Animated audio indicator (D-04), waveform/pulse animation |
| COMP-01 | Non-dismissible AI indicator throughout session | Top-left "AI" pill badge (D-02), absolute positioned with highest zIndex |
| COMP-02 | AI disclosure at session start | Disclosure screen in start flow (D-09), blocks session until acknowledged |
| COMP-06 | Stream-and-discard: no audio/video stored on our servers | Mobile connects directly to Gemini via WebSocket; tool calls relay structured data only, no A/V through our server |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **NativeWind v4.2.3 + Tailwind CSS 3.4.17** -- actual installed versions (despite STATE.md mentioning v5 upgrade attempt, the project reverted to v4 stable per user memory). All UI must use v4 patterns.
- **Architecture patterns enforced:** Repository pattern (Drizzle in repos only), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Import boundaries:** packages/ai/ must not import from @trpc/server. Mobile session code goes in apps/mobile/ (hooks, stores, components, lib).
- **Testing:** 80%+ coverage for new code, co-located tests, Vitest
- **Conventional commits**, draft PRs, under 500 lines per PR
- **Drizzle ORM pinned to ^0.45.0** (not beta)
- **EAS development builds required** for audio/camera testing (not Expo Go)

## Standard Stack

### Core (Phase 3 New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-audio-api | 0.11.7 | Audio capture + playback | Web Audio API pattern for both PCM microphone recording and PCM playback. Only RN library supporting AudioContext + AudioBufferSourceNode + microphone capture. Pre-1.0 but actively maintained by Software Mansion. |
| expo-keep-awake | 55.0.6 | Screen wake lock | Prevents screen dimming during active session. Official Expo SDK 55 package. |
| @notifee/react-native | 9.1.8 | Android foreground service | Required for background audio on Android. Foreground service notification keeps audio alive when app is backgrounded. |
| @react-native-community/netinfo | 12.0.1 | Connectivity detection | More granular than expo-network for real-time connection monitoring (addEventListener with immediate state + change events, isInternetReachable). |
| expo-audio | 55.0.11 | Fallback audio recording | If react-native-audio-api microphone capture proves unreliable, expo-audio can record PCM on iOS via linearPCM options. Not primary recommendation. |

### Already Installed (Phase 3 Relevant)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| expo-camera | ~55.0.13 | JPEG frame capture | Installed. takePictureAsync({ base64: true }) for 1 FPS capture. |
| zustand | ^5.0.12 | Session state management | Installed, not yet used. First Zustand store in this phase. |
| @google/genai | 1.48.0 | Gemini SDK (server-side) | In packages/api/. NOT used on mobile -- raw WebSocket recommended instead. |
| expo-network | ^55.0.11 | Network state | Installed. Replace with @react-native-community/netinfo for richer events. |
| lucide-react-native | ^1.7.0 | Icons | Installed. Use for session UI icons (Mic, MicOff, Camera, X, Wifi, WifiOff). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw WebSocket | @google/genai SDK (ai.live.connect) | SDK is cleaner API but untested in React Native; may have Node.js-specific dependencies. Raw WebSocket gives full control and avoids SDK compatibility risk. |
| react-native-audio-api | expo-audio + manual PCM chunking | expo-audio records to file (not streaming buffers). Would need record-in-chunks approach with gaps. react-native-audio-api provides real-time PCM access via AudioContext. |
| @react-native-community/netinfo | expo-network | expo-network is already installed but netinfo has richer addEventListener API with immediate state reporting and isInternetReachable. More suitable for real-time reconnection logic. |
| react-native-audio-api for playback | expo-av Audio.Sound | expo-av can play audio files but not raw PCM buffers streamed in real-time. AudioBufferSourceNode from react-native-audio-api is designed for this. |

**Installation:**
```bash
cd apps/mobile
bun add react-native-audio-api@^0.11.7 expo-keep-awake@~55.0.6 @notifee/react-native@^9.1.8 @react-native-community/netinfo@^12.0.1
```

## Architecture Patterns

### Architecture Decision: Tool Dispatch Location

**Decision: Server-side dispatch via tRPC.**

Tool calls from Gemini arrive at the mobile client over WebSocket. The mobile app relays them to the server via a new tRPC endpoint (`session.dispatchToolCalls`), where the existing `dispatchToolCalls()` function executes them with full database/API access. Results flow back through tRPC to the mobile app, which sends them as `toolResponse` messages to Gemini.

**Why not client-side dispatch:**
- Tools need database access (future tools need org-scoped data, knowledge base queries)
- Tool implementations contain business logic that should stay server-side
- Security: tool code and data sources stay on the server
- The existing `dispatchToolCalls` function in packages/ai already handles this
- Only structured data (not audio/video) passes through our server, preserving stream-and-discard architecture (COMP-06)

### Architecture Decision: WebSocket vs SDK

**Decision: Raw WebSocket protocol, not @google/genai SDK.**

The mobile client connects directly to Gemini Live using the raw WebSocket protocol documented at ai.google.dev. This avoids SDK compatibility risks in React Native and gives full control over the connection lifecycle, message framing, and error handling.

**WebSocket endpoint for ephemeral tokens:**
```
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token={ephemeralToken}
```

### Architecture Decision: Audio Library

**Decision: react-native-audio-api for both recording and playback.**

Use the Web Audio API pattern: AudioContext for microphone capture (with AudioWorklet or ScriptProcessorNode for PCM extraction) and AudioBufferSourceNode for scheduling PCM playback chunks.

**Risk mitigation:** If react-native-audio-api microphone capture proves unreliable (pre-1.0 library), fall back to expo-audio for recording (file-based PCM on iOS, then read and stream) while keeping react-native-audio-api for playback.

### Recommended Project Structure

```
apps/mobile/
  app/(app)/
    session.tsx                    # Session route (full-screen, no tabs)
  components/
    session/
      SessionScreen.tsx            # Full-screen camera + HUD overlay orchestrator
      AIDisclosureModal.tsx        # Pre-session AI disclosure (D-09)
      AIIndicator.tsx              # Non-dismissible "AI" pill badge (D-02)
      ConnectionStatus.tsx         # Traffic light indicator (D-15)
      AudioIndicator.tsx           # Animated waveform/pulse (D-04)
      StopButton.tsx               # Glove-friendly stop button (D-11)
      SessionHUD.tsx               # HUD overlay container for all controls
  lib/
    gemini/
      connection.ts                # GeminiConnection class: WebSocket lifecycle
      protocol.ts                  # Message types, serialization, constants
      audio-capture.ts             # AudioContext + microphone -> PCM 16kHz chunks
      audio-playback.ts            # PCM 24kHz -> AudioBufferSourceNode scheduling
      frame-capture.ts             # expo-camera ref -> JPEG base64 at 1 FPS
      reconnection.ts              # Exponential backoff + sessionResumption
      tool-relay.ts                # Relay toolCall to tRPC, send toolResponse back
  stores/
    session-store.ts               # Zustand: session state machine + connection state
  hooks/
    useGeminiSession.ts            # Orchestrates connection, audio, video, tools
    usePermissions.ts              # Camera + microphone permission check
    useBackgroundAudio.ts          # iOS background mode + Android foreground service
```

### Pattern 1: Session State Machine (Zustand)

**What:** Zustand store managing the session lifecycle as a state machine.
**When to use:** All session-related state that must be accessible outside React (WebSocket callbacks, audio callbacks).

```typescript
// apps/mobile/stores/session-store.ts
import { create } from "zustand";

type SessionStatus =
  | "idle"
  | "requesting-permissions"
  | "disclosure"
  | "connecting"
  | "active"
  | "disconnected"
  | "reconnecting"
  | "completed"
  | "failed"
  | "timeout";

type ConnectionQuality = "connected" | "reconnecting" | "lost";

interface SessionState {
  status: SessionStatus;
  connectionQuality: ConnectionQuality;
  resumptionHandle: string | null;
  isMicActive: boolean;
  isAISpeaking: boolean;
  reconnectAttempts: number;
  error: string | null;

  // Actions callable from outside React (WebSocket callbacks, audio callbacks)
  setStatus: (status: SessionStatus) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setResumptionHandle: (handle: string | null) => void;
  setAISpeaking: (speaking: boolean) => void;
  reset: () => void;
}
```

**Why Zustand:** WebSocket message handlers and native audio callbacks fire outside the React render cycle. Zustand's `getState()` / `setState()` work outside React components -- essential for this use case.

### Pattern 2: WebSocket Connection Manager

**What:** Class managing the Gemini Live WebSocket lifecycle with reconnection.
**When to use:** Single instance per session, created by useGeminiSession hook.

```typescript
// apps/mobile/lib/gemini/connection.ts
class GeminiConnection {
  private ws: WebSocket | null = null;
  private resumptionHandle: string | null = null;

  constructor(private deps: {
    onAudioData: (pcmBase64: string) => void;
    onToolCall: (toolCall: ToolCallEvent) => void;
    onStatusChange: (status: string) => void;
    onResumptionUpdate: (handle: string) => void;
    onTurnComplete: () => void;
    onGoAway: (timeLeftMs: number) => void;
  }) {}

  async connect(token: string, model: string, toolDeclarations: any[]): Promise<void> {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${token}`;
    this.ws = new WebSocket(url);
    // Send setup message on open, parse messages on receive
  }

  sendAudio(pcmBase64: string): void {
    // { realtimeInput: { audio: { data, mimeType: "audio/pcm;rate=16000" } } }
  }

  sendVideo(jpegBase64: string): void {
    // { realtimeInput: { video: { data, mimeType: "image/jpeg" } } }
  }

  sendToolResponse(responses: ToolResponseMessage): void {
    // { toolResponse: { functionResponses } }
  }

  close(): void { /* clean shutdown */ }
}
```

### Pattern 3: PCM Audio Playback via AudioBufferSourceNode Scheduling

**What:** Schedule sequential AudioBufferSourceNode instances to play continuous PCM audio.
**When to use:** Playing back Gemini's 24kHz PCM audio response stream.

```typescript
// apps/mobile/lib/gemini/audio-playback.ts
import { AudioContext } from "react-native-audio-api";

const PLAYBACK_SAMPLE_RATE = 24000;

class AudioPlayback {
  private ctx: AudioContext;
  private nextStartTime = 0;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    this.nextStartTime = this.ctx.currentTime;
  }

  enqueueChunk(pcmBase64: string): void {
    const pcmBytes = base64ToArrayBuffer(pcmBase64);
    const float32 = pcm16ToFloat32(pcmBytes); // Convert 16-bit PCM to float32

    const buffer = this.ctx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    // Schedule seamlessly after previous chunk
    const startTime = Math.max(this.nextStartTime, this.ctx.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  interrupt(): void {
    // On barge-in: close and recreate context to stop all scheduled audio
    this.ctx.close();
    this.ctx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    this.nextStartTime = this.ctx.currentTime;
  }
}
```

### Pattern 4: Camera Frame Capture at 1 FPS

**What:** Interval-based JPEG capture using expo-camera ref.
**When to use:** Streaming visual context to Gemini during active session.

```typescript
// apps/mobile/lib/gemini/frame-capture.ts
import type { CameraView } from "expo-camera";

const CAPTURE_INTERVAL_MS = 1000; // 1 FPS
const JPEG_QUALITY = 0.6; // Balance quality vs size

class FrameCapture {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private cameraRef: React.RefObject<CameraView>;

  constructor(
    cameraRef: React.RefObject<CameraView>,
    private onFrame: (jpegBase64: string) => void,
  ) {
    this.cameraRef = cameraRef;
  }

  start(): void {
    this.intervalId = setInterval(async () => {
      if (!this.cameraRef.current) return;
      try {
        const photo = await this.cameraRef.current.takePictureAsync({
          base64: true,
          quality: JPEG_QUALITY,
          // pictureSize can be set for resolution control
        });
        if (photo?.base64) {
          this.onFrame(photo.base64);
        }
      } catch {
        // Camera may be paused (background), skip frame
      }
    }, CAPTURE_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

### Anti-Patterns to Avoid

- **Storing audio/video on our server:** Stream-and-discard (COMP-06). Audio/video goes mobile -> Gemini only. Only structured tool call data passes through our server.
- **Using @google/genai SDK on mobile:** Untested in React Native. Use raw WebSocket for full control.
- **Dispatching tools on the mobile client:** Tools need server-side data access. Always relay through tRPC.
- **Using useState for session state:** WebSocket and audio callbacks fire outside React. Use Zustand with getState()/setState().
- **Recording audio to file and reading it back:** Introduces latency and gaps. Use AudioContext for real-time PCM streaming.
- **Polling for network state:** Use netinfo addEventListener for push-based connectivity changes.
- **Putting Gemini connection logic in a React component:** Extract to lib/gemini/ classes for testability and lifecycle management.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PCM audio playback scheduling | Custom audio buffer queue | react-native-audio-api AudioBufferSourceNode | Web Audio API handles timing, sample rate conversion, and audio graph routing. Scheduling AudioBufferSourceNode instances at precise times is the standard Web Audio pattern for gapless playback. |
| Exponential backoff | Manual setTimeout chains | Utility function with jitter | Simple to write but easy to get wrong. Include jitter to prevent thundering herd. Standard algorithm: `min(maxDelay, baseDelay * 2^attempt) + random(0, jitter)`. |
| Network connectivity detection | Manual fetch ping loop | @react-native-community/netinfo | Native OS-level connectivity events, isInternetReachable, connection type. Much more reliable than application-level pinging. |
| Screen wake lock | Custom native module | expo-keep-awake | One-liner: activateKeepAwakeAsync() / deactivateKeepAwake(). Handles both platforms. |
| Android foreground service | Custom Java/Kotlin service | @notifee/react-native | Handles foreground service notification, audio focus, and service lifecycle. Required for background audio on Android. |
| Permission handling | Manual native code | expo-camera requestCameraPermissionsAsync + expo-audio requestRecordingPermissionsAsync | Expo APIs handle platform differences, permission dialogs, and settings redirects. |
| Base64 encoding/decoding | Manual implementation | react-native's built-in btoa/atob or a polyfill | React Native 0.83 includes global btoa/atob. For binary data, use ArrayBuffer utilities. |

**Key insight:** The audio pipeline is the most technically complex part of this phase. Using react-native-audio-api's Web Audio API pattern avoids reinventing audio graph routing, sample rate handling, and buffer scheduling. The library handles the native bridge for both iOS (AVAudioEngine) and Android (Oboe/AudioTrack).

## Common Pitfalls

### Pitfall 1: AudioBufferQueueSourceNode Does Not Exist
**What goes wrong:** TECH-SPEC and CLAUDE.md reference AudioBufferQueueSourceNode for streaming playback, but this node does not exist in react-native-audio-api.
**Why it happens:** The TECH-SPEC assumed this API existed. It does not appear in any react-native-audio-api documentation or examples.
**How to avoid:** Use the standard Web Audio pattern: create individual AudioBufferSourceNode instances for each PCM chunk and schedule them sequentially using AudioContext.currentTime. This is the established Web Audio approach for streaming playback.
**Warning signs:** Import errors for AudioBufferQueueSourceNode, TypeScript type errors.

### Pitfall 2: expo-camera takePictureAsync Latency
**What goes wrong:** takePictureAsync may take 200-500ms on some devices, making true 1 FPS impossible and creating back-pressure.
**Why it happens:** JPEG encoding, especially at high resolution, is CPU-intensive. Concurrent captures can queue up.
**How to avoid:** Use a guard flag to prevent concurrent captures. Set quality to 0.5-0.7 and use a smaller pictureSize. Skip frames rather than queue them. Never call takePictureAsync while a previous call is still pending.
**Warning signs:** Growing memory usage, delayed frames, UI jank during capture.

### Pitfall 3: WebSocket Message Ordering on Reconnection
**What goes wrong:** After reconnection with sessionResumption, the client may receive a burst of buffered messages. Processing them out of order corrupts session state.
**Why it happens:** WebSocket guarantees message ordering within a connection, but the transition between connections during resumption can surface edge cases.
**How to avoid:** Process all incoming messages sequentially (no parallel parsing). After reconnection, wait for the first ServerContent message before sending new audio/video. Use the Zustand store's status to gate sending operations.
**Warning signs:** Duplicate audio playback, tool calls processed twice, state machine entering invalid states.

### Pitfall 4: Background Audio on Android Requires Foreground Service
**What goes wrong:** Android kills the audio pipeline within seconds of the app being backgrounded without a foreground service.
**Why it happens:** Android's battery optimization aggressively kills background processes. Audio recording and WebSocket connections are not exempt.
**How to avoid:** Use @notifee/react-native to create a foreground service notification before starting the session. The notification must be visible as long as audio is active. On iOS, configure the audio background mode in app.json.
**Warning signs:** Audio cuts out within 5-10 seconds of backgrounding on Android, WebSocket closes unexpectedly.

### Pitfall 5: Ephemeral Token Expiry Mid-Session
**What goes wrong:** The ephemeral token has a 30-minute message window. Sessions exceeding this lose their connection with no graceful recovery.
**Why it happens:** The token's expireTime limits how long messages can be sent, regardless of session activity.
**How to avoid:** Track session duration in Zustand. At ~25 minutes, warn the technician verbally via the AI that the session will need to restart soon. Proactively create a new token and prepare for handoff. The GoAway server message also signals impending disconnection -- monitor for it.
**Warning signs:** WebSocket closes unexpectedly after ~30 minutes, "token expired" errors.

### Pitfall 6: Barge-In Audio Overlap
**What goes wrong:** When the technician speaks and triggers barge-in, already-buffered audio chunks continue playing, creating overlapping speech.
**Why it happens:** AudioBufferSourceNode instances are pre-scheduled. Barge-in cancels Gemini's generation but already-scheduled local playback continues.
**How to avoid:** On barge-in (detected when Gemini sends an interruption event or new user audio input), immediately call AudioContext.close() and create a fresh AudioContext. This cancels all scheduled playback. Reset the nextStartTime.
**Warning signs:** AI and technician speaking simultaneously, delayed audio after interruption.

### Pitfall 7: NativeWind v4 vs v5 Confusion
**What goes wrong:** Code uses NativeWind v5 APIs or Tailwind v4 CSS syntax, but the project actually runs v4.2.3 + Tailwind 3.4.17.
**Why it happens:** CONTEXT.md code_context mentions "NativeWind v5 + Tailwind CSS v4" but the actual package.json has v4.2.3. The project attempted v5 but reverted due to crashes.
**How to avoid:** All session UI code MUST use NativeWind v4 with Tailwind v3 syntax. Use `className` props (which v4 supports), but follow Tailwind v3 documentation for utility classes. Check package.json versions, not documentation references.
**Warning signs:** "nativewind/babel" plugin errors, lightningcss errors, undefined CSS utilities.

### Pitfall 8: Session Resumption Token vs Ephemeral Token
**What goes wrong:** Confusing the sessionResumption handle (for reconnecting to the same Gemini session) with the ephemeral token (for authenticating the WebSocket connection).
**Why it happens:** Both are tokens involved in connection management, but they serve completely different purposes.
**How to avoid:** Ephemeral token = authentication credential (from our server, used once to start connection). Resumption handle = session continuity credential (from Gemini, used to reconnect to same context). Store them in separate Zustand state fields. The resumption handle is updated via SessionResumptionUpdate messages and is valid for up to 2 hours after disconnection.
**Warning signs:** Attempting to use expired ephemeral tokens for reconnection, losing session context on reconnect.

## Code Examples

### WebSocket Setup Message Format

```typescript
// Source: ai.google.dev/gemini-api/docs/live-api/get-started-websocket
// Sent immediately after WebSocket opens
const setupMessage = {
  config: {
    model: `models/${model}`, // e.g., "models/gemini-2.5-flash-live-preview"
    responseModalities: ["AUDIO"],
    systemInstruction: {
      parts: [{ text: systemPromptText }],
    },
    // Tool declarations from token endpoint
    tools: [{ functionDeclarations: toolDeclarations }],
    // Session resumption (pass handle on reconnect, empty object on first connect)
    sessionResumption: resumptionHandle
      ? { handle: resumptionHandle }
      : {},
    // Context window compression for sessions >10 minutes
    contextWindowCompression: {
      slidingWindow: {},
    },
  },
};
websocket.send(JSON.stringify(setupMessage));
```

### Sending Audio Data

```typescript
// Source: ai.google.dev/gemini-api/docs/live-api/get-started-websocket
function sendAudioChunk(pcmBase64: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    realtimeInput: {
      audio: {
        data: pcmBase64,
        mimeType: "audio/pcm;rate=16000",
      },
    },
  }));
}
```

### Sending Video Frame

```typescript
// Source: ai.google.dev/gemini-api/docs/live-api/get-started-websocket
function sendVideoFrame(jpegBase64: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    realtimeInput: {
      video: {
        data: jpegBase64,
        mimeType: "image/jpeg",
      },
    },
  }));
}
```

### Receiving and Parsing Server Messages

```typescript
// Source: ai.google.dev/gemini-api/docs/live-api/get-started-websocket + session-management
websocket.onmessage = (event: MessageEvent) => {
  const msg = JSON.parse(event.data);

  // Audio response from AI
  if (msg.serverContent?.modelTurn?.parts) {
    for (const part of msg.serverContent.modelTurn.parts) {
      if (part.inlineData?.data) {
        audioPlayback.enqueueChunk(part.inlineData.data);
        sessionStore.getState().setAISpeaking(true);
      }
    }
  }

  // Turn complete (AI finished speaking)
  if (msg.serverContent?.turnComplete) {
    sessionStore.getState().setAISpeaking(false);
  }

  // Generation complete
  if (msg.serverContent?.generationComplete) {
    // Model finished all output for this turn
  }

  // Tool call from Gemini
  if (msg.toolCall) {
    handleToolCall(msg.toolCall);
  }

  // Session resumption update
  if (msg.sessionResumptionUpdate) {
    const update = msg.sessionResumptionUpdate;
    if (update.resumable && update.newHandle) {
      sessionStore.getState().setResumptionHandle(update.newHandle);
    }
  }

  // GoAway -- server will terminate connection soon
  if (msg.goAway) {
    // Prepare for reconnection or graceful end
    console.warn("GoAway received, timeLeft:", msg.goAway.timeLeft);
  }
};
```

### Tool Call Relay via tRPC

```typescript
// apps/mobile/lib/gemini/tool-relay.ts
async function handleToolCall(toolCall: ToolCallEvent): Promise<void> {
  try {
    // Relay to server for execution
    const result = await trpcClient.session.dispatchToolCalls.mutate({
      toolCall,
      sessionId: sessionStore.getState().sessionId,
    });
    // Send result back to Gemini
    connection.sendToolResponse(result);
  } catch (error) {
    // On tRPC failure, send error response to Gemini
    const errorResponses = toolCall.functionCalls.map((fc) => ({
      id: fc.id,
      name: fc.name,
      response: { error: "Tool execution failed", code: "RELAY_ERROR" },
    }));
    connection.sendToolResponse({ functionResponses: errorResponses });
  }
}
```

### Async (Non-Blocking) Function Declarations

```typescript
// Source: ai.google.dev/gemini-api/docs/live-tools
// Tool declarations should include behavior: "NON_BLOCKING" for async execution
const toolDeclarations = pool.functionDeclarations.map((decl) => ({
  ...decl,
  // NON_BLOCKING allows Gemini to continue audio while tool executes
  behavior: "NON_BLOCKING",
}));

// When sending tool response for non-blocking tools, include scheduling
const functionResponse = {
  id: fc.id,
  name: fc.name,
  response: result,
  scheduling: "WHEN_IDLE", // or "INTERRUPT" for urgent, "SILENT" for background
};
```

### Exponential Backoff with Jitter

```typescript
// apps/mobile/lib/gemini/reconnection.ts
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const JITTER_MS = 500;
const MAX_DURATION_MS = 120_000; // 2-minute give-up threshold (D-14)

function calculateBackoff(attempt: number): number {
  const exponential = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
  const jitter = Math.random() * JITTER_MS;
  return exponential + jitter;
}

async function reconnectWithBackoff(
  connect: () => Promise<boolean>,
  onGiveUp: () => void,
): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < MAX_DURATION_MS) {
    const delay = calculateBackoff(attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = await connect();
    if (success) return;

    attempt++;
    sessionStore.getState().setConnectionQuality("reconnecting");
  }

  sessionStore.getState().setConnectionQuality("lost");
  onGiveUp();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AudioBufferQueueSourceNode (assumed) | AudioBufferSourceNode scheduling | N/A -- ABQSN never existed | Playback must use standard Web Audio scheduling pattern |
| expo-av in Expo Go | expo-audio + dev builds only | Expo SDK 55 (2026) | Audio recording requires EAS dev builds, not Expo Go |
| Gemini REST API for function calling | Gemini Live WebSocket with async function calling | Gemini 2.5 Flash Live | Tool calls execute without blocking audio stream (NON_BLOCKING behavior) |
| SessionResumption 2-min window | SessionResumption 2-hour token validity | Recent Gemini update | Resumption tokens valid much longer than previously documented in TECH-SPEC |

**Important update:** TECH-SPEC states sessionResumption has a ~2-minute disconnection window. Gemini docs now say "Resumption tokens are valid for 2 hr after the last sessions termination." The 2-minute window in TECH-SPEC may refer to the practical reconnection window for maintaining seamless context (not token validity). The give-up threshold of 2 minutes (D-14) remains correct as a UX decision, even though the token technically allows longer reconnection.

## Open Questions

1. **react-native-audio-api microphone capture reliability**
   - What we know: Library has microphone support, Record example, AudioWorklet V1/V2. Version 0.11.7.
   - What's unclear: Whether AudioWorklet provides raw PCM buffers at 16kHz reliably on both iOS and Android. The library's microphone example code was not accessible for detailed inspection.
   - Recommendation: Plan a spike task early in the phase to validate microphone PCM capture. Have expo-audio file-based recording as a documented fallback path.

2. **@google/genai SDK React Native compatibility**
   - What we know: SDK works in browsers and Node.js. ai.live.connect() returns a Session with sendRealtimeInput(media: Blob).
   - What's unclear: Whether the SDK's WebSocket implementation works in React Native's JS engine. React Native has WebSocket support but may differ from browser APIs the SDK expects.
   - Recommendation: Use raw WebSocket (research recommendation). If a future task wants to try the SDK, it is a non-blocking experiment.

3. **Base64 encoding performance for audio + video**
   - What we know: Audio (16kHz PCM) and video (JPEG) both need base64 encoding. React Native 0.83 has global btoa.
   - What's unclear: Whether btoa is fast enough for 16kHz audio chunks (~32KB/s raw) + JPEG frames (~50-100KB each). Base64 adds 33% overhead.
   - Recommendation: Profile early. If slow, consider a native module for binary WebSocket frames (though Gemini expects base64 JSON).

4. **Gemini Live API voice selection**
   - What we know: Gemini Live supports 30 HD voices, auto language detection for 24+ languages.
   - What's unclear: How to configure voice in the setup message. The exact field name was not found in the docs reviewed.
   - Recommendation: Check the LiveConnectConfig reference for a voice/speechConfig field. Default voice should work for initial implementation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | 1.3.x | -- |
| Node.js | Metro bundler | Yes | -- | -- |
| Xcode | iOS dev builds | Check | Xcode 26 required for SDK 55 | Use Android-first if Xcode not updated |
| EAS CLI | Dev builds | Check | -- | `npx eas-cli` |
| expo-camera | Video capture | Yes (installed) | ~55.0.13 | -- |
| Zustand | State management | Yes (installed) | ^5.0.12 | -- |
| Physical device | Audio/camera testing | Required | -- | Cannot test in simulator for full audio/camera pipeline |

**Missing dependencies with no fallback:**
- EAS development builds required for audio + camera testing on physical devices (cannot use Expo Go with SDK 55)

**Missing dependencies with fallback:**
- Xcode 26: If not available, test on Android first. iOS testing can follow after Xcode upgrade.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | apps/mobile/vitest.config.ts (Wave 0 -- needs creation) |
| Quick run command | `bun run test --filter=mobile` |
| Full suite command | `bun run test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-01 | Two-tap session start | integration | `bun vitest run apps/mobile/hooks/useGeminiSession.test.ts -t "start flow"` | Wave 0 |
| SESS-02 | JPEG frame capture at 1 FPS | unit | `bun vitest run apps/mobile/lib/gemini/frame-capture.test.ts` | Wave 0 |
| SESS-03 | PCM audio streaming to Gemini | unit | `bun vitest run apps/mobile/lib/gemini/audio-capture.test.ts` | Wave 0 |
| SESS-04 | PCM audio playback from Gemini | unit | `bun vitest run apps/mobile/lib/gemini/audio-playback.test.ts` | Wave 0 |
| SESS-06 | Tool call relay | unit | `bun vitest run apps/mobile/lib/gemini/tool-relay.test.ts` | Wave 0 |
| SESS-07 | SlidingWindow context config | unit | `bun vitest run apps/mobile/lib/gemini/connection.test.ts -t "context compression"` | Wave 0 |
| SESS-08 | Reconnection with backoff | unit | `bun vitest run apps/mobile/lib/gemini/reconnection.test.ts` | Wave 0 |
| SESS-09 | Session end flow | unit | `bun vitest run apps/mobile/stores/session-store.test.ts -t "end session"` | Wave 0 |
| UX-07 | Connection status indicator | unit | `bun vitest run apps/mobile/stores/session-store.test.ts -t "connection quality"` | Wave 0 |
| COMP-06 | Stream-and-discard verification | manual-only | Architecture review: verify no A/V data passes through tRPC endpoints | -- |

### Sampling Rate
- **Per task commit:** `bun vitest run apps/mobile/` (quick, local tests)
- **Per wave merge:** `bun run test` (full Turborepo test suite)
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `apps/mobile/vitest.config.ts` -- Vitest project config for mobile package (follow packages/ai pattern)
- [ ] Mock utilities for WebSocket (ws mock), AudioContext (react-native-audio-api mock), CameraView ref mock
- [ ] `apps/mobile/lib/gemini/__mocks__/` -- Shared mocks for Gemini connection components
- [ ] Note: Most session UI components need manual testing on physical devices. Unit tests cover logic layer (stores, lib/gemini/, hooks), not visual rendering.

## Sources

### Primary (HIGH confidence)
- Gemini Live API overview: https://ai.google.dev/gemini-api/docs/live -- Audio/video formats confirmed
- Gemini WebSocket tutorial: https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket -- Message formats (realtimeInput, serverContent, toolCall, toolResponse)
- Gemini Session Management: https://ai.google.dev/gemini-api/docs/live-api/session-management -- sessionResumption fields, contextWindowCompression, SlidingWindow, GoAway message, 2-hour token validity
- Gemini Ephemeral Tokens: https://ai.google.dev/gemini-api/docs/ephemeral-tokens -- Token creation, liveConnectConstraints, access_token query param, 1-minute new session window, 30-minute message window
- Gemini Live Tools: https://ai.google.dev/gemini-api/docs/live-tools -- Function calling, NON_BLOCKING behavior, scheduling (INTERRUPT/WHEN_IDLE/SILENT), sendToolResponse
- @google/genai SDK Session class: https://googleapis.github.io/js-genai/release_docs/classes/live.Session.html -- sendRealtimeInput(media: Blob), sendToolResponse, sendClientContent, close
- expo-camera SDK 55: https://docs.expo.dev/versions/latest/sdk/camera/ -- takePictureAsync, base64 option, quality, pictureSize
- expo-audio SDK 55: https://docs.expo.dev/versions/latest/sdk/audio/ -- RecordingOptions, sampleRate, iOS linearPCM, no streaming callback
- @react-native-community/netinfo: https://github.com/react-native-netinfo/react-native-netinfo -- addEventListener, fetch, useNetInfo, connection types

### Secondary (MEDIUM confidence)
- react-native-audio-api: https://github.com/software-mansion/react-native-audio-api -- v0.11.7, StreamerNode confirmed, AudioBufferQueueSourceNode NOT found
- react-native-audio-api Streaming example: https://github.com/software-mansion/react-native-audio-api/blob/main/apps/common-app/src/examples/Streaming/Streaming.tsx -- StreamerNode for HLS (not raw PCM), AudioContext + GainNode pattern
- npm registry -- Package versions verified: react-native-audio-api@0.11.7, expo-keep-awake@55.0.6, @notifee/react-native@9.1.8, @react-native-community/netinfo@12.0.1, expo-audio@55.0.11

### Tertiary (LOW confidence)
- react-native-audio-api AudioWorklet/microphone capture details -- Could not inspect example code for Record/Worklets. Microphone + AudioWorklet pattern is inferred from feature list, not verified with code.
- @google/genai SDK React Native compatibility -- Not tested. Recommendation to use raw WebSocket is based on risk avoidance, not confirmed incompatibility.

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH -- Core packages verified via npm, but react-native-audio-api microphone capture is unverified for this exact use case
- Architecture: HIGH -- WebSocket protocol well-documented, tool dispatch pattern clear, state management pattern established
- Pitfalls: HIGH -- Multiple verified gotchas (no AudioBufferQueueSourceNode, NativeWind version, expo-av removal, token expiry)
- Audio pipeline: MEDIUM -- react-native-audio-api is pre-1.0, AudioWorklet-based PCM capture is inferred not verified
- Gemini protocol: HIGH -- Official docs provide exact message formats, field names, and configuration options

**Research date:** 2026-04-04
**Valid until:** 2026-04-18 (14 days -- Gemini Live is Preview, APIs may change)
