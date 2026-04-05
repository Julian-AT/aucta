# Roadmap: Aucta

## Overview

This roadmap takes Aucta from an empty monorepo to a working real-time AI copilot for HVAC technicians. The journey follows the critical dependency chain: foundational infrastructure and multi-tenant auth first, then the AI tool system that Gemini will call, then the mobile streaming pipeline that delivers the core magic, then session lifecycle and data management, and finally the self-learning knowledge base that creates the long-term competitive moat. Each phase delivers a coherent, verifiable capability that unlocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Auth** - Monorepo, database, auth with orgs/roles/invites, CI pipeline, EAS dev builds
- [ ] **Phase 2: AI Pipeline and Tool System** - Ephemeral tokens, system prompt assembly, tool factory/registry/dispatcher, initial tools
- [x] **Phase 3: Live Streaming Session** - Camera + audio streaming to Gemini Live, spoken guidance, tool calls, reconnection, session UI (completed 2026-04-04)
- [ ] **Phase 4: Session Lifecycle** - Post-session feedback, data persistence, automated summaries, offline caching, content labels
- [ ] **Phase 5: Knowledge Base** - Hybrid search, session ingestion, article compilation, verification queue, health monitoring

## Phase Details

### Phase 1: Foundation and Auth
**Goal**: Technicians can sign up, create or join organizations, and interact with authenticated API endpoints from the mobile app
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password, log in, and session persists across app restarts on mobile
  2. User can create an organization and generate role-assigned invite codes with expiry
  3. Technician can join an organization by entering an invite code or scanning a QR code
  4. tRPC middleware enforces org-scoped access on every endpoint and rate limiting is active on auth and API routes
  5. CI pipeline runs Biome lint, TypeScript typecheck, and Vitest tests; EAS development builds work on physical devices
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 01-01-PLAN.md — Monorepo foundation: Turborepo + Bun workspaces + packages/shared + packages/config
- [x] 01-02-PLAN.md — Database + auth: Drizzle ORM with Neon Postgres, Better Auth with org plugin and RBAC
- [x] 01-03-PLAN.md — API layer: tRPC middleware (auth, org-scope, rate-limit, error-converter) + org and invite routers
- [x] 01-04-PLAN.md — CI + test infrastructure: Vitest workspace config, packages/shared tests, GitHub Actions workflow
- [x] 01-05-PLAN.md — Mobile app foundation: Expo SDK 55, NativeWind v5, theme system, providers, Expo Router layouts
- [x] 01-06-PLAN.md — Mobile screens + EAS: Auth/onboarding screens, home, settings, InviteCodeInput, QRScanner, EAS config

### Phase 2: AI Pipeline and Tool System
**Goal**: The API can issue ephemeral Gemini tokens with locked system prompts and tool declarations, and tools can be dispatched and tested individually
**Depends on**: Phase 1
**Requirements**: TOOL-01, TOOL-02, TOOL-03, TOOL-04, TOOL-06, TOOL-07, TOOL-08, COMP-03, COMP-04, COMP-05
**Success Criteria** (what must be TRUE):
  1. API issues ephemeral Gemini tokens with a layered system prompt and registered tool declarations
  2. lookupErrorCode tool returns correct error meaning, repair steps, and severity for a given manufacturer and error code
  3. logFinding tool records structured observations (category, description, severity) to session metadata
  4. System prompt includes HVAC safety disclaimers, AI scope limitations, and F-Gas EU 2024/573 regulation references
  5. Tool dispatcher resolves Gemini function call events to the correct tool, validates input via Zod, and returns structured responses
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — packages/ai/ foundation: buildTool() factory, system prompt layers (core, HVAC, safety), builder
- [x] 02-02-PLAN.md — Initial tools: lookupErrorCode with static JSON data, logFinding with in-memory store
- [x] 02-03-PLAN.md — Integration: tool registry, dispatcher, ephemeral token tRPC endpoint
- [x] 02-04-PLAN.md — Gap closure: fix ToolDef variance, Modality enum, setTimeout type, unused parameter

### Phase 3: Live Streaming Session
**Goal**: A technician can have a complete real-time AI conversation by pointing their camera at HVAC equipment and speaking naturally
**Depends on**: Phase 2
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07, SESS-08, SESS-09, UX-01, UX-02, UX-03, UX-04, UX-05, UX-07, UX-08, COMP-01, COMP-02, COMP-06
**Success Criteria** (what must be TRUE):
  1. Technician starts a live session within two taps from app launch, sees an AI disclosure, and a non-dismissible AI indicator remains visible throughout
  2. Camera video and microphone audio stream to Gemini and AI spoken guidance plays back through the device speaker in real time
  3. AI auto-detects the technician's language and responds in the same language, tool calls execute mid-conversation without interrupting audio
  4. Session reconnects automatically after network drops with context preserved via sessionResumption handle and exponential backoff
  5. Session UI has glove-friendly touch targets (56x56dp minimum), high-contrast readability in direct sunlight, works in both orientations, and audio/video are streamed to Gemini without being stored on Aucta servers
**Plans**: 7 plans
**UI hint**: yes

Plans:
- [x] 03-01-PLAN.md — Foundation: dependencies, permissions, overlay tokens, test infra, Gemini protocol types, Zustand session store, server-side tool dispatch endpoint
- [x] 03-02-PLAN.md — WebSocket: GeminiConnection class (lifecycle, setup, message parsing, send methods) and reconnection logic (exponential backoff, 2-min timeout)
- [x] 03-03-PLAN.md — Media pipelines: audio playback (PCM 24kHz gapless scheduling), audio capture (PCM 16kHz), frame capture (1 FPS JPEG), tool relay (tRPC dispatch)
- [x] 03-04-PLAN.md — Session UI components: AI indicator, connection status, audio indicator, stop button, AI disclosure modal, end session dialog, connection lost overlay, SessionHUD
- [x] 03-05-PLAN.md — Integration: useGeminiSession orchestration hook, SessionScreen, navigation wiring, device verification checkpoint
- [x] 03-06-PLAN.md — Gap closure: implement AudioCapture microphone pipeline (AudioRecorder) + lazy react-native-audio-api imports
- [x] 03-07-PLAN.md — Gap closure: voice command end session via Gemini tool call + JPEG 768px resize

### Phase 4: Session Lifecycle
**Goal**: Sessions have a complete lifecycle with feedback collection, data persistence, automated summaries, and offline access to past results
**Depends on**: Phase 3
**Requirements**: SESS-10, SESS-11, SESS-12, INFRA-08, UX-06, COMP-07, COMP-08
**Success Criteria** (what must be TRUE):
  1. After ending a session, technician is prompted for feedback (1-5 stars plus optional text note)
  2. Session metadata is persisted: start/end time, duration, language detected, tools used, feedback, and token count
  3. Post-session summary is automatically generated via Inngest background job and labeled as AI-generated content
  4. Recent session summaries and frequently used knowledge articles are cached locally for offline access via MMKV
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md — Schema, DTOs, and repositories: ai_sessions, session_findings, session_tool_calls tables, Zod schemas, repository classes with tests
- [x] 04-02-PLAN.md — Server integration: tRPC session lifecycle endpoints (create/end/feedback/incremental persistence), Inngest summary pipeline with Gemini 2.5 Pro, Bun server handler
- [x] 04-03-PLAN.md — Mobile lifecycle: MMKV offline cache, session store extensions, incremental persistence wiring, feedback screen with star rating, last session card on Home

### Phase 5: Knowledge Base
**Goal**: The platform accumulates organizational HVAC expertise from sessions and serves it back to technicians with confidence-weighted retrieval
**Depends on**: Phase 4
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, KB-08, KB-09, KB-10, TOOL-05, INFRA-07
**Success Criteria** (what must be TRUE):
  1. searchKnowledgeBase tool returns results via hybrid search (BM25 + dense vector) with confidence-weighted ranking from Qdrant
  2. Completed sessions automatically generate candidate knowledge articles through the ingestion and LLM-powered compilation pipeline
  3. Articles have 4-tier confidence levels, flow through a verification queue, and are organized by equipment brand, model, and procedure type
  4. AI responses in live sessions attribute their source confidence level to the technician ("Based on unverified observation..." vs "Per manufacturer documentation...")
  5. Org owners can manually add knowledge articles via API, and health monitoring detects coverage gaps and stale content
**Plans**: TBD

Plans:
- [x] 05-01: TBD
- [x] 05-02: TBD
- [x] 05-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Auth | 6/6 | Executing | - |
| 2. AI Pipeline and Tool System | 3/4 | Gap closure | - |
| 3. Live Streaming Session | 5/7 | Gap closure | - |
| 4. Session Lifecycle | 0/3 | Planning complete | - |
| 5. Knowledge Base | 0/0 | Not started | - |
