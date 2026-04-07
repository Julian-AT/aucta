# Aucta

## What This Is

Aucta is a real-time AI copilot for HVAC technicians. The mobile app streams camera video and microphone audio directly to Google's Gemini 2.5 Flash Live API via WebSocket. Gemini reasons over the multimodal input, calls domain-specific tools (error code lookup, knowledge base search), and streams spoken guidance back in the technician's language. A self-learning knowledge base compounds organizational expertise with every session. A Next.js dashboard (later milestone) gives business owners visibility into team activity, session analytics, and knowledge base management.

## Core Value

A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time — like having a master technician looking over their shoulder on every job.

## Requirements

### Validated

- [x] Ephemeral token system: API issues short-lived tokens so Gemini API key never reaches the client — Validated in Phase 2
- [x] Layered system prompt assembly (core role, HVAC expertise, safety rules, org overlay, knowledge context) — Validated in Phase 2
- [x] Tool system architecture: buildTool() factory, tool registry, tool dispatcher for Gemini function calling — Validated in Phase 2
- [x] Turborepo monorepo with Bun, TypeScript strict, Biome, shared packages (ai, api, db, auth, shared, config) — Validated in Phase 1
- [x] Better Auth with organization plugin, roles (owner/manager/technician), invite codes, RBAC permissions — Validated in Phase 1
- [x] tRPC API with org-scoped middleware, rate limiting via Upstash Redis — Validated in Phase 1
- [x] CI pipeline: Biome lint, TypeScript typecheck, Vitest tests, Turborepo build — Validated in Phase 1
- [x] Live AI session: camera JPEG stream (1 FPS, 768px) + PCM audio (16kHz) → Gemini 2.5 Flash Live via WebSocket → spoken guidance — Validated in Phase 3
- [x] Session orchestration engine: WebSocket lifecycle, reconnection with sessionResumption, audio/video pipelines — Validated in Phase 3
- [x] Session UI: non-dismissible AI indicator, connection status, audio indicator, stop button, end session dialog, connection lost overlay — Validated in Phase 3
- [x] Voice command session end via Gemini endSession tool call — Validated in Phase 3
- [x] EU AI Act Art. 50 compliance: non-dismissible AI indicator during sessions — Validated in Phase 3
- [x] Session lifecycle: DB persistence (ai_sessions, session_findings, session_tool_calls), incremental tool call/finding persistence, feedback collection (1-5 stars) — Validated in Phase 4
- [x] Post-session Inngest summary pipeline with Gemini 2.5 Pro, AI-generated content labeling (COMP-07) — Validated in Phase 4
- [x] MMKV offline cache for recent session summaries (20-session LRU), feedback screen with star rating — Validated in Phase 4
- [x] No emotion recognition or sentiment analysis in any schema (COMP-08) — Validated in Phase 4
- [x] Full knowledge base backend: ingest (session → article), compile (LLM wiki articles), verify (4-tier confidence, review queue), retrieve (hybrid BM25 + dense vector via Qdrant), health (coverage gaps, stale content) — Validated in Phase 5
- [x] Knowledge article schema with 4-tier confidence levels and confidence-weighted search ranking — Validated in Phase 5
- [x] searchKnowledgeBase tool with hybrid search, source attribution, context builder — Validated in Phase 5
- [x] Inngest background jobs for knowledge ingestion, compilation, and health monitoring — Validated in Phase 5
- [x] Knowledge pipeline fully wired end-to-end: all 4 Inngest functions registered, logFinding persistence from mobile, findingsCount in session recap — Validated in Phase 6
- [x] Qdrant vector DB with named dense+sparse vectors for hybrid retrieval — Validated in Phase 5
- [x] Verification queue: tRPC endpoints for review submission, auto-creation on ingestion, confidence promotion on approval — Validated in Phase 5
- [x] Ephemeral token tool enforcement: tool declarations locked in liveConnectConstraints for security-in-depth — Validated in Phase 7
- [x] Settings screen shows real org name and user role from API (no hardcoded placeholders) — Validated in Phase 7
- [x] Dead code cleanup: InMemoryFindingStore removed, stateless logFindingTool via buildTool() — Validated in Phase 7

### Active

- [ ] Expo SDK 55 mobile app with Expo Router, NativeWind v5, camera + audio capture
- [ ] Neon Postgres (EU Frankfurt) with Drizzle ORM, repository pattern, DTO boundaries
- [ ] Glove-friendly touch targets (56x56dp), high-contrast UI, audio-first interaction
- [ ] i18n foundation with react-i18next (en, de, tr, sr, hr, pl, ro)
- [ ] Sentry error tracking + PostHog analytics integration

### Out of Scope

- Web dashboard UI — backend only for now; verification via scripts/CLI until dashboard milestone
- Session history / session explorer UI — mobile and web, deferred
- Analytics dashboard — deferred to dashboard milestone
- Team management UI — deferred to dashboard milestone
- Organization settings UI — deferred to dashboard milestone
- Billing / payments (Stripe, RevenueCat) — deferred until post-validation
- 7 remaining AI tools (getEquipmentSpecs, getWiringDiagram, calculateRefrigerantCharge, checkSafetyRecall, getOrgProcedure, identifyPart, escalateToExpert) — added incrementally
- Multi-agent architecture (DiagnosticAgent, SafetyAuditAgent, SummaryAgent, KnowledgeAgent) — Phase 2
- On-device fallback (Gemma 4 E2B via LiteRT) — Phase 2
- Public REST API — Phase 2
- Session recording & playback — Phase 2
- AR annotation layer — Phase 2-3
- FSM integrations (ServiceTitan, Housecall Pro) — Phase 3
- Landing page — separate Framer project, not in this codebase
- Smart glasses support — future

## Context

**Market:** HVAC businesses in Vienna, Austria (7,650 WKO SHL member businesses). The workforce includes native speakers of Turkish, Serbian, Croatian, Polish, Romanian — multilingual real-time guidance is the core USP.

**Business model:** B2B SaaS. Free during validation (3-6 months, target 50-200 active technicians), then EUR 29/tech/month Professional tier.

**Architecture inspiration:** Tool system modeled on Claude Code's buildTool() + assembleToolPool() pattern. Session orchestration modeled on Claude Code's QueryEngine. Knowledge base inspired by Andrej Karpathy's "LLM Knowledge Bases" + Claude Code's memory system.

**Regulatory landscape:** GDPR (Austria-based, EU data residency), EU AI Act transparency (deadline August 2, 2026), F-Gas EU 2024/573, Product Liability Directive 2024/2853 (transposition by December 9, 2026). Privacy-by-design: audio/video streamed directly to Gemini, never stored on our servers.

**Existing codebase:** Phase 6 complete. Monorepo with full auth system, AI tool pipeline, ephemeral Gemini tokens, system prompt assembly, live streaming session (WebSocket lifecycle, audio/video pipelines, session UI, voice commands), session lifecycle management (DB persistence, incremental tool/finding persistence, feedback collection, Inngest summary pipeline, MMKV offline cache), and self-learning knowledge base fully wired end-to-end (hybrid search, ingestion/compilation pipelines, verification queue, health monitoring, all Inngest functions registered, logFinding persistence from mobile). 6 of 7 milestone phases complete.

## Constraints

- **Tech stack:** Pinned to April 2026 latest stable versions as specified in TECH-SPEC.md (Expo SDK 55, Next.js 16, TypeScript 6, Bun 1.3.x, etc.)
- **Data residency:** All data must remain in EU (Neon Frankfurt, Upstash EU, Qdrant EU)
- **AI model:** Gemini 2.5 Flash Live API for real-time multimodal; ephemeral tokens for API key security
- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Mobile UX:** Two taps max to start session, 56x56dp touch targets, audio-first, works in portrait + landscape, WCAG AAA contrast
- **Compliance:** Non-dismissible AI indicator (EU AI Act), no emotion recognition, AI-generated content labels, aggressive safety disclaimers

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Mobile + core AI first | Get the core magic working before building the business layer | -- Pending |
| Full knowledge base backend, no dashboard UI | KB is the key differentiator; verification can run headless via CLI until dashboard milestone | -- Pending |
| Start with 2-3 tools, not all 10 | Prove the tool architecture with essential tools, expand incrementally | -- Pending |
| Full auth from day one | Better Auth with orgs/roles/invites is foundational — everything depends on org-scoped data | -- Pending |
| Stream-and-discard for audio/video | Eliminates largest GDPR surface area; trades liability evidence for privacy compliance | -- Pending |
| Gemini 2.5 Flash Live (not OpenAI Realtime) | Real-time multimodal via WebSocket, async function calling, auto language detection, 30 HD voices | -- Pending |

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
*Last updated: 2026-04-07 after Phase 7 completion — all v1.0 milestone phases complete*
