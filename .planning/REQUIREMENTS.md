# Requirements: Aucta

**Defined:** 2026-04-10
**Core Value:** A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time.

> **GSD Context:** Before working on any phase, read `.planning/AUDIT-REPORT.md` (architecture critique, cost model, competitive landscape, 30-item action plan) and `.planning/EVAL-FRAMEWORK.md` (25 AI quality test scenarios with pass criteria). These documents inform scope, priorities, and verification criteria for every requirement below.

## v1.1 Requirements

Requirements for v1.1 Market-Ready milestone. Each maps to roadmap phases 10-13.
Items marked *(Layer 2)* are stretch goals — build if time permits after Layer 1 is complete.

### AI Infrastructure

- [ ] **AI-01**: System connects to `gemini-3.1-flash-live-preview` for all sessions; zero references to deprecated `gemini-2.5-flash-live-preview` remain in codebase
- [ ] **AI-02**: Tool calls execute server-side with <100ms latency (measured from tool call event to result injection); mobile app does not relay tool calls
- [ ] **AI-03**: System prompt produces 1-2 sentence responses during active work; concise output mode reduces audio output duration ~40% *(Layer 2)*

### Session Reliability

- [ ] **SESS-01**: SessionService and KnowledgeService receive Qdrant client and embedding service via constructor injection; zero per-call client instantiation
- [ ] **SESS-02**: All server-side logging uses structured JSON logger from `@aucta/shared` with request IDs; zero `console.log` or `console.error` calls in `apps/mobile/lib/gemini/connection.ts`
- [ ] **SESS-03**: WebSocket sessions survive 5+ minutes on cellular without NAT timeout disconnection via bi-directional keepalive pings (30s interval) with auto-reconnect on missed pong
- [ ] **SESS-04**: `dispatchToolCalls` input schema validates tool call arguments with typed Zod schemas; zero `z.any()` usage in router schemas

### Cost Optimization

- [ ] **COST-01**: Client-side VAD (Silero WASM) filters silence frames before sending to Gemini; audio input bytes reduced by >50% compared to continuous streaming in test scenario with 30% silence *(Layer 2)*
- [ ] **COST-02**: Scene-change detection via frame differencing skips static camera frames; frames sent during static scenario reduced by >60% *(Layer 2)*
- [ ] **COST-03**: Background KB compilation, session summaries, and embedding generation use Gemini Flex/Batch tier at 50% lower cost than Standard tier; live sessions remain on Standard

### Pricing & Usage

- [ ] **PRICE-01**: Backend enforces session caps per plan tier: EUR 29 (30 sessions/mo), EUR 49 (60 sessions/mo), EUR 79 (unlimited); API returns 429 when cap exceeded *(Layer 2)*
- [ ] **PRICE-02**: Session usage tracked per org in database with current month totals; available via tRPC endpoint *(Layer 2)*

### Dashboard

- [ ] **DASH-01**: User can sign up with email/password, log in, create an organization, and invite technicians via Better Auth web flow; session persists across browser reloads
- [ ] **DASH-02**: Business owner can view real-time session feed with technician name, equipment type, duration, status, and finding count; paginated; filterable by date and technician
- [ ] **DASH-03**: Business owner can create, edit, and delete KB articles; view verification status (4-tier confidence: unverified, technician_reviewed, expert_approved, manufacturer_sourced); promote/demote articles; markdown editor
- [ ] **DASH-04**: Org owner can invite technicians by email, manage roles (owner/admin/technician), and view per-person session count for current month
- [ ] **DASH-05**: Billing & usage page shows sessions used this month, cost projection, current plan tier, and upgrade/downgrade options
- [ ] **DASH-06**: Session detail page shows tool call timeline, findings logged, AI-generated summary, and equipment identified for any completed session (structured data, not audio/video replay) *(Layer 2)*
- [ ] **DASH-07**: KB health dashboard displays coverage score, stale article count, pending reviews, conflict flags, and articles added this month *(Layer 2)*
- [ ] **DASH-08**: Analytics charts render with real database data: top equipment types (bar), error code frequency (bar), session duration distribution (histogram), team usage trend (line) *(Layer 2)*
- [ ] **DASH-09**: Knowledge compounding visualization: monthly KB growth, articles promoted to expert-approved, current coverage percentage *(Layer 2)*

### Internationalization

- [ ] **I18N-01**: All mobile screens, all error messages, all server responses, and all dashboard pages use `t()` for user-facing strings; zero hardcoded English strings exist outside locale files; verified via grep

### Knowledge Pipeline

- [ ] **KB-01**: Failed embeddings are queued via Inngest with exponential backoff and retry; zero articles remain un-embedded after retry completes; dashboard shows retry status
- [ ] **KB-02**: Qdrant uses tiered multitenancy — shared fallback shard for small tenants, dedicated shards for tenants with >1000 articles; two orgs cannot retrieve each other's articles
- [ ] **KB-03**: Search queries with 3+ filters (orgId + brand + category) use ACORN and return relevant results at >90% precision
- [ ] **KB-04**: Multilingual search normalizes German umlauts, Turkish dotless-i, Serbian Latin/Cyrillic via ASCII folding; verified with test queries in all 7 languages
- [ ] **KB-05**: Karpathy Wiki compilation transforms raw articles into structured wiki entries (problem/symptoms/diagnosis/resolution/references) before embedding; A/B test across 20 queries shows compiled wins 80%+ *(Layer 2)*
- [ ] **KB-06**: When AI guidance references a KB article during live session, mobile UI displays tappable source citation with article title *(Layer 2)*
- [ ] **KB-07**: Camera auto-identifies equipment manufacturer/model from nameplate and preloads relevant KB articles before technician asks *(Layer 2)*

### DevOps & Observability

- [ ] **DEVX-01**: Every PR triggers GitHub Actions CI pipeline: lint, type-check, unit tests, build (Turborepo-cached); failing test blocks merge; green badge on main
- [ ] **DEVX-02**: Sentry captures errors from both web dashboard (Next.js SDK) and mobile app (React Native SDK) with request IDs, user context, release version, and source-mapped stack traces
- [ ] **DEVX-03**: Maestro E2E test covers critical path: launch → login → start session → receive guidance → end session → view summary; runs in CI on EAS build
- [ ] **DEVX-04**: Pre-deploy checklist script validates: no `console.log` in source, required env vars present, DB migrations applied, health endpoint responds, no `z.any()` in router schemas
- [ ] **DEVX-05**: PostHog tracks session_started and session_ended events with org_id, user_id, session duration; feature flag for tiered pricing rollout; funnel: login → session → feedback *(Layer 2)*
- [ ] **DEVX-06**: Post-session auto-generated email to business owner with findings, error codes, and AI-suggested follow-ups via React Email + Resend; delivered within 5 minutes of session end *(Layer 2)*

### Mobile UX

- [ ] **UX-01**: Haptic feedback on session state transitions (idle → listening → processing → speaking) with 3 distinct vibration patterns; verified on both iOS and Android physical devices *(Layer 2)*
- [ ] **UX-02**: Maestro E2E test: start session → kill network → verify connection-lost overlay appears within 3s → restore network → verify reconnection or clean restart *(Layer 2)*

## v1.2 Requirements

Deferred to v1.2 Competitive Edge milestone. Tracked but not in current roadmap.

### Advanced Knowledge

- **AK-01**: Technician selects equipment type before session; relevant KB articles preloaded; first response <2s faster
- **AK-02**: Fork & maintain expo-two-way-audio with 24kHz playback and AEC
- **AK-03**: Replace imperative session state with typed state machine; all transitions testable
- **AK-04**: Virtual filesystem over Qdrant (bash-tool: grep/cat/find for exact-match + vector similarity)
- **AK-05**: Docling PDF ingestion: HVAC manufacturer PDFs → structured KB articles via Python sidecar
- **AK-06**: Source citation with page reference for PDF-sourced KB articles

### Sensor Integration

- **SENS-01**: BLE sensor integration with Fieldpiece/testo: live temperature, pressure, superheat/subcool
- **SENS-02**: Combined visual + sensor reasoning: Gemini receives camera frames AND sensor readings
- **SENS-03**: On-device equipment ID via YOLO: <500ms identification without Gemini
- **SENS-04**: Offline intelligence: MMKV-cached KB + small model for basic diagnostics

### Platform Integration

- **PLAT-01**: FSM integration (ServiceTitan API): sessions linked to work orders
- **PLAT-02**: Customer-facing session report: exportable branded PDF
- **PLAT-03**: Multi-technician session: senior tech joins junior's live session
- **PLAT-04**: Equipment fleet management with predictive maintenance flags

## Out of Scope

| Feature | Reason |
|---------|--------|
| On-device AI fallback (Gemma 4 E2B) | Wait for Gemini Live to prove limitations |
| Public REST API | No external integrations needed yet |
| Session recording & playback (audio/video) | GDPR complexity, not core to copilot value; structured data playback (DASH-06) covers the need |
| AR annotation layer | Interesting but not needed for initial validation |
| Landing page | Separate Framer project, not in this codebase |
| Smart glasses support | Smartphone-only eliminates adoption barriers |
| Pre-authored SOP/workflow builder | AI reasons in real time, no content investment needed |
| Gamification / leaderboards | Creates perverse incentives, ruins trust |
| In-app per-session billing | Discourages usage |
| Real-time chat between technicians | Not core to copilot value |
| Video call / screen sharing | Technicians can use existing tools |
| White-labeling | Enterprise tier, future consideration |
| Emotion recognition / sentiment analysis | EU AI Act explicitly prohibits workplace emotion recognition |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | Phase 10 | Pending |
| AI-02 | Phase 10 | Pending |
| AI-03 | Phase 10 | Pending |
| SESS-01 | Phase 10 | Pending |
| SESS-02 | Phase 10 | Pending |
| SESS-03 | Phase 10 | Pending |
| SESS-04 | Phase 10 | Pending |
| COST-01 | Phase 10 | Pending |
| COST-02 | Phase 10 | Pending |
| COST-03 | Phase 12 | Pending |
| PRICE-01 | Phase 10 | Pending |
| PRICE-02 | Phase 10 | Pending |
| DASH-01 | Phase 11 | Pending |
| DASH-02 | Phase 11 | Pending |
| DASH-03 | Phase 11 | Pending |
| DASH-04 | Phase 11 | Pending |
| DASH-05 | Phase 11 | Pending |
| DASH-06 | Phase 11 | Pending |
| DASH-07 | Phase 11 | Pending |
| DASH-08 | Phase 11 | Pending |
| DASH-09 | Phase 11 | Pending |
| I18N-01 | Phase 11 | Pending |
| KB-01 | Phase 12 | Pending |
| KB-02 | Phase 12 | Pending |
| KB-03 | Phase 12 | Pending |
| KB-04 | Phase 12 | Pending |
| KB-05 | Phase 12 | Pending |
| KB-06 | Phase 12 | Pending |
| KB-07 | Phase 12 | Pending |
| DEVX-01 | Phase 13 | Pending |
| DEVX-02 | Phase 13 | Pending |
| DEVX-03 | Phase 13 | Pending |
| DEVX-04 | Phase 13 | Pending |
| DEVX-05 | Phase 13 | Pending |
| DEVX-06 | Phase 13 | Pending |
| UX-01 | Phase 13 | Pending |
| UX-02 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 35 total (20 Layer 1, 15 Layer 2)
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 after milestone v1.1 initialization*
