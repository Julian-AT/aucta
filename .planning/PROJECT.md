# Aucta

## Current Milestone: v1.1 Market-Ready

**Goal:** Transform v1.0 MVP into a deployable, cost-sustainable product that a 10-person HVAC team can use daily without hitting performance, cost, or reliability walls.

**Success criteria:** A technician starts a session in <5s, gets spoken guidance with tool-augmented answers in <1s latency, sessions cost <$0.25, the dashboard shows real usage data, and the knowledge base self-improves with every session.

**Phases:** 6 phases (8-13), 2 completed, 4 remaining. Each phase has Layer 1 (functional minimum) and Layer 2 (wow factor) deliverables.

**Target features:**
- Phase 10: Gemini 3.1 Flash Live migration, server-side tool execution, singleton fix, WebSocket keepalive, client-side VAD, scene-change detection, tiered pricing
- Phase 11: Dashboard with real data (auth flow, session feed, KB CRUD, team management, billing, i18n completion, analytics)
- Phase 12: Knowledge Pipeline v2 (Karpathy Wiki compilation, embedding retry queue, Qdrant 1.16 multitenancy, ACORN search, source citations)
- Phase 13: DX & Launch Readiness (GitHub Actions CI, Sentry, Maestro E2E, PostHog, session intelligence emails, haptic feedback)

> **GSD Context:** Before working on any phase, read `.planning/AUDIT-REPORT.md` (architecture critique, cost model, competitive landscape, 30-item action plan) and `.planning/EVAL-FRAMEWORK.md` (25 AI quality test scenarios with pass criteria). These documents inform scope, priorities, and verification criteria for every phase. See also: `.planning/research/SUPPLEMENTAL-RESEARCH-REPORT.md` (Gemini Flex/Batch, Qdrant 1.16, Karpathy Wiki, Silero VAD), `.planning/research/PITFALLS.md` (known gotchas), `STANDARDS.md` (code conventions).

## What This Is

Aucta is a real-time AI copilot for HVAC technicians. The mobile app streams camera video and microphone audio directly to Google's Gemini 3.1 Flash Live API via WebSocket. Gemini reasons over the multimodal input, calls domain-specific tools (error code lookup, knowledge base search, finding logging) server-side, and streams spoken guidance back in the technician's language. A self-learning knowledge base compounds organizational expertise with every session. A Next.js dashboard gives business owners visibility into team activity, session analytics, and knowledge base management.

## Core Value

A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time — like having a master technician looking over their shoulder on every job.

## Requirements

### Validated

- ✓ Turborepo monorepo with Bun, TypeScript strict, Biome, shared packages (ai, api, db, auth, shared, config) — v1.0
- ✓ Better Auth with organization plugin, roles (owner/manager/technician), invite codes, RBAC permissions — v1.0
- ✓ tRPC API with org-scoped middleware, rate limiting via Upstash Redis — v1.0
- ✓ CI pipeline: Biome lint, TypeScript typecheck, Vitest tests, Turborepo build — v1.0
- ✓ Ephemeral token system: API issues short-lived tokens so Gemini API key never reaches the client — v1.0
- ✓ Layered system prompt assembly (core role, HVAC expertise, safety rules, org overlay, knowledge context) — v1.0
- ✓ Tool system architecture: buildTool() factory, tool registry, tool dispatcher for Gemini function calling — v1.0
- ✓ Ephemeral token tool enforcement: tool declarations locked in liveConnectConstraints — v1.0
- ✓ Live AI session: camera JPEG stream (1 FPS, 768px) + PCM audio (16kHz) → Gemini Flash Live → spoken guidance — v1.0
- ✓ Session orchestration engine: WebSocket lifecycle, reconnection with sessionResumption, audio/video pipelines — v1.0
- ✓ Session UI: non-dismissible AI indicator, connection status, audio indicator, stop button, end session dialog, connection lost overlay — v1.0
- ✓ Voice command session end via Gemini endSession tool call — v1.0
- ✓ EU AI Act Art. 50 compliance: non-dismissible AI indicator during sessions — v1.0
- ✓ Glove-friendly touch targets (56x56dp), high-contrast UI (WCAG AAA), audio-first interaction — v1.0
- ✓ Session lifecycle: DB persistence (ai_sessions, session_findings, session_tool_calls), incremental persistence, feedback (1-5 stars) — v1.0
- ✓ Post-session Inngest summary pipeline with Gemini 2.5 Pro, AI-generated content labeling — v1.0
- ✓ MMKV offline cache for recent session summaries (20-session LRU) — v1.0
- ✓ No emotion recognition or sentiment analysis (COMP-08) — v1.0
- ✓ Knowledge article schema with 4-tier confidence levels and confidence-weighted search ranking — v1.0
- ✓ Hybrid BM25 + dense vector search via Qdrant with org-scoped filtering — v1.0
- ✓ searchKnowledgeBase tool with source attribution and context builder — v1.0
- ✓ Session ingestion → LLM article compilation → auto-backlinks pipeline — v1.0
- ✓ Verification queue: review submission, auto-creation on ingestion, confidence promotion — v1.0
- ✓ Knowledge health monitoring: coverage gaps, stale content, daily cron — v1.0
- ✓ Knowledge pipeline fully wired end-to-end: all Inngest functions registered, logFinding persistence from mobile — v1.0
- ✓ Settings screen shows real org name and user role from API — v1.0
- ✓ Dead code cleanup: InMemoryFindingStore removed, stateless logFindingTool — v1.0
- ✓ Stream-and-discard architecture: no audio/video stored on our servers — v1.0
- ✓ Safety disclaimers, F-Gas EU 2024/573 references, AI scope limitations in system prompt — v1.0

### Active (v1.1)

- [ ] Gemini 3.1 Flash Live migration (replacing deprecated 2.5 preview model)
- [ ] Server-side tool execution (Gemini 3.1 dropped async function calling — tool calls block, must execute server-side)
- [ ] Singleton anti-pattern fix (SessionService/KnowledgeService constructor injection)
- [ ] WebSocket keepalive pings (bi-directional, 30s interval, auto-reconnect)
- [ ] Client-side VAD (Silero WASM, ~65% audio input reduction)
- [ ] Scene-change detection (frame differencing, ~70% fewer static frames)
- [ ] Tiered pricing enforcement (EUR 29/30 sessions, EUR 49/60, EUR 79/unlimited)
- [ ] i18n completion (all screens, all error messages, all server responses use t())
- [ ] Dashboard auth flow (Better Auth web: login, signup, org creation, invite)
- [ ] Dashboard session feed (real-time list, filterable, paginated)
- [ ] Dashboard KB CRUD (create, edit, delete articles, verification status, markdown editor)
- [ ] Dashboard team management (invite, roles, per-person session count)
- [ ] Dashboard billing & usage (sessions used, cost projection, plan tier)
- [ ] Sentry error tracking (Next.js + React Native SDKs, source maps, alerts)
- [ ] GitHub Actions CI (Turborepo-cached: lint, type-check, test, build)
- [ ] Maestro E2E critical path (launch → login → session → guidance → end → summary)

### Active (v1.2+)

- [ ] KB Pipeline v2: Karpathy Wiki compilation (compile before embed), embedding retry queue, Qdrant 1.16 multitenancy, ACORN search, Flex/Batch tier for background processing
- [ ] Source citations in session (article title as tappable reference)
- [ ] Proactive visual recognition (camera auto-identifies equipment, preloads KB articles)
- [ ] Context preloading (technician selects equipment type before session)
- [ ] Virtual filesystem KB (bash-tool: grep, cat, find over Qdrant for hybrid retrieval)
- [ ] Docling PDF ingestion (Python sidecar: HVAC manufacturer PDFs → structured articles)
- [ ] BLE sensor integration (Fieldpiece/testo: temperature, pressure, superheat/subcool)
- [ ] Combined visual + sensor reasoning (camera frames + sensor readings)
- [ ] Edge AI equipment ID (YOLO on-device, <500ms)
- [ ] FSM integration (ServiceTitan API: sessions linked to work orders)
- [ ] Customer-facing session report (exportable PDF, white-labeled)
- [ ] PostHog analytics (session events, feature flags, funnels)
- [ ] Session intelligence email (post-session findings + AI follow-ups to owner)

### Out of Scope

- On-device AI fallback (Gemma 4 E2B via LiteRT) — wait for Gemini Live to prove limitations
- Public REST API — no external integrations needed yet
- Session recording & playback — GDPR complexity, not core to copilot value
- AR annotation layer — interesting but not needed for initial validation
- FSM integrations (ServiceTitan, Housecall Pro) — complement, don't compete
- Billing / payments (Stripe, RevenueCat) — free during validation phase
- Multi-agent architecture — single Gemini session sufficient for v1 use cases
- Landing page — separate Framer project, not in this codebase
- Smart glasses support — smartphone-only eliminates adoption barriers
- Pre-authored SOP/workflow builder — AI reasons in real time, no content investment needed
- Gamification / leaderboards — creates perverse incentives, ruins trust
- In-app per-session billing — discourages usage
- Real-time chat between technicians — not core to copilot value
- Video call / screen sharing — technicians can use existing tools
- White-labeling — enterprise tier, future consideration
- Emotion recognition / sentiment analysis — EU AI Act explicitly prohibits workplace emotion recognition

## Context

**Shipped:** v1.0 MVP on 2026-04-07. 7 phases, 30 plans, 22,867 LOC TypeScript across 374 files.

**Tech stack (production):** Turborepo + Bun monorepo, Expo SDK 55 (NativeWind v5, Expo Router), tRPC 11, Drizzle ORM 0.45.x, Neon Postgres (EU Frankfurt), Upstash Redis (EU), Qdrant (EU), Better Auth 1.5.x, Inngest 4.1.x, Gemini 3.1 Flash Live via @google/genai, Zustand 5, MMKV, Vitest 4, Biome 2.4.

**Architecture:** 6 packages (ai, api, db, auth, shared, config) + 1 app (mobile, web planned for v1.1). Repository pattern with Drizzle in repositories, Zod-validated DTOs at boundaries, constructor injection, vertical slices. Tools use buildTool() factory pattern. Sessions use stream-and-discard for privacy.

**Market:** HVAC businesses in Vienna, Austria (7,650 WKO SHL member businesses). Multilingual workforce (Turkish, Serbian, Croatian, Polish, Romanian) — real-time guidance in native language is the core USP.

**Business model:** B2B SaaS. Tiered pricing: EUR 29/month (30 sessions), EUR 49/month (60 sessions), EUR 79/month (unlimited). Free during validation (3-6 months, target 50-200 active technicians). Session cost target: <$0.25 (requires VAD, scene-change detection, Flex tier optimization).

**Regulatory landscape:** GDPR (Austria-based, EU data residency), EU AI Act transparency (deadline August 2, 2026), F-Gas EU 2024/573, Product Liability Directive 2024/2853 (transposition by December 9, 2026).

**Known risks:**
- Gemini Live API is labeled "Preview" — may have breaking changes or pricing shifts
- Gemini 3.1 dropped async function calling — server-side tool execution is mandatory (P0 blocker)
- Session cost economics: $0.35-$0.50 per 15-min session, must optimize to <$0.25 via VAD, scene detection, Flex tier
- Session resumption unreliable per developer reports — design for clean restart
- MeasureQuick ($49/mo, 100K+ users) is primary competitor — see AUDIT-REPORT.md competitive landscape
- NativeWind v5 is preview (v5.0.0-preview.3) — risk from pre-release package

## Constraints

- **Tech stack:** Pinned to April 2026 latest stable versions as specified in TECH-SPEC.md (Expo SDK 55, Next.js 16, TypeScript 6, Bun 1.3.x, etc.)
- **Data residency:** All data must remain in EU (Neon Frankfurt, Upstash EU, Qdrant EU)
- **AI model:** Gemini 3.1 Flash Live API for real-time multimodal; ephemeral tokens for API key security; server-side tool execution (3.1 dropped async function calling)
- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Mobile UX:** Two taps max to start session, 56x56dp touch targets, audio-first, works in portrait + landscape, WCAG AAA contrast
- **Compliance:** Non-dismissible AI indicator (EU AI Act), no emotion recognition, AI-generated content labels, aggressive safety disclaimers

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mobile + core AI first | Get the core magic working before building the business layer | ✓ Good — shipped full mobile copilot in 5 days, dashboard deferred to v1.1 |
| Full knowledge base backend, no dashboard UI | KB is the key differentiator; verification can run headless via CLI until dashboard milestone | ✓ Good — KB pipeline fully wired, verification queue works headless |
| Start with 2-3 tools, not all 10 | Prove the tool architecture with essential tools, expand incrementally | ✓ Good — 3 tools (lookupErrorCode, logFinding, searchKnowledgeBase) cover core use case |
| Full auth from day one | Better Auth with orgs/roles/invites is foundational — everything depends on org-scoped data | ✓ Good — org-scoped middleware catches all cross-tenant access |
| Stream-and-discard for audio/video | Eliminates largest GDPR surface area; trades liability evidence for privacy compliance | ✓ Good — verified in Phase 3, no audio/video stored |
| Gemini 2.5 → 3.1 Flash Live | Real-time multimodal via WebSocket, auto language detection, 30 HD voices. 3.1 migration required (2.5 deprecated) | ⚠️ Active — "Preview" label, 3.1 dropped async function calling → server-side tool execution mandatory |
| NativeWind v5 preview over v4 stable | User override of v4.2.3 stable recommendation — wants latest features | ⚠️ Revisit — pre-release dependency adds upgrade risk |
| Tiered pricing over flat rate | Audit showed $0.35-$0.50/session unsustainable at EUR 29 flat. Tiered: EUR 29 (30), EUR 49 (60), EUR 79 (unlimited) | ✓ Decided — economics validated in AUDIT-REPORT.md cost model |
| Server-side tool execution | Gemini 3.1 dropped async function calling — tool calls block. Mobile relay adds 200-500ms dead air | ⚠️ Active — P0 for Phase 10, requires WebSocket relay architecture |
| Karpathy Wiki for KB v2 | LLM compilation before embedding produces denser embeddings and lower hallucination | Planned — Phase 12 |
| Qdrant 1.16 tiered multitenancy | Shared fallback shard for small tenants + dedicated shards for >1000 articles | Planned — Phase 12 |
| No FK constraints to Better Auth tables | Application-layer referential integrity to avoid coupling with Better Auth schema | ✓ Good — clean separation, no migration conflicts |
| Inngest for background jobs (not BullMQ) | Serverless-native, runs on Vercel, no Redis infra needed for job queues | ✓ Good — session summary + knowledge pipeline both use Inngest |
| Zustand over Redux | getState()/setState() outside React for WebSocket callbacks | ✓ Good — essential for audio/WebSocket callbacks outside render cycle |
| Constructor injection throughout | Testability and decoupling without DI container overhead | ✓ Good — all services/repos testable with mock dependencies |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after deep audit, milestones revised with Layer 1/Layer 2 structure*
