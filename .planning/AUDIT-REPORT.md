# Aucta Deep Audit Report

**Date:** 2026-04-10
**Scope:** Full codebase, all planning docs, research, architecture, competitive landscape, cost economics
**Purpose:** Inform v1.1+ planning with evidence-based recommendations

---

## 1. Executive Summary

Aucta is a real-time AI copilot for HVAC technicians that streams camera + audio to Gemini Live API and returns spoken guidance. v1.0 shipped successfully (60/62 requirements, ~10K LOC, 7 phases in 5 days). The Phase 8-9 upgrades hardened security, extracted a service layer, scaffolded a Next.js dashboard, and added i18n for 7 languages.

**What's genuinely excellent:** EU AI Act compliance woven into every layer (not bolted on), the 4-tier knowledge base architecture with hybrid search, the buildTool() factory pattern, clean repository + service layer separation, and the camera+voice multimodal streaming approach that no competitor offers.

**What requires immediate attention:**

1. **Gemini 3.1 Flash Live dropped async function calling.** Tool calls (error code lookup, KB search) now block the model's response. The codebase targets `gemini-2.5-flash-live-preview` which is being shut down. This is the #1 architectural risk.

2. **Session cost economics are unsustainable at flat pricing.** At $0.35-$0.50/session and EUR 29/month, a technician doing 4 sessions/day exhausts margin in 2 weeks. Tiered pricing or usage caps are mandatory.

3. **MeasureQuick ($49/mo, 100K+ users) is the most direct competitor** and already has AI-assisted diagnostics using live sensor data. Aucta must prove that camera-based reasoning adds value beyond what sensor data provides.

4. **Session resumption is unreliable.** Multiple developer reports of `SessionResumptionUpdate` returning None handles. Plan for clean session restarts, not seamless resumption.

5. **Knowledge pipeline has singleton issues.** Both SessionService and KnowledgeService create new Qdrant clients and embedding services on every call rather than reusing instances.

**Architecture grade: B+ (upgraded from B in v1.0 audit).** The Phase 8 hardening addressed the critical security and structural issues. Remaining gaps are performance optimization (no VAD, no scene detection, no keepalive) and the Gemini version migration.

---

## 2. Architecture Deep-Dive

### What's Genuinely Good

**Server hardening (A):** `apps/server/src/index.ts` (159 lines) is clean. Explicit CORS allowlist with `getAllowedOrigin()`, Zod env validation at startup, structured JSON logger, request IDs, health/ready endpoints, graceful shutdown, Inngest handler created once (not per request). This was one of the biggest v1.0 problems and it's properly fixed.

**Service layer extraction (A-):** Session and Knowledge routers are properly thin -- `session.router.ts` (125 lines) is pure validation + delegation. `SessionService` (211 lines) and `KnowledgeService` (245 lines) contain all business logic, use `ErrorWithCode` for errors, accept dependencies via constructor injection. This is the pattern described in STANDARDS.md and it's consistently applied.

**Tool system (A):** The `buildTool()` factory (`packages/ai/src/tools/base.ts`, 78 lines) is elegant -- `Object.freeze` for immutability, Zod-to-JSON-Schema via `z.toJSONSchema()`, consistent `ToolResult<T>` return type, read-only flag for safety classification. The dispatcher, registry, and individual tools follow the same pattern.

**Prompt architecture (A):** Three composable layers (core role, HVAC expertise, safety rules) totaling ~750 tokens. Deterministic -- no timestamps or random values. This is critical because Gemini 2.5+ implicitly caches repeated system instruction prefixes at 90% discount.

**Repository pattern (A):** 9 repositories, all with `DrizzleClient` via constructor, Zod-validated output, meaningful ID prefixes (`ses_`, `art_`, `fin_`). Drizzle stays contained. No raw queries leak into services or routers.

### What's Theater (Looks Good, Isn't)

**useGeminiSession refactoring (C+):** The hook was refactored from 455 lines into `session-callbacks.ts` + `session-lifecycle.ts` + the hook itself (230 lines). This reduced the line count but didn't solve the fundamental problem: **8 refs** managing interconnected state (`connectionRef`, `playbackRef`, `captureRef`, `frameCaptureRef`, `toolRelayRef`, `endSessionRef`, `isCleaningUp`, `tokenDataRef`). It's still imperative spaghetti, just in more files. A proper state machine (XState or a typed reducer) would make state transitions explicit and testable.

**i18n foundation (C):** 7 locale files exist in `packages/shared/src/i18n/` but only 4 mobile components are converted (AIDisclosure, AIIndicator, ConnectionLost, Feedback). The main SessionScreen, all error messages, all server responses, and the entire dashboard are still hardcoded English. The foundation is there but the "7-language support" claim is premature.

**Dashboard (C-):** `apps/web/` has 5 page stubs (overview, sessions, knowledge, team, settings) with placeholder content. No real data fetching, no charts, no tRPC queries connected, no auth flow. It's a scaffold, not a dashboard. The tRPC provider is wired up but untested.

**WebSocket connection (B-):** `GeminiConnection` (199 lines) implements the core protocol but has no keepalive pings (NAT timeout risk on cellular), no backpressure handling, and **6 console.log/console.error statements** despite STANDARDS.md prohibiting console.log. The `contextWindowCompression: { slidingWindow: {} }` config is present but the implications for session quality aren't tested.

### Architectural Concerns (Ranked)

| # | Concern | Severity | Evidence |
|---|---------|----------|----------|
| 1 | Model targets `gemini-2.5-flash-live-preview` (being shut down) | CRITICAL | `session.service.ts:32` |
| 2 | Tool relay via mobile adds 200-500ms per call | HIGH | Tool flow: Gemini -> mobile WS -> server tRPC -> execute -> mobile -> Gemini |
| 3 | SessionService recreates Qdrant client per `buildToolList()` call | HIGH | `session.service.ts:200-208` |
| 4 | KnowledgeService recreates clients per `embedAndUpsert()` call | HIGH | `knowledge.service.ts:204-206` |
| 5 | No WebSocket keepalive pings | HIGH | `connection.ts` -- no ping/pong implementation |
| 6 | console.log in production code (connection.ts) | MEDIUM | Lines 55, 64, 72, 153, 165, 174 |
| 7 | 8 refs in useGeminiSession -- not a state machine | MEDIUM | `useGeminiSession.ts:31-47` |
| 8 | `z.any()` in dispatchToolCalls input schema | LOW | `session.router.ts:41` |

---

## 3. AI Pipeline Critique (with Cost Model)

### Current Pipeline Architecture

```
Mobile (camera JPEG 1FPS + audio PCM 16kHz)
    | WebSocket (direct to Gemini, not through server)
Gemini 2.5 Flash Live API
    | Spoken guidance (audio PCM 24kHz) streamed back
    | Tool calls sent to mobile -> relayed to server -> results back
```

**What works:** The ephemeral token pattern (single-use, 1-min start window, locked constraints) is sound. The system prompt is deterministic (benefits from implicit caching). The 3-layer prompt architecture is composable and each layer has a clear responsibility.

### Critical Finding: Gemini 3.1 Flash Live

Google released `gemini-3.1-flash-live-preview` (March 2026) as the recommended Live model. The codebase still targets `gemini-2.5-flash-live-preview` which will be deprecated.

**Breaking changes that affect Aucta:**

| Change | Impact on Aucta |
|--------|----------------|
| **Async function calling removed** | Tool calls now block the model until response arrives. The mobile->server->mobile relay adds 200-500ms per tool call during which the model is silent. Urgently needs server-side tool execution. |
| `thinkingLevel` replaces `thinkingBudget` | Minor config change needed |
| `send_client_content` is history-only | Must use `send_realtime_input` for mid-conversation text (already correct in Aucta) |
| Turn coverage defaults changed | May affect audio capture behavior, needs testing |

**Recommendation:** Update to `gemini-3.1-flash-live-preview` AND move tool execution server-side to eliminate the mobile relay latency (which is now synchronous and blocking).

### System Prompt Analysis

The 3-layer system prompt totals ~750 tokens:
- `core-role` (127 tokens): Role definition, communication style, AI disclosure
- `hvac-expertise` (218 tokens): Diagnostic approach, equipment ID, tool usage, terminology
- `safety-rules` (310 tokens): Electrical safety, F-Gas EU 2024/573, competence boundaries, emergency response, disclaimers

**Assessment:** Well-structured. The safety layer is appropriately detailed for EU AI Act compliance. The prompt is deterministic (no dynamic values), which enables Gemini's implicit caching at ~90% discount on repeated prefix tokens.

**Optimization opportunity:** The safety layer could reference a condensed version during sessions and deliver full safety context via tool responses when triggered (e.g., when electrical work is detected). This would save ~200 tokens per session without reducing safety.

### Tool System Assessment

| Tool | Status | Purpose | Quality |
|------|--------|---------|---------|
| `lookupErrorCode` | Implemented | Error code -> manufacturer meaning + steps | Good. Static data. |
| `logFinding` | Implemented | Record safety/maintenance findings | Good. Write-only. |
| `searchKnowledgeBase` | Implemented | Hybrid search on KB | Good but creates new clients per call. |
| 7 planned tools | Not started | See TECH-SPEC | -- |

The `buildTool()` factory and `dispatchToolCalls()` mechanism are solid. The main issue is the tool relay path: Gemini -> mobile WebSocket -> server tRPC -> execute -> response back through the same path. With synchronous function calling in 3.1, this adds blocking latency to every tool call.

**Server-side tool execution** is the #1 performance priority. The ephemeral token constrains the Live API session, but tool execution should happen server-side via a parallel channel, with results injected into the session via `send_client_content` or `send_realtime_input`.

### Cost Model

**Per-session cost breakdown (15 minutes):**

| Component | Rate | Cost |
|-----------|------|------|
| Audio input (15 min) | $0.005/min | $0.075 |
| Audio output (~10 min speech) | $0.018/min | $0.180 |
| Image/video (15 min, 1 FPS) | $0.002/min | $0.030 |
| Text I/O (system prompt, tools) | Variable | ~$0.070 |
| **Total** | | **$0.35-$0.50** |

**Revenue model pressure at EUR 29/month:**

| Sessions/month | API cost | Gross margin |
|----------------|----------|--------------|
| 20 (1/day) | $7-10 | 66-76% |
| 40 (2/day) | $14-20 | 31-52% |
| 60 (3/day) | $21-30 | -3% to 28% |
| 80 (4/day) | $28-40 | -38% to 3% |

**Verdict:** EUR 29/month unlimited is not viable. At 3+ sessions/day, the product loses money.

**Cost optimization levers (combined ~50-60% reduction):**

| Optimization | Saving/session | Effort |
|-------------|---------------|--------|
| Concise audio output (prompt engineering) | -$0.07 | Low |
| Client-side VAD (Silero, skip silence) | -$0.05 | Medium |
| Scene-change detection (skip static frames) | -$0.02 | Medium |
| Session duration reduction (15->11 min avg) | -$0.07 | Low |
| Model routing (tools via cheaper model) | -$0.03 | Medium |
| **Total optimized cost** | | **$0.16-$0.20** |

**Pricing recommendation:** Tiered plans. EUR 29 for 30 sessions/month, EUR 49 for 60, EUR 79 for unlimited. Or hybrid: EUR 19/month base + EUR 0.50/session.

### Inference Tier Applicability

| Tier | Applies to Live API? | Use for |
|------|---------------------|---------|
| Priority | No | N/A |
| Standard | Default (only option for Live) | Live sessions |
| Flex (50% off) | No -- only for generateContent | Background KB processing, summaries |
| Batch (50% off) | No | Session summary generation |

The Flex/Batch tiers are available for background processing via standard Gemini 2.5 Flash, not for Live API sessions. Use them for the KB compilation pipeline, session summarization, and embedding generation.

---

## 4. Knowledge Base Pipeline Critique

### Architecture (Strong)

The KB pipeline implements a 5-phase flywheel:

```
Ingest (session transcripts) -> Compile (LLM structuring) -> Verify (human review)
    -> Retrieve (hybrid search) -> Health (gap/stale/conflict detection)
```

**Strengths:**
- 4-tier confidence model (`unverified` -> `technician_reviewed` -> `expert_approved` -> `manufacturer_sourced`) -- excellent for trust calibration
- Hybrid search (dense + BM25 with RRF fusion) -- state of the art
- Compilation pipeline via Inngest step functions -- retryable, observable
- Health check detects stale articles, coverage gaps, and conflicts
- Auto-linking between related articles

**Implementation quality:**
- `packages/ai/src/knowledge/` has 12 source files + 6 test files covering compile, ingest, retrieve, and health
- Search implements proper RRF with configurable k=60
- Embedding uses Gemini text-embedding model
- Qdrant client properly wrapped with type-safe interface

### Concerns

1. **Singleton anti-pattern:** `KnowledgeService.embedAndUpsert()` creates new `GeminiEmbeddingService` and `QdrantClient` instances on every call (`knowledge.service.ts:204-206`). Same issue in `SessionService.getSearchKnowledgeBaseTool()` (`session.service.ts:200-208`). These should be injected via constructor or lazy-initialized once.

2. **No retry queue for embedding failures:** If Qdrant is down when an article is created, it's logged and the article is flagged but there's no mechanism to retry. The health check can detect this, but there's no automated re-embedding.

3. **Standard RAG, not compiled KB:** The current pipeline chunks and embeds raw article text. The Karpathy Wiki pattern (LLM compilation into structured wiki entries before embedding) would produce denser, more predictable embeddings and lower hallucination risk. This is the #1 KB quality improvement.

4. **No Qdrant tiered multitenancy:** Using pool model with `company_id` payload filter. Qdrant 1.16+ offers tiered multitenancy (shared fallback shard -> dedicated shards for large tenants) which handles scaling transparently.

5. **In-memory filtering in some paths:** The audit noted "fetches all articles then filters in JS" -- this should be verified. The `findByOrgFiltered` method in the repository should push all filtering to SQL.

### Recommended KB Enhancements (Prioritized)

| # | Enhancement | Impact | Effort |
|---|------------|--------|--------|
| 1 | Fix singleton issue (inject clients once) | Reliability, perf | 1h |
| 2 | Add embedding retry queue (Inngest job) | Reliability | 4h |
| 3 | Implement Karpathy Wiki compilation | Quality, retrieval precision | 2-3d |
| 4 | Adopt Qdrant 1.16 tiered multitenancy | Scale, isolation | 1d |
| 5 | Virtual filesystem KB interface (bash-tool) | Retrieval precision | 2-3d |
| 6 | ACORN search for multi-filter queries | Search accuracy (97% vs 53%) | 2h |
| 7 | ASCII folding for multilingual search | i18n quality | 1h |
| 8 | Docling for PDF manual ingestion | Content coverage | 3-5d |

---

## 5. Dashboard Scope Recommendation

### Current State

`apps/web/` is a scaffold: 16 files, 5 page stubs with placeholder content, tRPC provider wired up, no real data fetching, no auth flow, no charts.

### What Business Owners Actually Need (Research-Based)

Based on competitive analysis (MeasureQuick's manager dashboard, XOi's dispatcher tools) and HVAC forum research:

**Must-have (Layer 1):**
1. **Session feed** -- Timeline of recent sessions with status, duration, technician name, equipment type. Owners want to see "is my team using the tool?"
2. **Knowledge base CRUD** -- Create, edit, review, approve articles. This is where the KB verification workflow lives.
3. **Team management** -- Invite technicians, manage roles (owner/admin/technician), view usage per person.
4. **Billing/usage** -- Sessions used this month, cost projection, plan management.

**Differentiating (Layer 2):**
5. **Session playback** -- View tool calls, findings, and AI-generated summary for any session. Not full audio/video replay -- just the structured data.
6. **KB health dashboard** -- Coverage gaps, stale articles, pending reviews, conflict flags. Visualizes the self-learning flywheel.
7. **Analytics** -- Top equipment types, most common error codes, resolution patterns, team performance trends.

**Defer to v1.2+:**
8. Real-time session monitoring (watching a live session from the dashboard)
9. Equipment fleet management
10. Customer-facing reports
11. Integration with FSM tools (ServiceTitan, Housecall Pro)

### Technical Recommendations

- **Next.js 16 with `"use cache"` and PPR** -- Already scaffolded. Use Server Components for data fetching, client components only for interactivity.
- **tRPC SSE subscriptions** for session feed updates -- Built into tRPC 11, works in serverless. But watch Vercel function timeout limits (60s on Pro, 300s on Enterprise).
- **Recharts v3** for analytics -- Lightweight, React-native, good for time series.
- **shadcn/ui** -- Already in the scaffold. Use the dashboard template as a starting point.

---

## 6. Tech Stack Validation

### Keep (Validated)

| Technology | Verdict | Rationale |
|-----------|---------|-----------|
| Turborepo 2.9 | KEEP | Working well, Bun workspace auto-detection, no issues |
| Bun 1.3 | KEEP | Fast installs, server runtime works, Metro compatibility confirmed |
| TypeScript 6 | KEEP | Stable, Go rewrite (TS 7) is not ready yet |
| Expo SDK 55 | KEEP | RN 0.83 zero breaking changes, New Architecture default |
| tRPC 11 | KEEP | End-to-end type safety working, SSE subscriptions available |
| Zod 4 | KEEP | `z.toJSONSchema()` used in buildTool(), stable |
| Drizzle 0.45 | KEEP | Pin to ^0.45, DO NOT upgrade to v1.0-beta |
| Neon Postgres | KEEP | EU Frankfurt, branching for CI, working well |
| Qdrant | KEEP | Multivector, EU hosting, upgrade to 1.16+ for tiered multitenancy |
| Better Auth 1.5 | KEEP | Org RBAC working, Expo plugin, self-hosted |
| Inngest 4.1 | KEEP | Step functions for KB pipeline, free tier sufficient |
| Zustand 5 | KEEP | `getState()`/`setState()` outside React essential for callbacks |
| MMKV 4.3 | KEEP | Fast local storage, working |
| Vitest 4.1 | KEEP | Fast, good DX |
| Biome 2.4 | KEEP | Single tool for lint+format |

### Replace

| Technology | Action | Rationale |
|-----------|--------|-----------|
| `gemini-2.5-flash-live-preview` | REPLACE -> `gemini-3.1-flash-live-preview` | Old model being shut down, 3.1 is current |
| NativeWind v4.2.3 | EVALUATE v5 | v5 may be stable by now; check release status. If still preview, stay on v4. |
| `console.log` in connection.ts | REPLACE -> structured logger | 6 instances violate STANDARDS.md |

### Add

| Technology | Purpose | Priority |
|-----------|---------|----------|
| Silero VAD (JS/WASM port) | Client-side voice activity detection -- reduce silent audio sent to Gemini | HIGH |
| Scene-change detection | Skip static camera frames -- reduce bandwidth/cost | HIGH |
| WebSocket keepalive pings | Prevent NAT timeout on cellular | HIGH |
| expo-two-way-audio (forked) | Better bidirectional audio with AEC, replace current manual audio setup | MEDIUM |
| Sentry (Next.js + RN SDKs) | Error tracking -- production requirement | MEDIUM |
| PostHog (Web + RN SDKs) | Analytics + feature flags -- usage tracking for pricing tiers | MEDIUM |
| GitHub Actions CI | CI pipeline with Turborepo caching | MEDIUM |
| Maestro 2.4 | Mobile E2E tests | LOW |
| Docling (Python sidecar) | PDF manual ingestion for KB | LOW |

### Avoid

| Technology | Rationale (Validated by Research) |
|-----------|----------------------------------|
| LangChain / LlamaIndex | Unnecessary abstraction. Using Gemini SDK directly is simpler and Aucta's pipeline is custom enough that LangChain adds more weight than value. |
| Chroma | Qdrant already handles multivector/ColBERT natively. No reason to switch. |
| OpenAI Realtime API | Now GA with video support -- viable fallback but Gemini has better multilingual support and ephemeral tokens. Keep as contingency. |
| ColPali (immediate) | Python sidecar complexity is high. Defer until Docling proves insufficient for PDF processing. Standard dense embeddings work well for text-first KB. |
| XState | Session state machine complexity doesn't warrant XState. A typed reducer pattern or Zustand state machine slice is sufficient. |

---

## 7. Competitive Landscape

### Market Map

| Company | Funding | Users | Primary Approach | Pricing |
|---------|---------|-------|-----------------|---------|
| **XOi Technologies** | $230M (KKR, 2025) | 1,000+ companies | Visual documentation + asset intelligence + OCR | Enterprise, quote-based |
| **Aquant** | ~$100M+ | Enterprise | Agentic AI for complex equipment service (text/voice) | Outcome-based, enterprise |
| **Augmentir** | ~$40M+ | Enterprise | AR work instructions + skills management | $10+/user/mo |
| **MeasureQuick** | Unknown | 100K+ technicians | Bluetooth sensor data + AI diagnostics | Free / $49 Premier |
| **Trane Tech Assistant** | OEM | Trane dealers | Text-based doc search for Trane/AS products | Included with dealer program |
| **Aucta** | Bootstrap | Zero | Camera + voice -> multimodal AI -> spoken guidance | EUR 29/mo planned |

### Detailed Competitor Analysis

**XOi Technologies** -- Cloud-based field service enablement. Technicians use OCR to scan data plates, access 85,000+ model families from 150+ manufacturers. Focus: visual documentation, asset lifecycle intelligence, guided workflows. They captured $230M from KKR in Feb 2025. Covers HVAC, plumbing, electrical, commercial kitchen. **What they have that Aucta doesn't:** massive equipment database, patented asset intelligence, deep FSM integrations, 15 years of field data. **What Aucta has:** real-time multimodal AI, live spoken guidance, multilingual, self-learning KB.

**Aquant** -- "Agentic AI for Servicing Complex Equipment." Service Co-Pilot with step-by-step troubleshooting from historical service data. Claims 9% higher first-time fix rate, 22% lower service costs. Targets industrial equipment, medical devices, manufacturing -- NOT residential HVAC. Enterprise-only, outcome-based pricing. **What they have:** historical analytics, team scorecards, cost leakage analysis. **What Aucta has:** real-time video analysis, HVAC domain focus, smaller-team accessibility, self-learning KB.

**MeasureQuick** -- **THE most direct competitor.** 100,000+ technicians. Connects to 50+ Bluetooth tool brands. Their 3.6 release added AI Assist (Premier feature) for voice/text diagnostic queries using live readings. $49/user/month for Premier. 19-subsystem pass/fail analysis, System Vitals scoring. **What they have that Aucta doesn't:** direct sensor data integration, 100K user base, established trust. **What Aucta has:** real-time camera-based visual reasoning, multilingual, self-learning KB that compounds. **This is the competitive benchmark.**

**Trane Technologies Tech Assistant** (Sept 2025) -- AI assistant in the Trane/AS dealer app. Text-based product documentation search. Limited to Trane/AS products. Significant because major OEMs are building AI into their dealer ecosystems, potentially locking out third-party tools.

### Aucta's Competitive Position

**Unique wedge:** No competitor streams live camera + audio to a multimodal AI for real-time spoken diagnostic guidance in the technician's native language. This is genuinely novel.

**Primary risk:** Must prove that camera-based visual reasoning adds diagnostic value beyond what sensor data (MeasureQuick) and text-based lookup (XOi, Trane) provide. The answer must be: equipment model identification, visual fault detection (ice buildup, oil stains, wire damage), nameplate reading, and wiring diagram interpretation.

**Positioning guidance from forum research:**
- Technicians are skeptical of AI -- position as "master technician over your shoulder" not "AI that diagnoses for you"
- Hands-free, voice-first is essential -- can't type with gloved/dirty hands
- One wrong diagnosis destroys trust -- accuracy > speed
- $49/mo is the benchmark (MeasureQuick Premier)
- Documentation that proves work quality to customers is highly valued

### Competitive Moat Strategy

1. **Self-learning KB** -- Compounds with usage. After 6 months of a 50-person team, switching costs increase dramatically.
2. **Multilingual** -- Serving Eastern European markets (de, tr, sr, hr, pl, ro) where competitors don't operate.
3. **Camera-based visual reasoning** -- Must continuously demonstrate value: equipment ID, fault detection, nameplate OCR, wiring interpretation.
4. **EU AI Act compliance** -- First-mover advantage in EU-compliant AI field service tools.

---

## 8. Innovation Opportunities (Ranked by Impact/Effort)

### Tier 1: High Impact, Low-Medium Effort

| # | Innovation | Impact | Effort | Description |
|---|-----------|--------|--------|-------------|
| 1 | **Proactive visual recognition** | HIGH | Medium | When the camera sees equipment, auto-identify manufacturer/model from nameplate and preload relevant KB articles. Don't wait for the technician to ask. |
| 2 | **Session intelligence report** | HIGH | Medium | Post-session: auto-generated report with findings, error codes, tool calls, and AI-suggested follow-up actions. Send as email to business owner. |
| 3 | **Knowledge compounding visualization** | HIGH | Low | Show the business owner: "Your team's KB grew by 12 articles this month. 3 were promoted to expert-approved. Coverage: 78%." |
| 4 | **Concise output prompting** | MEDIUM | Low | System prompt optimization: "Respond in 1-2 sentences during active work." Reduces audio output cost by ~40%. |

### Tier 2: High Impact, High Effort

| # | Innovation | Impact | Effort | Description |
|---|-----------|--------|--------|-------------|
| 5 | **Server-side tool execution** | HIGH | 2d | Eliminate the mobile relay for tool calls. Critical now that 3.1 uses synchronous function calling. |
| 6 | **Karpathy Wiki compilation** | HIGH | 2-3d | LLM-process raw articles into structured wiki entries before embedding. Denser embeddings, lower hallucination. |
| 7 | **Virtual filesystem KB** | HIGH | 2-3d | bash-tool over Qdrant. Agent can `grep`, `cat`, `find` for exact matches instead of relying solely on vector similarity. |
| 8 | **Context preloading** | MEDIUM | 1d | Before session starts: technician selects equipment type -> preload relevant KB context -> faster first response. |

### Tier 3: Medium Impact, Low Effort

| # | Innovation | Impact | Effort | Description |
|---|-----------|--------|--------|-------------|
| 9 | **Haptic feedback** | MEDIUM | Low | Subtle vibration on state transitions (listening -> processing -> speaking). Critical for hands-busy technicians. |
| 10 | **Source citations** | MEDIUM | Low | When AI gives guidance based on a KB article, surface the article title as a tappable reference. Builds trust. |
| 11 | **Session cost display** | LOW | Low | Show estimated cost per session to the business owner. Transparency builds trust for usage-based pricing. |

### Tier 4: Speculative / v1.2+

| # | Innovation | Impact | Effort | Description |
|---|-----------|--------|--------|-------------|
| 12 | Edge AI equipment ID (YOLO) | HIGH | High | On-device equipment identification. Eliminates frame sends for model identification. |
| 13 | Offline intelligence | MEDIUM | High | MMKV-cached KB subset + on-device small model for basic diagnostics when offline. |
| 14 | Multi-technician session | MEDIUM | High | Senior tech joins junior's session remotely, sees same camera feed, can guide via voice. |
| 15 | Bluetooth sensor integration | HIGH | High | Connect to MeasureQuick/Fieldpiece instruments via BLE. Combine sensor readings with visual reasoning. Neutralizes MeasureQuick's advantage. |

---

## 9. Risk Register

### Technical Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Gemini Live API remains Preview forever (or breaks) | HIGH | Medium | Abstract connection layer. Maintain OpenAI Realtime as fallback (now GA with video). Update to 3.1 ASAP. |
| Async function calling not restored in future Live versions | HIGH | Medium | Server-side tool execution eliminates dependency on async calling. |
| Session resumption unreliable | MEDIUM | High | Design for clean session restart. Buffer last 30s of context. Don't promise seamless reconnection. |
| expo-two-way-audio unmaintained (1 contributor, last commit Jan 2025) | MEDIUM | High | Fork and maintain internally. Plan for native module debugging. |
| NativeWind v5 preview stability | LOW | Medium | Stay on v4.2.3. Upgrade when v5 reaches RC. |

### Business Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Session costs exceed revenue at flat EUR 29/month | CRITICAL | High | Tiered pricing (30/60/unlimited sessions). Usage caps mandatory. |
| MeasureQuick's 100K user base + AI Assist captures the market | HIGH | Medium | Differentiate on visual reasoning + multilingual + self-learning KB. |
| Trane/Carrier/Lennox build AI into dealer apps (OEM lock-in) | HIGH | Medium | Equipment-agnostic positioning. KB covers ALL brands. |
| Technician adoption resistance | MEDIUM | High | Position as assistant not replacement. First-time-fix-rate data. |
| EU AI Act compliance gaps discovered late | LOW | Low | Already first-class. Add audit trail logging. |

### Regulatory Risks

| Risk | Severity | Deadline | Status |
|------|----------|----------|--------|
| EU AI Act transparency requirements | HIGH | Aug 2, 2026 | Compliant (non-dismissible AI indicator, disclosure, safety disclaimers) |
| Product Liability Directive | HIGH | Dec 9, 2026 | Need legal review of liability for AI-generated HVAC guidance |
| GDPR: session data across Postgres + Qdrant + MMKV | MEDIUM | Ongoing | EU data residency OK. Need clear retention policy and cross-store deletion workflow. |

---

## 10. Prioritized Action Plan

### P0 -- Before Next Deployment (blocking)

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 1 | Update model to `gemini-3.1-flash-live-preview` | 2h | Current model being deprecated |
| 2 | Fix synchronous function calling (server-side tool execution) | 2d | 3.1 dropped async calling; tool relay now blocks model |
| 3 | Fix singleton issues (SessionService/KnowledgeService client creation) | 1h | New Qdrant + embedding clients created per call |
| 4 | Replace console.log in connection.ts with structured logger | 30m | 6 instances violate standards |
| 5 | Implement tiered pricing model (sessions/month caps) | 1d | EUR 29 unlimited is unsustainable |

### P1 -- Core Quality (v1.1 completion)

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 6 | Add WebSocket keepalive pings | 2h | Prevent NAT timeout on cellular |
| 7 | Implement client-side VAD (Silero WASM) | 2d | ~65% reduction in silent audio sent |
| 8 | Scene-change detection for adaptive frame capture | 1d | ~70-80% fewer frames during static scenes |
| 9 | Complete i18n extraction (all screens, error messages) | 2d | Only 4/20+ components converted |
| 10 | Dashboard: connect real data (session feed, KB CRUD, team mgmt) | 3-4d | Currently placeholder stubs |
| 11 | Add proactive visual recognition (equipment auto-ID) | 2d | Differentiating feature |

### P2 -- Knowledge Quality & Performance

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 12 | Implement Karpathy Wiki compilation pipeline | 2-3d | Better retrieval, lower hallucination |
| 13 | Add embedding retry queue via Inngest | 4h | Silent failures degrade KB |
| 14 | Adopt Qdrant 1.16 tiered multitenancy | 1d | Transparent scaling |
| 15 | Enable ACORN search + ASCII folding | 2h | Multi-filter accuracy + multilingual |
| 16 | System prompt optimization (concise output) | 2h | ~40% audio output cost reduction |
| 17 | Use Flex/Batch tier for background KB processing | 2h | 50% cost savings on compilation |

### P3 -- DX & Observability

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 18 | GitHub Actions CI with Turborepo caching | 1d | No CI currently |
| 19 | Sentry integration (Next.js + RN SDKs) | 1d | No error tracking |
| 20 | PostHog integration (usage analytics) | 1d | Need usage data for pricing |
| 21 | Maestro E2E tests for critical path | 2d | Zero E2E tests |
| 22 | Session intelligence email reports | 1d | Post-session value for owners |
| 23 | Haptic feedback on state transitions | 2h | UX for hands-busy technicians |

### P4 -- Future Differentiators (v1.2+)

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 24 | Virtual filesystem KB (bash-tool over Qdrant) | 2-3d | Exact-match retrieval |
| 25 | Docling PDF ingestion sidecar | 3-5d | Process HVAC manuals |
| 26 | Context preloading (equipment selection before session) | 1d | Faster first response |
| 27 | Fork expo-two-way-audio + add 24kHz playback | 2d | Better audio, no JS resampling |
| 28 | Source citation UI (tappable KB references) | 1d | Trust building |
| 29 | Edge AI equipment ID (YOLO) | 5d+ | On-device identification |
| 30 | Bluetooth sensor integration | 5d+ | Neutralize MeasureQuick |

---

## Appendix A: Codebase Statistics

| Package | Source Files | Test Files | Estimated LOC |
|---------|------------|-----------|---------------|
| packages/ai | 20 | 10 | ~2,800 |
| packages/api | 14 | 6 | ~1,800 |
| packages/db | 15 | 7 | ~2,200 |
| packages/shared | 17 | 4 | ~1,600 |
| packages/auth | ~3 | 0 | ~300 |
| apps/mobile | ~25 | 6 | ~3,500 |
| apps/server | 1 | 0 | 159 |
| apps/web | 10 | 0 | ~400 |
| **Total** | **~105** | **~33** | **~12,800** |

## Appendix B: Key Source File References

| File | Lines | Role | Status |
|------|-------|------|--------|
| `apps/server/src/index.ts` | 159 | Server entry point | Good (hardened in Phase 8) |
| `packages/api/src/services/session.service.ts` | 211 | Session business logic | Good (singleton issue L200-208) |
| `packages/api/src/services/knowledge.service.ts` | 245 | KB business logic | Good (singleton issue L204-206) |
| `packages/api/src/routers/session.router.ts` | 125 | Session tRPC router | Good (thin wrapper) |
| `apps/mobile/hooks/useGeminiSession.ts` | 230 | Session orchestration | Needs state machine |
| `apps/mobile/lib/gemini/connection.ts` | 199 | WebSocket connection | Has console.log, no keepalive |
| `packages/ai/src/tools/base.ts` | 78 | Tool factory | Excellent |
| `packages/ai/src/prompts/builder.ts` | 13 | Prompt composition | Clean |

## Appendix C: Research Sources

- Gemini Live API docs: https://ai.google.dev/gemini-api/docs/live (3.1 Flash Live)
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini inference tiers: https://ai.google.dev/gemini-api/docs/flex-inference
- Qdrant 1.16: https://qdrant.tech/blog/qdrant-1.16.x/
- Karpathy LLM Wiki: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- bash-tool: https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash
- ChromaFs: https://www.mintlify.com/blog/how-we-built-a-virtual-filesystem-for-our-assistant
- expo-two-way-audio: https://github.com/speechmatics/expo-two-way-audio
- XOi Technologies: https://www.xoi.io/
- MeasureQuick: https://www.measurequick.com/
- Aquant: https://www.aquant.ai/
- Augmentir: https://www.augmentir.com/
