# Pitfalls Research

**Domain:** Real-time multimodal AI copilot for HVAC technicians
**Researched:** 2026-04-03
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Gemini Live Session Termination Without Context Window Compression

**What goes wrong:**
Sessions terminate after ~2 minutes of combined audio+video streaming. The technician is mid-diagnosis and the AI disconnects with no warning.

**Why it happens:**
Gemini Live API has strict context window limits for real-time multimodal input. Without configuring `SlidingWindow` or `TokenCount` context window compression in the WebSocket setup message, the session hits the token limit and terminates.

**How to avoid:**
Configure context window compression in the setup message from day one. Use `outputTokenLimit` and `contextWindowCompression` with `SlidingWindow` trigger. Test with real audio+video streams to verify session duration.

**Warning signs:**
Sessions consistently dying at ~2 minutes. `sessionTerminated` events with reason "context window exceeded."

**Phase to address:**
Phase 1 (Session orchestration) — must be in the initial WebSocket setup implementation.

---

### Pitfall 2: Expo Audio/Camera Requires Development Builds

**What goes wrong:**
Developers try to test audio recording and camera streaming in Expo Go and discover it doesn't work. Expo SDK 55 removed `expo-av` from Expo Go.

**Why it happens:**
Expo Go has limited native module support. Real-time audio recording (PCM 16kHz), camera streaming, and react-native-audio-api all require custom native modules only available in development builds.

**How to avoid:**
Set up EAS development builds from the very first sprint. Use `eas build --profile development` and install via USB/QR. Never plan to demo via Expo Go.

**Warning signs:**
"Module not found" errors in Expo Go. Audio recording returns silence. Camera frames are nil.

**Phase to address:**
Phase 1 (Mobile foundation) — development build config must be the first mobile task.

---

### Pitfall 3: Audio Latency Death Spiral

**What goes wrong:**
The technician experiences 2-5 second delays between speaking and hearing the AI respond. The interaction feels broken and unusable. Technicians abandon the product.

**Why it happens:**
Multiple latency sources compound: audio buffer sizes too large, JPEG compression on main thread, WebSocket message queuing, Gemini processing time, audio playback buffer underruns causing stuttering.

**How to avoid:**
- Use small audio buffers (100-200ms chunks) for recording
- Compress JPEG frames off the main thread (use `ImageManipulator` or native module)
- Monitor round-trip latency from first audio chunk sent to first audio chunk received
- Target <1s total latency for the "I said something → AI starts speaking" loop
- Use `react-native-audio-api`'s AudioBufferQueueSourceNode for streaming playback (avoid buffering the entire response)

**Warning signs:**
Round-trip latency exceeding 1.5 seconds. Users talking over the AI because they think it didn't hear them. Audio playback gaps/stuttering.

**Phase to address:**
Phase 1 (Mobile streaming) — latency measurement must be built into the session from day one.

---

### Pitfall 4: Ephemeral Token Timing Window

**What goes wrong:**
The app requests an ephemeral token, then takes >1 minute to establish the WebSocket connection. The token expires before the session starts.

**Why it happens:**
Ephemeral tokens for Gemini Live have a ~1 minute session start window. Network delays, slow token delivery, or user interruptions (phone call, notification) can consume this window.

**How to avoid:**
Request the ephemeral token immediately before WebSocket connection — not during UI loading. Implement a "connecting..." state that re-requests the token if the first attempt fails. Add retry logic with fresh token on `401`/`403` WebSocket errors.

**Warning signs:**
Intermittent "authentication failed" errors on WebSocket connect. Sessions fail to start on slow networks.

**Phase to address:**
Phase 1 (Ephemeral token endpoint + connection logic).

---

### Pitfall 5: Org-Scoped Data Leak

**What goes wrong:**
A query forgets to include `org_id` filtering, and Org A sees Org B's sessions, knowledge articles, or technician data. In a B2B SaaS, this is a trust-destroying, potentially lawsuit-triggering bug.

**Why it happens:**
Individual queries or repository methods miss the `org_id` filter. Manual enforcement is error-prone at scale.

**How to avoid:**
Enforce org_id at the tRPC middleware level — extract `org_id` from the session and inject it into every context. Repository methods should REQUIRE `org_id` as a parameter (not optional). Run integration tests that create data in two orgs and verify isolation.

**Warning signs:**
Any repository method that doesn't take `org_id` as a required parameter. Any tRPC procedure that builds its own org_id filtering instead of using middleware.

**Phase to address:**
Phase 1 (Database schema + tRPC middleware) — must be architectural from the start, not retrofitted.

---

### Pitfall 6: Knowledge Base Quality Decay

**What goes wrong:**
The knowledge base fills with low-quality, unverified AI-generated articles. Over time, the AI retrieves and cites incorrect information, damaging trust. Senior technicians stop using the product because "it gives wrong advice."

**Why it happens:**
The ingest-compile pipeline runs automatically after every session, generating articles without human oversight. Without aggressive confidence tagging and a functioning verification queue, unverified content drowns verified content.

**How to avoid:**
- All AI-generated content starts as `unverified` — no exceptions
- Retrieval must weight confidence level heavily (verified articles rank higher than unverified)
- The AI must attribute its source and confidence: "Based on unverified observation..." vs "Per manufacturer documentation..."
- Build the verification workflow (even CLI-based) before enabling auto-ingestion at scale
- Set a maximum ratio of unverified-to-verified articles per equipment model

**Warning signs:**
Retrieval results dominated by `unverified` articles. Technician feedback consistently rating sessions poorly. AI citing contradictory information.

**Phase to address:**
Phase 1 (Knowledge base backend) — confidence scoring and weighted retrieval must be in the initial implementation.

---

### Pitfall 7: NativeWind v5 Pre-Release Instability

**What goes wrong:**
Layout bugs, style mismatches between platforms, build failures from peer dependency conflicts. NativeWind v5 is preview-only (v5.0.0-preview.3) with active bugs.

**Why it happens:**
NativeWind v5 is a ground-up rewrite for Tailwind v4 with a new CSS engine. Preview releases break frequently.

**How to avoid:**
Start with NativeWind v4.2.3 (stable) + Tailwind v3. Upgrade to v5 when it reaches RC or stable. Alternatively, use the base `react-native-css` package that NativeWind v5 wraps, which may be more stable.

**Warning signs:**
Style flickering on Android. Styles that work on iOS but not Android (or vice versa). Build errors mentioning `react-native-css-interop`.

**Phase to address:**
Phase 1 (Mobile foundation) — choose stable styling from the start.

---

### Pitfall 8: ColPali Python Sidecar Complexity

**What goes wrong:**
The knowledge base manual ingestion (PDF → multimodal embeddings) doesn't work because ColPali is Python-only. There's no JavaScript SDK.

**Why it happens:**
ColPali uses PyTorch vision models to generate multi-vector embeddings from document pages. This is fundamentally a Python ML pipeline.

**How to avoid:**
Plan for a Python sidecar from the start — either a Docker container for local dev or a serverless Python function (e.g., Modal, Replicate, or a simple FastAPI on Railway). Qdrant's multivector support handles the retrieval side natively.

**Warning signs:**
Attempting to implement ColPali in JavaScript. Blocking the KB milestone on finding a JS alternative.

**Phase to address:**
Phase 1 (Knowledge base) — infrastructure decision needed early.

---

### Pitfall 9: WebSocket Reconnection State Loss

**What goes wrong:**
The technician walks through a dead zone (basement, elevator), loses connection for 30 seconds, reconnects, and the AI has lost all context from the session. It's like starting over.

**Why it happens:**
Session state (what equipment was identified, what was discussed, what tools were called) lives only in Gemini's context window. On reconnection without `sessionResumption`, the context is gone.

**How to avoid:**
Use Gemini's `sessionResumption` handle (valid for 2 hours — NOT 2 minutes as sometimes documented). Cache the resumption handle locally. On reconnection, pass it to resume the session with full context. Also maintain a local session state log (equipment identified, key findings) as a fallback to re-inject into system prompt on fresh connection.

**Warning signs:**
AI repeating its greeting after reconnection. AI not recognizing equipment it previously identified. Tool call history lost.

**Phase to address:**
Phase 1 (Session orchestration — reconnection logic).

---

### Pitfall 10: EU AI Act Non-Dismissible Indicator Implementation

**What goes wrong:**
The AI disclosure indicator is implemented as a toast or banner that can be scrolled away, dismissed, or hidden by other UI elements. This violates Art. 50 transparency requirements.

**Why it happens:**
Standard mobile UI patterns (toasts, banners, modals) are inherently dismissible. The requirement for a "non-dismissible" indicator is unusual.

**How to avoid:**
Implement as a persistent, floating element (like a status bar badge or always-visible header chip) that remains visible throughout the entire session. It cannot be covered by modals, action sheets, or scrolling content. Test by using the app and verifying the indicator is visible in every possible state.

**Warning signs:**
Any state where the AI indicator is not visible during an active session. QA testing showing the indicator hidden by keyboard, modals, or landscape rotation.

**Phase to address:**
Phase 1 (Mobile UI) — must be part of the session screen design from the start.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping Zod validation on internal DTO boundaries | Faster initial dev | Type mismatches surface as runtime errors in production | Never — Zod validation is cheap and catches real bugs |
| Hardcoding system prompt instead of layered builder | Faster first session | Can't add org overlay, KB context, or session history | Only for the very first "hello world" WebSocket test |
| Skipping org_id in test fixtures | Faster test writing | Tests don't catch cross-org data leaks | Never — every test should use 2 orgs |
| Using Expo Go instead of development builds | Faster iteration | Audio/camera don't work, false confidence in UI | Only for non-native UI work (settings screens, etc.) |
| Storing knowledge articles without embedding | Skip Qdrant setup | No semantic search, only keyword matching | Only for initial CLI-based article seeding |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini Live API | Sending audio+video without context window compression | Configure `contextWindowCompression` in setup message |
| Gemini Live API | Assuming synchronous tool calling | Use async function calling — audio continues during tool execution |
| Gemini Live API | Not handling `goAway` server messages | Implement graceful session handoff on `goAway` |
| Qdrant | Using single-vector for hybrid search | Use named vectors (dense + sparse) with prefetch + RRF fusion |
| Better Auth | Assuming org membership is checked automatically | Add explicit org membership + role check in tRPC middleware |
| Neon Postgres | Running migrations on main branch directly | Use Neon branching — each PR gets its own copy-on-write branch |
| Inngest | Not making steps idempotent | Each `step.run()` must be safe to retry — use idempotency keys |
| Upstash Redis | Caching ephemeral tokens without TTL | Tokens must expire from cache before their actual expiry |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| JPEG encoding on main thread | UI jank during camera streaming, dropped frames | Encode on a background thread via native module or ImageManipulator | Immediately — 1 FPS at 768px JPEG is expensive |
| Unbounded session_events table | Queries slow down, dashboard list takes seconds | Partition by month, add composite index on (session_id, timestamp) | >1M rows (~10K sessions) |
| Vector search without metadata filtering | Qdrant scans entire collection | Pre-filter by org_id and equipment_model before vector similarity | >10K articles |
| Loading full article content in search results | High memory usage, slow response | Return summaries in search, load full content on demand | >100 articles per org |
| Storing audio PCM as base64 in WebSocket messages | 33% size overhead, slower encoding | Send raw binary frames (Gemini accepts ArrayBuffer) | Immediately — reduces bandwidth |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Gemini API key in mobile app bundle | Key extracted from APK, unlimited API usage billed to you | Ephemeral tokens only — API key stays on server |
| Ephemeral token without scope constraints | Compromised token allows arbitrary Gemini usage | Lock model, system prompt, and tools via `liveConnectConstraints` |
| org_id from client instead of session | Attacker changes org_id to access other orgs | Always derive org_id from authenticated session, never from request body |
| Knowledge articles without org_id filtering in search | Cross-org knowledge leakage | Qdrant payload filter must include org_id for org-scoped articles |
| Session events without rate limiting | Attacker floods event logging endpoint | Rate limit event ingestion per session (max 100 events/minute) |
| Invite codes without expiry | Old codes remain valid indefinitely | Default 7-day expiry, max_uses enforcement, revocation capability |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Small touch targets during session | Technician wearing gloves can't tap stop/escalate | 56x56dp minimum, prefer 64dp for critical actions |
| Low-contrast UI in session screen | Unreadable in direct sunlight on rooftops | WCAG AAA contrast ratios, dark text on light background, test outdoors |
| AI speaks too long before allowing interruption | Technician wants to ask follow-up but AI won't stop | Handle Gemini interruption events, allow barge-in at any time |
| No visual feedback during AI "thinking" | Technician thinks app froze | Animated indicator showing AI is processing (waveform, pulsing dot) |
| Forcing text input during session | Hands are dirty/occupied, can't type | Audio-first interaction — no typing required during active session |
| Generic error messages on connection failure | Technician doesn't know if it's their network or the service | Distinguish: "No internet" vs "AI service unavailable" vs "Session expired" |

## "Looks Done But Isn't" Checklist

- [ ] **Live session:** Often missing context window compression — verify sessions last >5 minutes with audio+video
- [ ] **Reconnection:** Often missing sessionResumption — verify AI retains context after 30s disconnect
- [ ] **Tool calling:** Often missing timeout handling — verify AI gracefully handles a tool that takes >10s
- [ ] **Auth:** Often missing org_id enforcement in middleware — verify two-org isolation test passes
- [ ] **Knowledge search:** Often missing confidence weighting — verify verified articles rank above unverified
- [ ] **i18n:** Often missing RTL layout — verify Arabic/Hebrew if added later (not in initial 7 languages)
- [ ] **Offline caching:** Often missing cache invalidation — verify cached articles update when new versions are verified
- [ ] **Audio playback:** Often missing interruption handling — verify AI audio stops when technician starts speaking
- [ ] **EU AI Act indicator:** Often dismissible or hidden — verify visible in every session state (portrait, landscape, modal open, keyboard visible)
- [ ] **Session end:** Often missing cleanup — verify WebSocket closed, audio stopped, camera released, session DB row updated

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context window not compressed | LOW | Add compression config to setup message, redeploy |
| Org data leak discovered | HIGH | Immediate hotfix, audit all queries, notify affected orgs, consider breach notification (GDPR Art. 33 — 72 hours) |
| Knowledge base quality decay | MEDIUM | Pause auto-ingestion, bulk-flag unverified articles, adjust confidence scoring weights, rebuild retrieval index |
| Audio latency >2s | MEDIUM | Profile each stage (capture → encode → send → process → receive → decode → play), optimize the bottleneck |
| NativeWind v5 breaking | LOW | Pin to v4.2.3, update styles to Tailwind v3 syntax, migrate later |
| Ephemeral token timing | LOW | Move token request closer to WebSocket open, add retry with fresh token |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Context window compression | Foundation (session setup) | Session lasts >10 minutes with active audio+video |
| Development builds required | Foundation (mobile setup) | Audio recording + camera capture work on physical device |
| Audio latency | Mobile streaming | Round-trip latency <1.5s measured in 10 test sessions |
| Ephemeral token timing | API + token endpoint | Session starts reliably on 3G network simulation |
| Org data isolation | DB schema + tRPC middleware | Two-org integration test passes with zero cross-org leakage |
| KB quality decay | Knowledge base backend | Retrieval ranks verified articles above unverified by default |
| NativeWind instability | Mobile foundation | Choose stable version, verify on both iOS and Android |
| ColPali sidecar | Knowledge base infrastructure | PDF manual uploads produce searchable embeddings in Qdrant |
| Reconnection state loss | Session orchestration | AI retains context after 30s simulated disconnect |
| AI Act indicator | Mobile session UI | Indicator visible in all session states (automated screenshot test) |

## Sources

- Gemini Live API documentation (context window compression, session management, ephemeral tokens)
- Expo SDK 55 release notes (expo-av removal from Expo Go, new expo-audio package)
- Architecture research findings (session resumption handle = 2 hours, not 2 minutes)
- Stack research findings (NativeWind v5 preview status, ColPali Python-only)
- LEGAL-ADMIN.md risk register and regulatory requirements
- TECH-SPEC.md connection flow and security architecture

---
*Pitfalls research for: Real-time multimodal AI copilot for HVAC technicians*
*Researched: 2026-04-03*
