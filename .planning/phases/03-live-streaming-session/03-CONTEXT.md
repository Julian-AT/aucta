# Phase 3: Live Streaming Session - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the complete real-time AI session experience: mobile session screen with full-screen camera and overlay HUD, bidirectional audio/video streaming to Gemini 2.5 Flash Live via WebSocket, spoken AI guidance playback, tool call execution mid-conversation, reconnection with sessionResumption, and EU AI Act compliance (AI disclosure, non-dismissible indicator). By the end, a technician can point their camera at HVAC equipment, speak naturally, and receive expert-level spoken guidance in real time.

</domain>

<decisions>
## Implementation Decisions

### Session Screen Layout
- **D-01:** Full-screen camera with overlay HUD. Camera fills the entire screen. AI status, connection indicator, stop button, and AI indicator float as translucent overlays. The camera IS the interface.
- **D-02:** Non-dismissible AI indicator as a corner badge (top-left "AI" pill). Always visible, never covered by modals, keyboard, or rotation. Satisfies EU AI Act Art. 50.
- **D-03:** Landscape uses the same full-screen layout with repositioned controls. Stop button moves to right edge. Consistent experience across orientations.
- **D-04:** Animated audio indicator only for AI state feedback. Waveform/pulse near the mic icon when AI is speaking, static when listening. No text subtitles — keeps the screen clean and audio-first.

### Audio Interaction Model
- **D-05:** Always-on microphone. Mic is hot from session start. Technician speaks whenever they want, AI listens continuously. Hands-free — critical for techs holding tools.
- **D-06:** Loudspeaker by default for AI audio output. Technicians work in noisy mechanical rooms. If headphones/earbuds are connected, follow system audio route.
- **D-07:** Instant interrupt barge-in. When technician starts speaking, AI stops talking immediately and listens. Gemini Live supports this natively. Natural conversational flow.
- **D-08:** Audio continues in background. Session keeps running when app is backgrounded. Foreground service notification on Android (@notifee/react-native), background audio mode on iOS. Camera pauses but reconnects when foregrounded.

### Session Start & End Flow
- **D-09:** Start flow: Tap "Start Session" on Home screen -> system checks camera + mic permissions (prompts if not granted) -> AI disclosure screen ("You are interacting with an AI system, not a human expert") with "I understand" button -> session starts. Two taps: Start Session + I understand.
- **D-10:** Camera-first connecting. After AI disclosure, camera preview activates immediately while WebSocket connects in background. AI indicator appears and session becomes live once connected. Camera feels instant, AI joins a moment later.
- **D-11:** End flow: Tap stop button -> confirmation dialog ("End this session?") -> session closes -> return to Home screen. Prevents accidental session ends with gloves.
- **D-12:** Voice end: AI recognizes "end session" / "stop session" phrases, confirms verbally ("Ending the session now. Goodbye.") and closes. Same flow as button confirmation.

### Connection State UX
- **D-13:** During network drops: camera stays live, overlay shows "Reconnecting..." with animated indicator, audio pauses. Last AI response status remains visible. Technician keeps working visually while connection restores.
- **D-14:** Give-up threshold: 2 minutes of failed reconnection attempts (matches Gemini sessionResumption ~2-minute disconnection window). After timeout, show "Connection lost. Session ended." with "Start New Session" button.
- **D-15:** Traffic light connection status in top bar: green dot + "Connected" (normal), yellow dot + "Reconnecting..." (network drop), red dot + "Connection lost" (gave up or fatal error). Readable at a glance.

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specification
- `TECH-SPEC.md` — Primary source: Gemini Live API integration, ephemeral token flow, WebSocket protocol, audio formats (PCM 16kHz input / 24kHz output), JPEG 1 FPS capture, sessionResumption, SlidingWindow context compression, data models
- `LEGAL-ADMIN.md` — EU AI Act Art. 50 non-dismissible AI indicator, AI disclosure wording, stream-and-discard architecture verification, GDPR implications

### Architecture Rules
- `agents/rules/architecture-feature-boundaries.md` — Session orchestration logic in packages/ai/ or apps/mobile/modules/session/; UI components in apps/mobile/
- `agents/rules/architecture-vertical-slices.md` — Session feature as self-contained vertical slice
- `agents/rules/patterns-dependency-injection.md` — Constructor injection for session services and WebSocket manager
- `agents/rules/quality-error-handling.md` — ErrorWithCode in session services, not TRPCError
- `agents/rules/testing-coverage-requirements.md` — 80%+ test coverage with MSW for WebSocket mocking

### Domain Knowledge
- `agents/knowledge-base.md` — AI tool system architecture, Gemini WebSocket protocol details, session lifecycle, tool calling semantics during live session

### Phase Dependencies
- `.planning/phases/02-ai-pipeline-and-tool-system/02-CONTEXT.md` — Tool architecture decisions (buildTool, registry, dispatcher), system prompt personality (D-04/05/06), tool failure behavior (D-10/11/12)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/api/src/routers/session.router.ts` — Ephemeral token endpoint already built. Creates tokens with system prompt + tool declarations locked. Mobile client calls this before establishing WebSocket.
- `packages/ai/src/tools/` — buildTool factory, assembleToolPool registry, dispatchToolCalls dispatcher. Tool declarations returned in token response for mobile client WebSocket setup.
- `packages/ai/src/prompts/` — Layered system prompt builder (core, HVAC expertise, safety rules). Already used by token endpoint.
- `apps/mobile/components/common/ScreenContainer.tsx` — Reusable screen container with safe area handling.
- `apps/mobile/components/common/LoadingSpinner.tsx` — Loading indicator component.
- `apps/mobile/app/(app)/(tabs)/index.tsx` — Home screen with "Start Session" button (currently shows placeholder alert). Navigation target for session screen.
- `apps/mobile/lib/api.ts` — tRPC client setup. Used to call ephemeral token endpoint.

### Established Patterns
- NativeWind v5 + Tailwind CSS v4 styling with `className` props
- tRPC + TanStack Query for data fetching from mobile
- Expo Router file-based routing with group layouts `(app)/(tabs)/`
- Zustand mentioned in tech stack for client state (not yet implemented — new for session state)
- Lucide React Native for icons (Zap icon on Home screen)

### Integration Points
- Home screen "Start Session" button -> navigate to new session route
- Session route calls `trpc.session.createToken` to get ephemeral Gemini token
- Mobile client establishes WebSocket to Gemini Live using ephemeral token + tool declarations
- Tool calls from Gemini dispatched locally on device or via server-side dispatcher (architecture decision for researcher)
- Session end returns to Home screen

</code_context>

<specifics>
## Specific Ideas

- The session screen should feel like pointing a camera, not using an app. Full-screen camera with minimal chrome.
- Audio-first: the technician's hands are occupied. No typing, no tapping during the actual guidance. Only the stop button needs touch interaction.
- Camera-first connecting creates the perception of instant start — technician sees their equipment immediately while the AI connection establishes.
- Traffic light connection status is a universal pattern that works in any language and for any literacy level.
- Background audio is essential — technicians frequently switch to reference photos, take calls, or check parts catalogs mid-job.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-live-streaming-session*
*Context gathered: 2026-04-04*
