# Milestones

> **GSD Context:** Before working on any phase, read `.planning/AUDIT-REPORT.md` (architecture critique, cost model, competitive landscape, 30-item action plan) and `.planning/EVAL-FRAMEWORK.md` (25 AI quality test scenarios with pass criteria). These documents inform scope, priorities, and verification criteria for every phase below.

## v1.1 Market-Ready (In Progress: 2026-04-10)

**Goal:** Transform v1.0 MVP into a deployable, cost-sustainable product that a 10-person HVAC team can use daily without hitting performance, cost, or reliability walls.

**Success criteria:** A technician starts a session in <5s, gets spoken guidance with tool-augmented answers in <1s latency, sessions cost <$0.25, the dashboard shows real usage data, and the knowledge base self-improves with every session.

**Phases planned:** 6 phases (8-13), 2 completed, 4 remaining
**Status:** Phase 10 next

---

### Phase 10: Gemini Migration & Session Hardening

**Goal:** Migrate to Gemini 3.1 Flash Live, eliminate the mobile tool relay bottleneck, and fix all P0 reliability issues discovered in the deep audit.

**Why now:** The current model (`gemini-2.5-flash-live-preview`) is being deprecated. Gemini 3.1 dropped async function calling — tool calls now block the model response. Without server-side tool execution, every tool call adds 200-500ms of dead air.

**Dependencies:** None (entry point)
**Complexity:** HIGH — server-side tool execution requires a new WebSocket relay architecture
**Risk:** Gemini 3.1 Live is still Preview; API surface may shift

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | Update model target to `gemini-3.1-flash-live-preview` | All sessions use 3.1; old model reference removed from codebase |
| 2 | Server-side tool execution | Tool calls route: Gemini → server WebSocket → execute → inject result via `send_client_content`. Mobile no longer relays tool calls. Tool response latency <100ms (server-local). |
| 3 | Fix singleton anti-pattern | `SessionService` and `KnowledgeService` receive Qdrant client and embedding service via constructor injection. Zero per-call client instantiation. |
| 4 | Replace console.log in connection.ts | All 6 `console.log`/`console.error` calls replaced with structured logger from `@aucta/shared`. |
| 5 | WebSocket keepalive pings | Bi-directional ping/pong with 30s interval. Auto-reconnect on missed pong. Verified on cellular (NAT timeout >60s). |
| 6 | Fix `z.any()` in dispatchToolCalls | Replace with proper Zod schema for tool call arguments. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 7 | Client-side VAD (Silero WASM) | Silence frames not sent to Gemini. ~65% reduction in audio input bytes. VAD threshold configurable. |
| 8 | Scene-change detection | Frame differencing skips static camera frames. ~70% fewer frames sent during equipment-pointed-at-wall scenarios. |
| 9 | Concise output prompting | System prompt tuned: "During active work, respond in 1-2 sentences. Elaborate only when the technician asks for detail." Audio output duration reduced ~40%. |
| 10 | Tiered pricing model | Backend enforces session caps per plan tier. Plans: EUR 29 (30 sessions/mo), EUR 49 (60), EUR 79 (unlimited). Usage tracking in DB. |

---

### Phase 11: Dashboard & i18n Completion

**Goal:** Transform the dashboard from placeholder stubs into a functional tool that business owners use daily to monitor team activity, manage the knowledge base, and understand usage costs.

**Why now:** The Phase 9 scaffold has tRPC wired up but zero real data. Business owners need visibility before they'll buy. i18n is 4/20+ components — the "7-language" claim is premature.

**Dependencies:** Phase 10 (server-side tool execution informs session data model)
**Complexity:** MEDIUM — standard CRUD + data visualization, well-understood patterns
**Risk:** Low — shadcn/ui + tRPC + Next.js 16 is a proven stack

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | Auth flow (Better Auth) | Login, signup, org creation, invite flow. Redirect to dashboard on auth. Session persists across reloads. |
| 2 | Session feed page | Real-time list of recent sessions: technician name, equipment type, duration, status, finding count. Paginated. Filterable by date/technician. |
| 3 | Knowledge base CRUD | Create, edit, delete articles. View verification status (4-tier confidence). Promote/demote articles. Markdown editor. |
| 4 | Team management | Invite technicians (email), manage roles (owner/admin/technician), view per-person session count this month. |
| 5 | Billing & usage page | Sessions used this month, cost projection, current plan tier, upgrade/downgrade. |
| 6 | Complete i18n extraction | All mobile screens, all error messages, all server responses, and all dashboard pages use `t()`. Zero hardcoded user-facing English strings outside locale files. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 7 | Session detail / playback | View any completed session: timeline of tool calls, findings, AI summary, equipment identified. Not audio/video replay — structured data only. |
| 8 | KB health dashboard | Visual: coverage score, stale article count, pending reviews, conflict flags, articles added this month. Single-glance flywheel health. |
| 9 | Analytics charts | Top equipment types (bar), error code frequency (bar), session duration distribution (histogram), team usage trend (line). Recharts v3. |
| 10 | Knowledge compounding visualization | "Your team's KB grew by 12 articles this month. 3 promoted to expert-approved. Coverage: 78%." Owner sees the compound effect. |

---

### Phase 12: Knowledge Pipeline v2

**Goal:** Upgrade the knowledge base from standard RAG to a compiled, self-improving knowledge system that produces measurably better retrieval results and scales across tenants.

**Why now:** The current pipeline chunks raw text and embeds it directly. The Karpathy Wiki pattern (LLM compilation before embedding) produces denser embeddings and lower hallucination. The singleton anti-pattern and missing retry logic are reliability gaps.

**Dependencies:** Phase 10 (singleton fix is prerequisite), Phase 11 (KB CRUD provides the management UI)
**Complexity:** HIGH — Karpathy Wiki compilation is novel architecture, Qdrant multitenancy requires data migration
**Risk:** MEDIUM — LLM compilation quality depends on prompt engineering; Qdrant 1.16 migration may require re-indexing

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | Embedding retry queue | Failed embeddings are queued via Inngest and retried with exponential backoff. Zero silent embedding failures. Dashboard shows retry status. |
| 2 | Qdrant 1.16 tiered multitenancy | Shared fallback shard for small tenants + dedicated shards for tenants with >1000 articles. Tenant isolation verified. |
| 3 | ACORN search for multi-filter queries | Multi-filter accuracy increases from ~53% to ~97% (Qdrant benchmark). Enabled on all search endpoints. |
| 4 | ASCII folding for multilingual search | German umlauts, Turkish dotless-i, Serbian Latin/Cyrillic — all normalize for search. Verified with test queries in all 7 languages. |
| 5 | Flex/Batch tier for background processing | KB compilation, session summaries, and embedding generation use Flex tier (50% cost savings). Live sessions remain on Standard tier. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 6 | Karpathy Wiki compilation | Raw articles → LLM-compiled structured wiki entries (problem/symptoms/diagnosis/resolution/references) before embedding. A/B retrieval test: compiled vs raw, compiled wins on relevance in 80%+ of test queries. |
| 7 | Source citations in session | When AI guidance is based on a KB article, the article title appears as a tappable reference in the mobile UI. Technician can view the source. |
| 8 | Proactive visual recognition | Camera auto-identifies equipment manufacturer/model from nameplate. Preloads relevant KB articles before technician asks. "I see a Carrier 24ACC636A003 — I've loaded the error code table for this unit." |

---

### Phase 13: DX, Observability & Launch Readiness

**Goal:** Production-grade CI/CD, error tracking, usage analytics, and E2E test coverage for the critical user path. The product is shippable after this phase.

**Why now:** Zero CI, zero error tracking, zero E2E tests. Cannot ship a B2B product without these.

**Dependencies:** Phase 10-11 (need stable features to test and monitor)
**Complexity:** MEDIUM — well-understood tools, integration work
**Risk:** LOW — Sentry, PostHog, GitHub Actions are mature

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | GitHub Actions CI | Turborepo-cached pipeline: lint, type-check, unit tests, build. Runs on every PR. Green badge on main. |
| 2 | Sentry integration | Next.js SDK + React Native SDK. Errors captured with request ID, user context, release version. Source maps uploaded. Alert on new error types. |
| 3 | Maestro E2E: critical path | Automated test: launch → login → start session → receive guidance → end session → view summary. Runs in CI on EAS build. |
| 4 | Pre-deploy checklist automation | Script validates: no `console.log`, env vars present, DB migrations applied, health endpoint responds, no `z.any()` in router schemas. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 5 | PostHog integration | Session started/ended events, feature flag for tiered pricing rollout, funnel: login → session → feedback. Dashboard with weekly active users. |
| 6 | Session intelligence email | Post-session: auto-generated email to business owner with findings, error codes, AI-suggested follow-ups. React Email + Resend. |
| 7 | Haptic feedback | Subtle vibration on state transitions: idle → listening → processing → speaking. 3 distinct patterns. Critical for hands-busy, eyes-on-equipment technicians. |
| 8 | E2E: offline resilience | Maestro test: start session → kill network → verify connection-lost overlay → restore network → verify reconnection or clean restart. |

---

## v1.2 Competitive Edge (Planned)

**Goal:** Close the gap with MeasureQuick on sensor data, open up PDF-based knowledge ingestion, and add features that make Aucta irreplaceable after 6 months of team usage.

**Success criteria:** Switching cost is high (compiled KB + team patterns make migration painful), PDF manuals are searchable, context preloading reduces first-response latency by 50%.

**Phases planned:** 3 phases (14-16)
**Status:** Not started

---

### Phase 14: Advanced Knowledge & Retrieval

**Goal:** Virtual filesystem over Qdrant for exact-match retrieval, PDF manual ingestion, and context preloading.

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | Context preloading | Technician selects equipment type before session start. Relevant KB articles preloaded into system context. First response <2s faster. |
| 2 | Fork & maintain expo-two-way-audio | Forked repo, 24kHz playback support, acoustic echo cancellation verified. No JS-side resampling. |
| 3 | Session state machine (typed reducer) | Replace 8-ref imperative state in `useGeminiSession` with explicit typed state machine. All transitions testable. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 4 | Virtual filesystem KB (bash-tool) | Agent can `grep`, `cat`, `find` over Qdrant for exact-match retrieval alongside vector similarity. Hybrid retrieval accuracy +15%. |
| 5 | Docling PDF ingestion | Python sidecar processes HVAC manufacturer PDFs → structured articles → KB. Tested with 5 real manuals from major manufacturers. |
| 6 | Source citation with page reference | KB article sourced from PDF shows page number. Technician can verify against physical manual. |

---

### Phase 15: Sensor Integration & Edge AI

**Goal:** Neutralize MeasureQuick's sensor advantage and add on-device intelligence.

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | BLE sensor integration (Fieldpiece/testo) | Read live temperature, pressure, superheat/subcool from at least 2 Bluetooth tool brands. Display readings in session UI. |
| 2 | Combined visual + sensor reasoning | Gemini receives both camera frames AND sensor readings. "I see ice on the evaporator coil and your suction pressure is 45 PSI — that confirms a low-charge condition." |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 3 | Edge AI equipment ID (YOLO) | On-device model identifies equipment manufacturer/model from camera frame without sending to Gemini. <500ms identification. |
| 4 | Offline intelligence | MMKV-cached KB subset + on-device small model provides basic diagnostics when cellular signal is lost. |

---

### Phase 16: Team Collaboration & Platform

**Goal:** Multi-technician collaboration and platform integrations that embed Aucta into existing field service workflows.

#### Layer 1 — Functional Minimum

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | FSM integration (ServiceTitan API) | Sessions linked to work orders. Findings auto-populate service reports. |
| 2 | Customer-facing session report | Exportable PDF: work performed, findings, AI recommendations, technician notes. White-labeled with company branding. |

#### Layer 2 — Wow Factor

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 3 | Multi-technician session | Senior tech joins junior's live session remotely. Sees same camera feed. Can speak guidance that both the junior tech and AI hear. |
| 4 | Equipment fleet management | Dashboard tracks all equipment a company has serviced. Predictive maintenance flags based on historical session data. |

---

## v1.0 MVP (Shipped: 2026-04-07)

**Phases completed:** 7 phases, 30 plans, ~65 tasks
**Timeline:** 5 days (2026-04-03 → 2026-04-07)
**Codebase:** 22,867 LOC TypeScript, 374 files, 185 commits

**Key accomplishments:**

1. Full real-time AI copilot session: camera + audio → Gemini 2.5 Flash Live → spoken guidance with tool calls, reconnection, and voice command end
2. Multi-tenant auth with RBAC: Better Auth org plugin, role-scoped invites, org-scoped tRPC middleware
3. Domain-specific AI tool system: buildTool() factory, ephemeral tokens with locked constraints, lookupErrorCode, logFinding, searchKnowledgeBase
4. Self-learning knowledge base: hybrid BM25 + dense search via Qdrant, session ingestion → LLM compilation → auto-backlinks, 4-tier confidence, verification queue
5. Session lifecycle: DB persistence, incremental tool/finding persistence, feedback, Inngest summary pipeline, MMKV offline cache
6. EU AI Act compliance: non-dismissible AI indicator, safety disclaimers, F-Gas references, stream-and-discard architecture

**Known Gaps:**

- INFRA-03: EAS dev builds configured but not verified on physical device (needs human)
- KB-10: Manual text knowledge input API endpoints exist but not explicitly verified

**Archive:** [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) | [v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) | [v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---
