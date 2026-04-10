# Roadmap: Aucta

## Overview

This roadmap takes Aucta from a working v1.0 MVP to a market-ready product (v1.1) and then to competitive differentiation (v1.2). v1.1 addresses the critical gaps identified in the deep audit: Gemini 3.1 migration, cost sustainability, dashboard completion, knowledge pipeline quality, and production infrastructure. Each phase delivers a coherent, verifiable capability that unlocks the next.

## Reference Documents (MUST READ)

Before any phase work (discuss, research, plan, execute, verify), GSD agents MUST read these files for context:

| Document | Path | Use For |
|----------|------|---------|
| **Audit Report** | `.planning/AUDIT-REPORT.md` | Architecture critique (Section 2), AI pipeline cost model (Section 3), KB pipeline gaps (Section 4), dashboard scope (Section 5), tech stack validation (Section 6), competitive landscape — MeasureQuick, XOi, Aquant (Section 7), innovation opportunities ranked by impact/effort (Section 8), risk register (Section 9), 30-item prioritized action plan (Section 10) |
| **Eval Framework** | `.planning/EVAL-FRAMEWORK.md` | 25 AI quality test scenarios across 6 categories (safety, tool use, knowledge retrieval, multilingual, UX, edge cases). Defines pass criteria for tool calls, safety boundaries, multilingual behavior, and scoring weights. Use during plan and verify steps to ensure deliverables meet eval criteria. |
| **Supplemental Research** | `.planning/research/SUPPLEMENTAL-RESEARCH-REPORT.md` | Gemini inference tiers (Flex/Batch/Priority), Qdrant 1.16 tiered multitenancy (ACORN, ASCII folding), Karpathy Wiki compilation pattern, expo-two-way-audio evaluation, Silero VAD, mobile UX patterns |
| **Pitfalls** | `.planning/research/PITFALLS.md` | Known gotchas for this codebase — CORS migration, Bun/Metro compat, NativeWind v5 instability, Expo SDK 55 breaking changes |
| **Standards** | `STANDARDS.md` | Architecture conventions, service layer pattern, error handling, logging, package boundaries — all code must conform |

**How to use during GSD steps:**
- **discuss-phase**: Read Audit Report sections relevant to the phase to identify risks, constraints, and competitive context before discussing approach
- **research-phase**: Read Supplemental Research and Pitfalls to avoid re-researching solved questions; focus on gaps
- **plan-phase**: Cross-reference Audit Report Section 10 (action plan) priorities with phase scope; validate plan against Eval Framework scenarios
- **execute-phase**: Check Standards for code conventions; use Audit Report architecture critique (Section 2) for specific file/line references to fix
- **verify-phase**: Run relevant Eval Framework test scenarios; check Audit Report risk register (Section 9) for risks that should have been mitigated

## Milestones

- ✅ **v1.0 MVP** — Phases 1-7 (shipped 2026-04-07) — [Archive](milestones/v1.0-ROADMAP.md)
- 🔄 **v1.1 Market-Ready** — Phases 8-13 (started 2026-04-10)
- 📋 **v1.2 Competitive Edge** — Phases 14-16 (planned)

## Phases

### v1.1 Market-Ready

- [x] **Phase 8: Architecture Upgrade** — P0 security + P1 service layer — completed 2026-04-10
- [x] **Phase 9: Dashboard & i18n Foundation** — Next.js 16 scaffold + 7-language i18n — completed 2026-04-10
- [ ] **Phase 10: Gemini Migration & Session Hardening** — 3.1 upgrade, server-side tools, cost optimization, pricing model
- [ ] **Phase 11: Dashboard & i18n Completion** — Real data, auth flow, KB CRUD, analytics, full i18n extraction
- [ ] **Phase 12: Knowledge Pipeline v2** — Karpathy Wiki compilation, retry queue, Qdrant 1.16, proactive visual recognition
- [ ] **Phase 13: DX, Observability & Launch Readiness** — CI/CD, Sentry, PostHog, E2E tests, session intelligence

### v1.2 Competitive Edge

- [ ] **Phase 14: Advanced Knowledge & Retrieval** — Virtual FS KB, PDF ingestion, context preloading, state machine
- [ ] **Phase 15: Sensor Integration & Edge AI** — BLE sensors, combined visual+sensor reasoning, on-device equipment ID
- [ ] **Phase 16: Team Collaboration & Platform** — FSM integration, multi-tech sessions, fleet management

<details>
<summary>✅ v1.0 MVP (Phases 1-7) — SHIPPED 2026-04-07</summary>

- [x] Phase 1: Foundation and Auth (6/6 plans) — completed 2026-04-03
- [x] Phase 2: AI Pipeline and Tool System (4/4 plans) — completed 2026-04-03
- [x] Phase 3: Live Streaming Session (7/7 plans) — completed 2026-04-04
- [x] Phase 4: Session Lifecycle (3/3 plans) — completed 2026-04-05
- [x] Phase 5: Knowledge Base (7/7 plans) — completed 2026-04-06
- [x] Phase 6: Wire Knowledge Pipeline (1/1 plan) — completed 2026-04-07
- [x] Phase 7: Integration Hardening and Tech Debt (2/2 plans) — completed 2026-04-07

</details>

## Phase Details

### Phase 8: Architecture Upgrade
**Goal**: Harden server security, extract business logic into a service layer, and establish project conventions
**Depends on**: v1.0 shipped
**Scope**:
- Layer 1: CORS hardening (explicit origin allowlist), Zod env validation at startup, structured JSON logger, request IDs, graceful shutdown, health/ready endpoints
- Layer 1: SessionService + KnowledgeService extracted from routers (service layer pattern with ErrorWithCode)
- Layer 1: STANDARDS.md (10-section project conventions)
**Success Criteria** (what must be TRUE):
  1. Server rejects requests from origins not in the explicit allowlist
  2. Server fails to start if required env vars are missing (Zod validation)
  3. All server logs are structured JSON with request IDs
  4. Session and knowledge routers are thin wrappers — all business logic is in service classes with constructor-injected dependencies
  5. STANDARDS.md documents architecture, errors, security, logging, AI, mobile, testing, git, files, and deps conventions
**Status**: Complete (2026-04-10)

### Phase 9: Dashboard & i18n Foundation
**Goal**: Scaffold the Next.js 16 dashboard with tRPC integration and establish 7-language i18n infrastructure across mobile and web
**Depends on**: Phase 8
**Scope**:
- Layer 1: Next.js 16 dashboard (apps/web) with Turbopack, tRPC provider, 5 page stubs (overview, sessions, KB, team, settings)
- Layer 1: 7 locale files (en, de, tr, sr, hr, pl, ro) in packages/shared/src/i18n/
- Layer 1: Mobile i18n init with expo-localization auto-detect + react-i18next; 4 key components converted
- Layer 1: Web i18n with browser language detection + I18nProvider in root layout
**Success Criteria** (what must be TRUE):
  1. Dashboard loads at localhost:3001 with all 5 page routes accessible
  2. tRPC client is wired and can call server procedures (verified with health check)
  3. Mobile app auto-detects device language and loads correct locale
  4. AIDisclosureModal, AIIndicator, ConnectionLostOverlay, and FeedbackScreen use translated strings
**Status**: Complete (2026-04-10)

### Phase 10: Gemini Migration & Session Hardening
**Goal**: Migrate to Gemini 3.1 Flash Live, eliminate the mobile tool relay bottleneck with server-side tool execution, and fix all P0 reliability issues from the deep audit
**Depends on**: Phase 8
**Requirements**: AI-01, AI-02, AI-03, SESS-01, SESS-02, SESS-03, SESS-04, COST-01, COST-02, PRICE-01, PRICE-02
**Scope**:
- Layer 1 (AI-01): Update model target from `gemini-2.5-flash-live-preview` to `gemini-3.1-flash-live-preview`
- Layer 1 (AI-02): Server-side tool execution — tool calls route Gemini -> server WebSocket -> execute -> inject result via `send_client_content`. Mobile no longer relays tool calls.
- Layer 1 (SESS-01): Fix singleton anti-pattern — SessionService and KnowledgeService receive Qdrant client and embedding service via constructor injection. Zero per-call client instantiation.
- Layer 1 (SESS-02): Replace all 6 console.log/console.error calls in connection.ts with structured logger
- Layer 1 (SESS-03): WebSocket keepalive pings — bi-directional ping/pong with 30s interval, auto-reconnect on missed pong
- Layer 1 (SESS-04): Fix `z.any()` in dispatchToolCalls router input — replace with proper Zod schema
- Layer 2 (COST-01): Client-side VAD (Silero WASM) — silence frames not sent to Gemini, ~65% reduction in audio input bytes
- Layer 2 (COST-02): Scene-change detection — frame differencing skips static camera frames, ~70% fewer frames during static scenes
- Layer 2 (AI-03): Concise output prompting — system prompt tuned for 1-2 sentence responses during active work, ~40% audio output cost reduction
- Layer 2 (PRICE-01, PRICE-02): Tiered pricing model — backend enforces session caps per plan tier (EUR 29/30 sessions, EUR 49/60, EUR 79/unlimited). Usage tracking in DB via tRPC endpoint.
**Success Criteria** (what must be TRUE):
  1. All sessions connect to `gemini-3.1-flash-live-preview`; zero references to `gemini-2.5-flash-live-preview` remain in codebase (AI-01)
  2. Tool calls execute server-side with <100ms latency (measured from tool call event to result injection); mobile app does not relay tool calls (AI-02)
  3. SessionService and KnowledgeService create zero Qdrant clients or embedding services per-call (constructor injection only) (SESS-01)
  4. Zero `console.log` or `console.error` calls in `apps/mobile/lib/gemini/connection.ts`; all logging uses structured logger (SESS-02)
  5. WebSocket sessions survive 5+ minutes on cellular without NAT timeout disconnection (keepalive pings active) (SESS-03)
  6. `dispatchToolCalls` input schema validates tool call arguments with typed Zod schemas (no `z.any()`) (SESS-04)
  7. (Layer 2) With VAD enabled, audio input bytes sent to Gemini are reduced by >50% compared to continuous streaming in a test scenario with 30% silence (COST-01)
  8. (Layer 2) With scene-change detection enabled, frames sent during a static camera scenario are reduced by >60% (COST-02)
  9. (Layer 2) System prompt produces 1-2 sentence responses during active work; audio output duration reduced ~40% compared to default prompting (AI-03)
  10. (Layer 2) Session usage is tracked per org and enforced against plan tier limits; API returns 429 when session cap is exceeded; usage available via tRPC endpoint (PRICE-01, PRICE-02)
**Plans**: TBD
**UI hint**: no

### Phase 11: Dashboard & i18n Completion
**Goal**: Transform the dashboard from placeholder stubs into a functional tool that business owners use daily to monitor team activity, manage the knowledge base, and understand usage costs
**Depends on**: Phase 10 (server-side tool execution informs session data model)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09, I18N-01
**Scope**:
- Layer 1 (DASH-01): Auth flow — login, signup, org creation, invite flow via Better Auth. Session persists across reloads.
- Layer 1 (DASH-02): Session feed page — real-time list of recent sessions with technician name, equipment type, duration, status, finding count. Paginated and filterable.
- Layer 1 (DASH-03): Knowledge base CRUD — create, edit, delete articles. View verification status (4-tier confidence). Promote/demote. Markdown editor.
- Layer 1 (DASH-04): Team management — invite technicians by email, manage roles (owner/admin/technician), per-person session count this month.
- Layer 1 (DASH-05): Billing & usage page — sessions used this month, cost projection, current plan tier, upgrade/downgrade.
- Layer 1 (I18N-01): Complete i18n extraction — all mobile screens, all error messages, all server responses, and all dashboard pages use `t()`. Zero hardcoded user-facing English strings outside locale files.
- Layer 2 (DASH-06): Session detail / playback — view any completed session's timeline of tool calls, findings, AI summary, equipment identified. Structured data only, not audio/video replay.
- Layer 2 (DASH-07): KB health dashboard — visual coverage score, stale article count, pending reviews, conflict flags, articles added this month.
- Layer 2 (DASH-08): Analytics charts — top equipment types (bar), error code frequency (bar), session duration distribution (histogram), team usage trend (line). Recharts v3.
- Layer 2 (DASH-09): Knowledge compounding visualization — monthly KB growth, articles promoted to expert-approved, current coverage percentage.
**Success Criteria** (what must be TRUE):
  1. A new user can sign up, create an org, and land on the dashboard without manual database intervention (DASH-01)
  2. Session feed page displays real session data from the database with correct technician names, durations, and finding counts; pagination works with >20 sessions (DASH-02)
  3. Business owner can create a new KB article, edit its content, and promote it from `unverified` to `expert_approved` through the UI (DASH-03)
  4. Org owner can invite a technician by email, technician receives invite, joins org, and appears in team list with correct role (DASH-04)
  5. Billing page shows accurate session count for current month and correct plan tier (DASH-05)
  6. Zero hardcoded user-facing English strings exist outside locale files; `grep -r` for common English UI strings in component files returns zero results (I18N-01)
  7. (Layer 2) Session detail page shows tool call timeline and AI-generated summary for any completed session (DASH-06)
  8. (Layer 2) KB health dashboard shows at least 4 metrics: coverage, staleness, pending reviews, conflict count (DASH-07)
  9. (Layer 2) At least 3 analytics charts render with real data from the database (DASH-08)
  10. (Layer 2) Knowledge compounding visualization displays monthly KB growth count, promotion count, and coverage percentage (DASH-09)
**Plans**: TBD
**UI hint**: yes

### Phase 12: Knowledge Pipeline v2
**Goal**: Upgrade from standard RAG to a compiled, self-improving knowledge system with measurably better retrieval results and multi-tenant scale
**Depends on**: Phase 10 (singleton fix prerequisite), Phase 11 (KB CRUD provides management UI)
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07, COST-03
**Scope**:
- Layer 1 (KB-01): Embedding retry queue — failed embeddings queued via Inngest with exponential backoff. Zero silent failures. Dashboard shows retry status.
- Layer 1 (KB-02): Qdrant 1.16 tiered multitenancy — shared fallback shard for small tenants + dedicated shards for tenants with >1000 articles. Tenant isolation verified.
- Layer 1 (KB-03): ACORN search for multi-filter queries — multi-filter accuracy ~97% (up from ~53%). Enabled on all search endpoints.
- Layer 1 (KB-04): ASCII folding for multilingual search — German umlauts, Turkish dotless-i, Serbian Latin/Cyrillic all normalize. Verified across all 7 languages.
- Layer 1 (COST-03): Flex/Batch tier for background processing — KB compilation, session summaries, embedding generation use Flex tier (50% cost savings). Live sessions remain Standard.
- Layer 2 (KB-05): Karpathy Wiki compilation — raw articles -> LLM-compiled structured wiki entries (problem/symptoms/diagnosis/resolution/references) before embedding. A/B test: compiled wins on relevance in 80%+ of test queries.
- Layer 2 (KB-06): Source citations in session — when AI guidance is based on a KB article, article title appears as tappable reference in mobile UI.
- Layer 2 (KB-07): Proactive visual recognition — camera auto-identifies equipment manufacturer/model from nameplate and preloads relevant KB articles before technician asks.
**Success Criteria** (what must be TRUE):
  1. When an embedding fails (simulated Qdrant downtime), an Inngest retry job is enqueued and the embedding succeeds on retry; zero articles remain un-embedded after retry completes (KB-01)
  2. Two orgs with different tenant IDs cannot retrieve each other's articles via search (tenant isolation test) (KB-02)
  3. A search query with 3+ filters (orgId + brand + category) returns relevant results at >90% precision (ACORN-enabled) (KB-03)
  4. Searching for "Warmetauscher" (German) returns the same article as "Warmetauscher" (ASCII-folded); Turkish "islem" and "islem" match equivalently (KB-04)
  5. Background KB compilation jobs run on Flex tier (verified via Gemini API request logs or billing) at 50% lower cost than Standard (COST-03)
  6. (Layer 2) A/B retrieval test across 20 test queries: compiled wiki entries produce higher-relevance results than raw-text embeddings in 80%+ of queries (KB-05)
  7. (Layer 2) During a live session, when AI references a KB article, the mobile UI displays a tappable citation with the article title (KB-06)
  8. (Layer 2) When camera shows equipment nameplate text, AI identifies manufacturer/model and preloads KB articles without technician prompt (KB-07)
**Plans**: TBD
**UI hint**: yes (mobile source citation UI, proactive recognition overlay)

### Phase 13: DX, Observability & Launch Readiness
**Goal**: Production-grade CI/CD, error tracking, usage analytics, and E2E test coverage for the critical user path — the product is shippable after this phase
**Depends on**: Phase 10, Phase 11 (need stable features to test and monitor)
**Requirements**: DEVX-01, DEVX-02, DEVX-03, DEVX-04, DEVX-05, DEVX-06, UX-01, UX-02
**Scope**:
- Layer 1 (DEVX-01): GitHub Actions CI — Turborepo-cached pipeline: lint, type-check, unit tests, build. Runs on every PR. Green badge on main.
- Layer 1 (DEVX-02): Sentry integration — Next.js SDK + React Native SDK. Errors captured with request ID, user context, release version. Source maps uploaded.
- Layer 1 (DEVX-03): Maestro E2E critical path — launch -> login -> start session -> receive guidance -> end session -> view summary. Runs in CI on EAS build.
- Layer 1 (DEVX-04): Pre-deploy checklist automation — script validates: no console.log, env vars present, DB migrations applied, health endpoint responds.
- Layer 2 (DEVX-05): PostHog integration — session started/ended events, feature flag for tiered pricing rollout, funnel: login -> session -> feedback.
- Layer 2 (DEVX-06): Session intelligence email — post-session auto-generated email to business owner with findings, error codes, AI-suggested follow-ups. React Email + Resend.
- Layer 2 (UX-01): Haptic feedback — subtle vibration on state transitions: idle -> listening -> processing -> speaking. 3 distinct patterns.
- Layer 2 (UX-02): E2E offline resilience — Maestro test: start session -> kill network -> verify overlay -> restore -> verify reconnection or clean restart.
**Success Criteria** (what must be TRUE):
  1. Every PR triggers a GitHub Actions pipeline that runs lint, type-check, and unit tests; a failing test blocks merge (DEVX-01)
  2. Sentry captures errors from both web dashboard and mobile app with request IDs, user context, and source-mapped stack traces (DEVX-02)
  3. Maestro E2E test for the critical path (login -> session -> end) passes on a fresh EAS dev build (DEVX-03)
  4. Pre-deploy script catches at least: console.log in source, missing required env vars, and unreachable health endpoint (DEVX-04)
  5. (Layer 2) PostHog tracks session_started and session_ended events with org_id, user_id, and session duration (DEVX-05)
  6. (Layer 2) After a session ends, the business owner receives an email with session findings and AI summary within 5 minutes (DEVX-06)
  7. (Layer 2) State transition haptic patterns are distinct and verified on both iOS and Android physical devices (UX-01)
  8. (Layer 2) Maestro offline resilience test: connection-lost overlay appears within 3s of network kill; session recovers or restarts cleanly on network restore (UX-02)
**Plans**: TBD
**UI hint**: yes (haptic feedback requires device testing)

### Phase 14: Advanced Knowledge & Retrieval
**Goal**: Virtual filesystem over Qdrant for exact-match retrieval, PDF manual ingestion, session state machine, and context preloading
**Depends on**: v1.1 shipped (Phase 13)
**Scope**:
- Layer 1: Context preloading — technician selects equipment type before session start; relevant KB articles preloaded into system context; first response <2s faster
- Layer 1: Fork & maintain expo-two-way-audio — forked repo, 24kHz playback support, acoustic echo cancellation verified, no JS-side resampling
- Layer 1: Session state machine — replace 8-ref imperative state in useGeminiSession with typed reducer; all transitions testable
- Layer 2: Virtual filesystem KB (bash-tool over Qdrant) — agent can grep/cat/find for exact-match retrieval alongside vector similarity; +15% retrieval accuracy
- Layer 2: Docling PDF ingestion — Python sidecar processes HVAC manufacturer PDFs -> structured articles -> KB; tested with 5 real manuals
- Layer 2: Source citation with page reference — KB article sourced from PDF shows page number; technician can verify against physical manual
**Success Criteria** (what must be TRUE):
  1. When a technician selects equipment type before session start, first AI response latency is measurably <2s faster than without preloading
  2. Forked expo-two-way-audio plays 24kHz PCM audio without JS resampling and AEC is verified on physical devices
  3. useGeminiSession state machine has typed states and transitions; all state transitions are unit-tested
  4. (Layer 2) Agent can execute `grep "compressor"` against KB and get exact-match results distinct from vector similarity search
  5. (Layer 2) A Carrier installation manual PDF is ingested and searchable as structured KB articles
**Plans**: TBD

### Phase 15: Sensor Integration & Edge AI
**Goal**: Neutralize MeasureQuick's sensor advantage with BLE integration and add on-device intelligence
**Depends on**: Phase 14
**Scope**:
- Layer 1: BLE sensor integration — read live temperature, pressure, superheat/subcool from at least 2 Bluetooth tool brands (Fieldpiece, testo); display in session UI
- Layer 1: Combined visual + sensor reasoning — Gemini receives both camera frames AND sensor readings in context
- Layer 2: Edge AI equipment ID (YOLO) — on-device model identifies manufacturer/model from camera frame without Gemini; <500ms identification
- Layer 2: Offline intelligence — MMKV-cached KB subset + on-device small model for basic diagnostics when cellular is lost
**Success Criteria** (what must be TRUE):
  1. Mobile app connects to a Fieldpiece or testo BLE instrument and displays live readings in the session UI
  2. Gemini session context includes both visual frames and sensor data; AI references sensor values in its guidance
  3. (Layer 2) On-device model identifies equipment manufacturer/model from camera frame in <500ms without network
  4. (Layer 2) With airplane mode on, cached KB articles are searchable and basic diagnostic guidance is available
**Plans**: TBD

### Phase 16: Team Collaboration & Platform
**Goal**: Multi-technician collaboration and platform integrations that embed Aucta into existing field service workflows
**Depends on**: Phase 15
**Scope**:
- Layer 1: FSM integration (ServiceTitan API) — sessions linked to work orders; findings auto-populate service reports
- Layer 1: Customer-facing session report — exportable PDF with work performed, findings, AI recommendations, technician notes; white-labeled with company branding
- Layer 2: Multi-technician session — senior tech joins junior's live session remotely; sees same camera feed; can speak guidance
- Layer 2: Equipment fleet management — dashboard tracks all equipment serviced; predictive maintenance flags from historical session data
**Success Criteria** (what must be TRUE):
  1. A session can be linked to a ServiceTitan work order; session findings appear in the work order's service report
  2. Business owner can export a branded PDF report for any completed session with findings and AI summary
  3. (Layer 2) Two technicians in the same live session both see the camera feed and can communicate via voice
  4. (Layer 2) Dashboard shows equipment service history and flags units with >3 sessions in 30 days as potential recurring issues
**Plans**: TBD

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 8. Architecture Upgrade | v1.1 | Complete | 2026-04-10 |
| 9. Dashboard & i18n Foundation | v1.1 | Complete | 2026-04-10 |
| 10. Gemini Migration & Session Hardening | v1.1 | Pending | - |
| 11. Dashboard & i18n Completion | v1.1 | Pending | - |
| 12. Knowledge Pipeline v2 | v1.1 | Pending | - |
| 13. DX, Observability & Launch Readiness | v1.1 | Pending | - |
| 14. Advanced Knowledge & Retrieval | v1.2 | Planned | - |
| 15. Sensor Integration & Edge AI | v1.2 | Planned | - |
| 16. Team Collaboration & Platform | v1.2 | Planned | - |

## Phase Dependencies

```
Phase 10 ──→ Phase 11 ──→ Phase 12 ──→ Phase 13
                │                          │
                └──────────────────────────┘
                     (i18n + dashboard needed
                      for observability)

Phase 14 ──→ Phase 15 ──→ Phase 16
(v1.2 starts after v1.1 ships)
```

## Key Metrics (Target at v1.1 Ship)

| Metric | Current | Target |
|--------|---------|--------|
| Session start latency | ~5s | <3s |
| Tool call latency (during session) | 200-500ms (mobile relay) | <100ms (server-side) |
| Session cost (15 min) | $0.35-$0.50 | <$0.25 |
| i18n coverage | 4/20+ components | 100% |
| Dashboard pages with real data | 0/5 | 5/5 |
| E2E test coverage (critical path) | 0 | 1 full flow |
| Error tracking | None | Sentry active |
| CI pipeline | None | GitHub Actions |
