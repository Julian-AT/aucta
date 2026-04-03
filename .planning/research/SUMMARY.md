# Project Research Summary

**Project:** Aucta -- HVAC AI Copilot
**Domain:** Real-time multimodal AI copilot (mobile-first, HVAC vertical, B2B SaaS)
**Researched:** 2026-04-03
**Confidence:** HIGH

## Executive Summary

Aucta is a client-direct multimodal streaming application where a mobile device connects directly to Gemini 2.5 Flash Live via WebSocket, streaming camera video and voice audio simultaneously while receiving spoken AI guidance. This is not a traditional request-response app -- it is an always-on, bidirectional streaming system with hard real-time constraints. The recommended architecture uses ephemeral tokens so the mobile device connects directly to Google's AI infrastructure (eliminating your server as a bandwidth bottleneck), while a thin tRPC API layer handles authentication, token issuance, tool execution, and async background jobs. The stack is a Turborepo monorepo with Expo SDK 55 (mobile), Next.js 16 (web dashboard), Drizzle ORM + Neon Postgres (data), Qdrant (vector search), and Inngest (background jobs). Every major technology choice has been validated at specific versions with documented gotchas.

The competitive landscape reveals a clear gap: no existing HVAC connected worker platform offers real-time multimodal reasoning (live camera + voice simultaneously). XOi captures photos but does not reason over them in real time. Aquant is voice/text only. Augmentir requires pre-authored SOPs. This gap is Aucta's core differentiator and must be the center of gravity for Phase 1. The self-learning knowledge base with 4-tier verification is the second major differentiator -- it creates a compounding data moat that competitors cannot replicate without fundamentally changing their architecture. Automatic multilingual support (via Gemini's native language detection) addresses European workforce diversity at zero implementation cost.

The three highest-risk areas are: (1) Gemini Live API is labeled "Preview" and may have breaking changes or pricing shifts; (2) audio/video streaming on React Native has platform-specific gotchas that require EAS development builds from day one and careful latency tuning; and (3) ColPali (the best multimodal document embedding model) is Python-only, requiring a sidecar service for PDF ingestion. All three have documented mitigation strategies. The critical path runs through the mobile streaming pipeline -- getting audio+video capture, WebSocket management, reconnection, and tool call round-trips working is the highest-risk, highest-value work and should be reached as early as possible.

## Key Findings

### Recommended Stack

The stack is well-chosen with HIGH confidence across most areas. Core runtime (Turborepo 2.9, Bun 1.3, TypeScript 6.0) and API layer (tRPC 11, Zod 4, Drizzle 0.45) are all GA and stable. Mobile (Expo SDK 55, React Native 0.83) is released with zero user-facing breaking changes. Version pins are critical: Drizzle must be pinned to `^0.45.0` (a v1.0-beta exists on npm that is not production-ready), and NativeWind should start at v4.2.3 stable (v5 is preview-only).

**Core technologies:**
- **Expo SDK 55 + React Native 0.83**: Mobile framework -- managed workflow with EAS Build, OTA updates, file-based routing via Expo Router
- **Next.js 16.2**: Web dashboard -- Cache Components, Turbopack default, React Compiler stable
- **Gemini 2.5 Flash Live**: Real-time multimodal AI -- sub-second native audio streaming, bidirectional voice/video, async function calling (Preview status)
- **tRPC 11 + Zod 4**: End-to-end type-safe API with SSE subscriptions, unified validation
- **Drizzle ORM 0.45 + Neon Postgres**: 7.4KB ORM with sub-500ms serverless cold starts, EU Frankfurt data residency, PR branch databases
- **Qdrant 1.17**: Vector DB with native multivector support for ColBERT-style hybrid search (dense + sparse)
- **Better Auth 1.5**: Self-hosted auth with org plugin, RBAC, Expo plugin, zero vendor lock-in
- **Inngest 4.1**: Serverless background jobs with step-level retries for post-session processing

**Version-critical warnings:**
- NativeWind: Use v4.2.3 stable, NOT v5 preview
- Drizzle: Pin to `^0.45.0`, do NOT install v1.0-beta
- Gemini Live: Requires `apiVersion: 'v1alpha'` for both Live API and ephemeral tokens
- expo-av: Removed from Expo Go in SDK 55 -- development builds required from day one

### Expected Features

**Must have (table stakes -- 13 features):**
- Voice-first interaction (hands occupied during HVAC work)
- Error code lookup (most common technician question, #1 proof of value)
- Knowledge base / document search (manuals, procedures, troubleshooting)
- Session/work summary generation (technicians hate paperwork)
- Safety disclaimers and scope limitation (EU Product Liability Directive)
- Org-scoped multi-tenancy with roles (B2B SaaS fundamental)
- Offline reference / cached data (basements, rooftops, rural areas)
- Mobile-first design for field conditions (glove-friendly, sunlight-readable)
- Reconnection / session resilience (WebSocket drops are inevitable on job sites)
- Non-dismissible AI indicator (EU AI Act Art. 50, deadline August 2, 2026)
- Invite / onboarding flow (30-second onboarding promise)
- Finding / observation logging (structured record for handoff)

**Should have (differentiators -- in M1):**
- Real-time multimodal reasoning (camera + voice simultaneously) -- THE core differentiator, no competitor has this
- Automatic multilingual support (24+ languages, zero config) -- free from Gemini, core European USP
- Self-learning knowledge base with 4-tier verification -- compounding data moat
- Real-time tool calling mid-conversation -- non-blocking UX, no competitor offers this
- Source attribution with confidence levels -- trust transparency
- EU regulatory compliance as product feature -- genuine moat in European market
- Proactive safety warnings from visual context -- vision-based, beyond static disclaimers

**Defer to v2+:**
- Equipment identification / dataplate OCR (Phase 2 tool)
- Expert escalation with context packaging (Phase 2)
- KB health monitoring dashboard (backend analytics can run without UI)
- Cross-org learning (architecture supports it; active aggregation is Phase 2)
- Workforce analytics dashboard
- Compliance checklists with PDF export
- Parts identification
- FSM integrations (Phase 3)
- On-device AI fallback via Gemma

**Critical path:** Auth (TS-7) --> Voice + Camera session (TS-1, DF-1) --> Tool system (TS-2, DF-4) --> KB backend (TS-3, DF-3) --> Session summaries (TS-5)

### Architecture Approach

The system has three distinct data paths that must be designed independently: a **hot path** (mobile to Gemini Live via WebSocket, sub-second latency for audio/video streaming), a **warm path** (mobile to API server via tRPC for token issuance and tool execution, fast but not streaming), and a **cold path** (API server to Inngest background jobs for post-session summarization and knowledge processing, no latency constraint). The client-direct architecture means audio/video bandwidth scales to zero on your infrastructure regardless of user count.

**Major components:**
1. **packages/shared** -- Zod schemas, DTOs, constants, ErrorWithCode. Zero dependencies. Single source of truth for all data shapes.
2. **packages/db** -- Drizzle schema, migrations, repositories. All database access isolated here. Returns Zod-validated DTOs.
3. **packages/auth** -- Better Auth config with org plugin, RBAC permissions. Depends on db.
4. **packages/ai** -- Tool definitions (buildTool factory), tool registry, tool dispatcher, system prompt builder, knowledge pipeline (ingest/compile/verify/retrieve/health). Depends on shared + db. Must NEVER import tRPC.
5. **packages/api** -- tRPC routers with org-scoped middleware, Inngest background jobs. Depends on all packages.
6. **apps/mobile** -- Gemini WebSocket connection, audio/video pipelines, Zustand session store, session UI. Depends on packages via tRPC client.
7. **apps/web** -- Next.js dashboard, tRPC handler, auth handler, Inngest handler, ephemeral token endpoint.

**Key patterns:**
- Layered system prompt assembly (ordered composable fragments, safety before org customization)
- Event-driven session logging (5-second batched flushes, not per-event)
- Constructor-injected tool context (enables testing with mocked dependencies)
- Flat Zustand store shape (getState/setState outside React for WebSocket callbacks)
- Context window compression MUST be enabled (without it, audio+video sessions die at 2 minutes)

### Critical Pitfalls

1. **Context window compression omission** -- Without `SlidingWindow` compression in the WebSocket setup message, audio+video sessions terminate at ~2 minutes. Must be configured from the very first WebSocket implementation. Recovery cost: LOW (config change), but discovery cost is high if not tested with real streams.

2. **Audio latency death spiral** -- Multiple latency sources compound (buffer sizes, JPEG encoding on main thread, WebSocket queuing, playback buffer underruns) to create 2-5 second delays. Target <1 second from speech to AI response. Profile each pipeline stage independently. Encode JPEG off the main thread.

3. **Org-scoped data leak** -- A single missing `org_id` filter is a trust-destroying, lawsuit-triggering bug. Enforce org_id at the tRPC middleware level, require it as a parameter in every repository method, and run two-org isolation integration tests from the start. Recovery cost: HIGH (audit all queries, GDPR breach notification within 72 hours).

4. **Ephemeral token timing window** -- Tokens have a ~1 minute session start window. Request the token immediately before WebSocket connection, not during UI loading. Add retry logic with a fresh token on authentication errors.

5. **Knowledge base quality decay** -- Without aggressive confidence tagging and weighted retrieval, unverified AI-generated articles drown verified content. All AI-generated content must start as `unverified`. Retrieval must weight confidence level. The AI must attribute its source confidence to the technician.

6. **Expo Go is unusable for core features** -- SDK 55 removed expo-av from Expo Go. Audio recording, camera streaming, and react-native-audio-api all require EAS development builds. Set up dev builds in the first sprint, not as an afterthought.

7. **ColPali requires a Python sidecar** -- No JavaScript SDK exists. Plan for a Docker container or serverless Python function for PDF-to-multivector embedding. Do not block the KB milestone on finding a JS alternative.

## Implications for Roadmap

Based on combined research, the following phase structure is recommended. Phases are ordered by dependency chain and risk: foundational layers first, then the highest-risk/highest-value streaming pipeline, then the knowledge base that creates the long-term moat.

### Phase 1: Foundation and Auth

**Rationale:** Everything is org-scoped. Auth, database schema, shared types, and the tRPC skeleton must exist before any feature can be built or tested. This phase also establishes the development build pipeline (critical because Expo Go cannot test audio/camera).

**Delivers:** A technician can sign up, create/join an org via invite code, and hit authenticated tRPC endpoints from both mobile and web. EAS development builds work on physical devices.

**Addresses:** TS-7 (auth/org/roles), TS-12 (invite/onboarding), project infrastructure

**Avoids:** Pitfall 5 (org data leak -- org_id enforcement built into tRPC middleware from day one), Pitfall 2 (Expo Go limitations -- dev builds configured immediately), Pitfall 7 (NativeWind instability -- start with v4.2.3 stable)

**Stack elements:** Turborepo, Bun, TypeScript 6, Expo SDK 55, Next.js 16, Better Auth 1.5, Drizzle 0.45, Neon Postgres, Upstash Redis, Biome, Vitest, NativeWind 4.2.3

### Phase 2: AI Pipeline and Tool System

**Rationale:** Tools are self-contained and testable in isolation without the mobile streaming pipeline. Building the tool system first means the streaming phase can immediately use real tools instead of stubs. The ephemeral token endpoint and system prompt builder also belong here.

**Delivers:** API can issue ephemeral Gemini tokens with locked system prompts and tool declarations. Tools (lookupErrorCode, logFinding) can be dispatched and tested individually. System prompt assembly works with layered fragments.

**Addresses:** TS-2 (error code lookup), TS-13 (finding logging), DF-4 (real-time tool calling), TS-6 (safety disclaimers via system prompt)

**Avoids:** Pitfall 4 (ephemeral token timing -- token issuance logic designed with retry from the start)

**Stack elements:** @google/genai 1.48, Zod 4, tRPC 11

### Phase 3: Mobile Streaming Pipeline

**Rationale:** This is the highest-risk phase and the core product differentiator. It must be reached early but depends on the token endpoint and tool system from Phase 2. Audio/video capture, WebSocket management, reconnection with session resumption, and tool call round-trips are all implemented here.

**Delivers:** A technician can start a live session, stream camera + audio to Gemini, receive spoken guidance, see tool calls execute in real time, and survive a disconnection/reconnection. This is the "magic demo."

**Addresses:** DF-1 (real-time multimodal), TS-1 (voice-first), DF-2 (multilingual), TS-10 (reconnection), TS-9 (mobile-first UI), TS-11 (AI indicator), DF-12 (proactive safety warnings)

**Avoids:** Pitfall 1 (context window compression -- configured in initial setup message), Pitfall 3 (audio latency -- latency measurement built in from day one), Pitfall 9 (reconnection state loss -- sessionResumption handle cached and used), Pitfall 10 (AI Act indicator -- designed as persistent floating element)

**Stack elements:** expo-camera, expo-audio/expo-av, react-native-audio-api, Zustand 5, MMKV

### Phase 4: Knowledge Base Backend

**Rationale:** The live session works without the knowledge base (Gemini's base knowledge handles general HVAC). The knowledge base is the long-term differentiator and compounding data moat. It can begin in parallel with late Phase 3 work since it primarily touches packages/ai and Qdrant, not the mobile streaming code.

**Delivers:** Full knowledge pipeline: hybrid search (BM25 + dense vector via Qdrant), session-driven ingestion, LLM-powered article compilation, 4-tier confidence verification, health monitoring. The searchKnowledgeBase tool is wired into live sessions.

**Addresses:** TS-3 (knowledge base search), DF-3 (self-learning KB), DF-7 (KB health monitoring backend), DF-8 (source attribution with confidence), TS-5 (session summaries via Inngest), TS-8 (offline cached references)

**Avoids:** Pitfall 6 (KB quality decay -- confidence scoring and weighted retrieval from initial implementation), Pitfall 8 (ColPali sidecar -- Python infrastructure decision made early)

**Stack elements:** Qdrant 1.17, Inngest 4.1, ColPali (Python sidecar)

### Phase 5: Production Readiness and Launch Prep

**Rationale:** With core features working, this phase adds i18n (7 languages are core to the value proposition), observability, CI/CD hardening, E2E tests, and performance optimization. EU regulatory compliance features (GDPR stream-and-discard verification, AI Act indicator audit) are validated end-to-end.

**Delivers:** Production-ready mobile app and web dashboard skeleton. Full CI pipeline. i18n for 7 European languages. Error tracking and analytics. App Store / Play Store submission readiness.

**Addresses:** DF-10 (EU regulatory compliance end-to-end), remaining polish items, TS-8 (offline cache with MMKV)

**Stack elements:** react-i18next, expo-localization, Sentry, PostHog, Maestro, Playwright, EAS Build

### Phase Ordering Rationale

- **Foundation first** because every feature is org-scoped; getting auth and data contracts wrong means rewriting everything built on top. The two-org isolation pattern must be architectural from the start.
- **AI pipeline before mobile streaming** because tools are testable in isolation and the token endpoint is a prerequisite for WebSocket connection. Building tools first means the streaming phase uses real functionality, not mocks.
- **Mobile streaming is the critical path** -- it is the highest-risk work and the core product differentiator. Everything before it is preparation; everything after it adds depth.
- **Knowledge base after streaming** because the live session delivers value without it (Gemini's base HVAC knowledge), but the KB creates the long-term moat. Starting KB ingestion as soon as sessions are working means the knowledge flywheel begins compounding.
- **The knowledge base can partially overlap with late streaming work** since they touch different codebases (packages/ai/knowledge vs apps/mobile/lib/gemini).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Mobile Streaming):** Highest risk. Needs research on: react-native-audio-api AudioBufferQueueSourceNode verification, expo-audio vs expo-av for PCM 16kHz capture, Android foreground service configuration via @notifee, iOS audio session category settings. Platform-specific gotchas are poorly documented.
- **Phase 4 (Knowledge Base):** Needs research on: ColPali sidecar deployment strategy (Modal vs Railway vs Docker), cross-encoder reranking model selection, optimal Qdrant collection configuration for hybrid search at scale, and whether Google's multimodal embedding API is a viable alternative to ColPali.

Phases with standard, well-documented patterns (skip deep research):
- **Phase 1 (Foundation):** Better Auth, Drizzle, tRPC, Expo Router are all well-documented with established patterns.
- **Phase 2 (AI Pipeline):** Tool definition and dispatch is a straightforward factory pattern. Gemini function declaration format is well-documented.
- **Phase 5 (Production Readiness):** i18n, Sentry, PostHog, CI/CD are all commodity concerns with extensive documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified at specific versions with changelogs. Three MEDIUM areas: NativeWind v5 (mitigated by using v4), Gemini Live Preview status, react-native-audio-api pre-1.0. |
| Features | MEDIUM-HIGH | Competitor features verified via web fetches of XOi, Aquant, BrightAI. Augmentir and Intelligent Technician based on competitive analysis docs (less verified). Feature sizing estimates are rough. |
| Architecture | HIGH | Client-direct streaming architecture validated against official Gemini docs. Session management, ephemeral tokens, hybrid search all verified. TECH-SPEC alignment confirmed. |
| Pitfalls | HIGH | Pitfalls derived from verified API documentation, framework release notes, and known architectural constraints. Recovery strategies are concrete. |

**Overall confidence:** HIGH

### Gaps to Address

- **react-native-audio-api AudioBufferQueueSourceNode:** Undocumented in the library's API docs. Must verify existence and streaming PCM capability before committing to this approach. Fallback: native module (Swift/Kotlin) using AVAudioEngine / Android AudioTrack.
- **Gemini Live API pricing at scale:** Live API pricing is significantly higher than standard API ($0.005/min audio input, $0.018/min audio output). A 15-minute session costs ~$0.35-$0.50 in API fees alone. Unit economics need validation against the EUR 29/tech/month price point.
- **ColPali vs hosted multimodal embeddings:** The Python sidecar adds operational complexity. Evaluate whether Google's multimodal embedding API or Jina/Cohere image embeddings provide sufficient quality for document retrieval before committing to the sidecar approach.
- **Gemini Live API stability:** "Preview" label means the API surface may change. Build the connection layer behind a clear abstraction boundary so the implementation can be swapped without touching session logic, tools, or UI.
- **expo-audio (new) vs expo-av (legacy):** SDK 55 introduces expo-audio as the replacement for expo-av. Capability for raw PCM 16kHz recording needs verification. If insufficient, expo-av works via development builds but is on a deprecation path.
- **PostHog RN SDK + Expo SDK 55 compatibility:** Not explicitly confirmed. Test early.
- **Session cost economics:** At $0.35-$0.50 per 15-minute session, a technician doing 5 sessions/day costs ~$1.75-$2.50/day in API fees alone (~$45-$65/month). Against a EUR 29/month price point, API costs could consume 50-75% of revenue. This needs urgent validation -- either negotiate volume pricing with Google, optimize session duration, or adjust pricing tiers.

## Sources

### Primary (HIGH confidence)
- Gemini Live API documentation (connection architecture, audio formats, tool calling, session management, ephemeral tokens, context window compression)
- Qdrant Hybrid Queries documentation (prefetch + fusion, RRF, sparse+dense named vectors, multivector since v1.10)
- Better Auth Organization Plugin documentation (roles, RBAC, invite flow, hooks)
- Expo SDK 55 changelog (expo-av removal, New Architecture default, Xcode 26 requirement)
- tRPC v11 migration guide (breaking changes from v10)
- Zod 4 release documentation (error API changes, new features)
- Drizzle ORM releases (v0.45.2 security fix, v1.0-beta warning)

### Secondary (MEDIUM confidence)
- XOi Technologies homepage (feature set: dataplate OCR, knowledge base, work summaries)
- Aquant platform pages (Service Co-Pilot agents, Roger voice AI, offline mobile)
- BrightAI platform page (edge AI, wearable copilots)
- Inngest step functions documentation (step.run retries, checkpointing)
- PostHog RN SDK releases (v4.2.2, expo-filesystem fix)
- Gemini pricing page (Live API pricing extrapolated from 3.1 Flash Live Preview reference)

### Tertiary (LOW confidence)
- Augmentir features (from LEGAL-ADMIN.md competitive analysis, not verified against current product)
- Intelligent Technician features (single source, could not verify via web)
- FieldMind (may be agricultural, not HVAC -- needs clarification)
- react-native-audio-api AudioBufferQueueSourceNode (undocumented feature, needs verification)

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
