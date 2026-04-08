# Aucta — Full Product Inventory: TECH-SPEC & LEGAL-ADMIN vs Current State

**Created:** 2026-04-08
**Purpose:** Complete inventory of everything described in TECH-SPEC.md and LEGAL-ADMIN.md, tracked against what exists, what's planned for v1.1/v1.2, and what remains for future milestones.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| BUILT | Shipped in v1.0, verified |
| v1.1 | Planned for milestone v1.1 (Market-Ready) |
| v1.2 | Planned for milestone v1.2 (Deepen & Scale) |
| FUTURE | Not yet scheduled — requires its own milestone |
| N/A | Not applicable or deliberately excluded |

---

## 1. AI Tools (TECH-SPEC Section 3.1)

| # | Tool | Status | Notes |
|---|------|--------|-------|
| 1 | `lookupErrorCode` | BUILT | In-memory JSON from 3 manufacturers (~25 codes each) |
| 2 | `getEquipmentSpecs` | v1.2 | Needs per-org equipment library (new DB table or JSONB) |
| 3 | `getWiringDiagram` | v1.2 | Initially KB search; full ColPali RAG over manuals is FUTURE |
| 4 | `calculateRefrigerantCharge` | v1.2 | Static manufacturer data tables |
| 5 | `checkSafetyRecall` | v1.2 | Initially curated JSON; manufacturer API/scrape is FUTURE |
| 6 | `getOrgProcedure` | v1.2 | Reads from org_settings.custom_system_prompt |
| 7 | `logFinding` | BUILT | Persists to session_findings via tRPC relay |
| 8 | `identifyPart` | v1.2 | Initially returns reference ID; full parts DB is FUTURE |
| 9 | `searchKnowledgeBase` | BUILT | Hybrid BM25 + dense vector via Qdrant |
| 10 | `escalateToExpert` | v1.2 | Requires push notification infrastructure |

**Tool infrastructure:** BUILT — `buildTool()` factory, registry, dispatcher, Zod schemas, Gemini function declarations, async calling.

---

## 2. Session Orchestration (TECH-SPEC Section 3.2)

| Module | Status | Notes |
|--------|--------|-------|
| `orchestrator.ts` | BUILT | Full lifecycle: create → connect → stream → disconnect |
| `connection.ts` | BUILT | WebSocket to Gemini Live |
| `tokenBudget.ts` | PARTIAL | Counter incremented, not actual token tracking. Cost estimation unreliable |
| `systemPrompt.ts` | BUILT | 7-layer assembly via `buildEffectiveSystemPrompt()` |
| `toolDispatcher.ts` | BUILT | Routes toolCalls to registry, handles timeouts |
| `audioProcessor.ts` | BUILT | Float32→Int16 PCM encoding, 16kHz capture |
| `videoProcessor.ts` | BUILT | 1 FPS JPEG at 768px via expo-camera + expo-image-manipulator |
| `reconnection.ts` | BUILT | Exponential backoff, sessionResumption handle |
| `eventLogger.ts` | BUILT | Batched event logging to tRPC |

**`goAway` server message handling:** NOT BUILT — Gemini sends this before server-side termination. Graceful handoff not implemented.

---

## 3. Knowledge Base (TECH-SPEC Section 3.3)

### Ingest Phase

| Ingester | Status | Notes |
|----------|--------|-------|
| `sessionIngester` | BUILT | Extracts CandidateArticle[] from session findings/summary via Gemini |
| `manualIngester` (text) | BUILT | API endpoints exist (knowledge.create), not explicitly verified |
| `manualIngester` (PDF/ColPali) | FUTURE | Python sidecar required — ColPali is Python-only, no JS SDK |
| `feedbackIngester` | v1.2 | Technician corrections → article confidence adjustments |
| `webIngester` | FUTURE | Manufacturer recall notices, regulatory updates via scheduled scrape |

### Compile Phase

| Module | Status | Notes |
|--------|--------|-------|
| `wikiCompiler` / `articleGenerator` | BUILT | LLM generates structured wiki articles from raw data |
| `linker` | BUILT | Auto-generated cross-article backlinks |
| `categorizer` | BUILT | Equipment brand → model → procedure type |
| `deduplicator` | NOT BUILT | Merge duplicate knowledge entries. Not in any milestone plan |

### Verify Phase

| Module | Status | Notes |
|--------|--------|-------|
| `verificationQueue` | BUILT | Backend queue with status transitions |
| `expertReview` workflow | BUILT (backend) | tRPC endpoints work; dashboard UI in v1.2 |
| `consistencyChecker` | NOT BUILT | LLM "lint" for cross-article inconsistencies. FUTURE |
| `factChecker` | NOT BUILT | Cross-reference against manufacturer data. FUTURE |
| `confidenceScorer` | BUILT | 4-tier confidence system |

### Retrieve Phase

| Module | Status | Notes |
|--------|--------|-------|
| `search.ts` | BUILT | Hybrid BM25 + dense vector + metadata filters |
| `embeddings.ts` | BUILT | Gemini embedding-001, 3072 dims |
| `reranker.ts` | BUILT | Cross-encoder reranking |
| `contextBuilder.ts` | BUILT | Formats retrieved articles for prompt injection |

### Health Phase

| Module | Status | Notes |
|--------|--------|-------|
| `healthCheck.ts` | BUILT | Stale detection (90d), coverage gaps, conflicts |
| `coverageAnalyzer.ts` | BUILT | Identifies equipment models lacking documentation |
| `suggestions.ts` | NOT BUILT | LLM suggests new articles, questions to investigate. FUTURE |

### Storage

| Module | Status | Notes |
|--------|--------|-------|
| `vectorStore.ts` (Qdrant) | BUILT | EU-hosted Qdrant client |
| `articleStore.ts` (Postgres) | BUILT | Via Drizzle repositories |
| `fileStore.ts` (Vercel Blob) | NOT BUILT | For PDF originals. Needed when ColPali is built. FUTURE |

---

## 4. Multi-Agent Architecture (TECH-SPEC Section 3.4)

| Agent | Status | Notes |
|-------|--------|-------|
| `DiagnosticAgent` | FUTURE | Multi-step troubleshooting (plan → act → observe → reflect) |
| `SafetyAuditAgent` | FUTURE | Post-session safety compliance report |
| `SummaryAgent` | PARTIAL | Approximated by `sessionSummarize` Inngest job (single LLM call, not multi-step agent) |
| `KnowledgeAgent` | PARTIAL | Approximated by `knowledgeIngest` + `knowledgeCompile` Inngest jobs |

**Spec labels this entire section as "Phase 2."**

---

## 5. Web Dashboard (TECH-SPEC Section 2.2)

| Section | Status | Notes |
|---------|--------|-------|
| Dashboard app (`apps/web/`) | v1.1 | Next.js 16 bootstrap, auth, shell |
| **Overview** — live activity, key numbers, trends, alerts, revenue opportunities | v1.1 | Revenue opportunities display is FUTURE (needs structured extraction) |
| **Team Management** — roster, invites, roles, profiles, skill matrix | v1.1 | Skill matrix (derived from session metadata) is v1.2 |
| **Session Explorer** — search, filter, detail, transcript viewer, export | v1.1 | Transcript viewer requires session transcript storage (NOT BUILT). Export (CSV/PDF) is v1.2 |
| **Analytics** — usage, cost, quality, language, equipment, time-to-competency, first-time fix | v1.2 | First-time fix rate requires FSM integration (FUTURE) |
| **Knowledge Base Management** — articles, verification queue, manual upload, health dashboard | v1.2 | PDF manual upload (ColPali) is FUTURE |
| **Org Settings** — profile, billing, AI config, escalation, data retention, API keys | v1.1 (partial) | Billing is FUTURE. API keys are FUTURE |

### Dashboard Details Not Yet Planned

| Feature | Source | Target |
|---------|--------|--------|
| Revenue opportunities aggregation on Overview | TECH-SPEC 2.2 | FUTURE — needs AI to extract structured revenue opps during sessions |
| Transcript viewer on Session Explorer | TECH-SPEC 2.2 | FUTURE — no transcript stored (stream-and-discard). Opt-in recording needed first |
| Bulk actions on Team Management (deactivate, export) | TECH-SPEC 2.2 | v1.2 or FUTURE |
| Skill matrix on Team Management | TECH-SPEC 2.2 | v1.2 — derived from session metadata |
| Equipment frequency chart on Analytics | TECH-SPEC 2.2 | v1.2 — requires equipment identification data from sessions |
| Time-to-competency metric on Analytics | TECH-SPEC 2.2 | v1.2 — session duration trend for new hires |
| First-time fix rate correlation | TECH-SPEC 2.2 | FUTURE — requires FSM integration |
| Data retention settings in Org Settings | TECH-SPEC 2.2 | FUTURE |
| Notification preferences in Org Settings | TECH-SPEC 2.2 | v1.2 |
| API keys management in Org Settings | TECH-SPEC 2.2 | FUTURE — requires Public REST API |
| Billing/subscription management | TECH-SPEC 2.2 | FUTURE |

---

## 6. Mobile App Features (TECH-SPEC Section 2.1)

### User Journey Steps

| Step | Status | Notes |
|------|--------|-------|
| Download → invite code or QR → auto-join org | BUILT | QR scanner + 6-char code entry |
| Tutorial overlay (3 screens max) | v1.1 | Not yet built |
| Two taps to start session | BUILT | |
| Camera activates → AI greets in detected language | BUILT | |
| Hands-free voice interaction | BUILT | |
| Equipment identification from dataplate | v1.2 | Structured extraction not built |
| Expert escalation (tap button or say "I need help") | v1.2 | Requires escalateToExpert tool + push infra |
| End session (tap or voice) → feedback → knowledge feedback → summary | BUILT (partial) | Knowledge feedback prompt is v1.1 |
| View past session summaries | v1.1 | API exists, no UI screen |
| Personal stats | v1.2 | |
| Browse cached knowledge articles offline | NOT PLANNED | Only sessions cached in MMKV, not articles |
| Language preference setting | v1.1 | |
| Check for app updates | NOT BUILT | expo-updates OTA not wired |

### Critical UX Requirements

| Requirement | Status |
|-------------|--------|
| Max two taps to start session | BUILT |
| 56x56dp touch targets | BUILT |
| WCAG AAA contrast | BUILT — needs human verification in sunlight |
| Audio-first, no typing during session | BUILT |
| Portrait + landscape | BUILT |
| Non-dismissible AI indicator | BUILT |
| Offline cache: session summaries | BUILT (MMKV, 20-session LRU) |
| Offline cache: knowledge articles | NOT BUILT |
| Screen wake lock | BUILT (expo-keep-awake) |

### Mobile Screens Not Yet Built

| Screen | Target |
|--------|--------|
| Session history (list of past sessions) | v1.1 |
| Tutorial overlay (3 screens) | v1.1 |
| Password reset | v1.1 |
| Email verification prompt | v1.1 |
| Personal stats | v1.2 |
| Language preference picker | v1.1 |

### Mobile UX Bugs/Debt

| Issue | Notes |
|-------|-------|
| Theme switching is cosmetic only | `handleThemeChange` sets `useState`, not persisted to MMKV, no root-level dark class. Fix in v1.1 |
| Debug logging in session-provider.tsx | `console.log` on every state change. Strip for production |
| `@notifee/react-native` installed but unused | Zero references. Remove or wire for push notifications in v1.2 |
| `expo-network` + `@react-native-community/netinfo` both installed | Potential duplicate. Neither used in source |

---

## 7. Background Jobs — Inngest (TECH-SPEC Section 10)

| # | Job | Status | Notes |
|---|-----|--------|-------|
| 1 | `session.summarize` | BUILT | Gemini 2.5 Pro structured summary |
| 2 | `knowledge.ingest` | BUILT | Extracts articles, embeds to Qdrant |
| 3 | `knowledge.compile` | BUILT | Merges related articles, re-embeds |
| 4 | `analytics.aggregate` | v1.2 | Daily rollup of session_events |
| 5 | `billing.meter` | v1.2 | Hourly session count tracking (not billing) |
| 6 | `gdpr.export` | v1.1 | Package org data, email download link |
| 7 | `gdpr.delete` | v1.1 | Cascade delete, anonymize, purge Qdrant |
| 8 | `email.sessionSummary` | v1.1 | Send summary to manager |
| 9 | `invite.expire` | v1.1 | Daily cron to mark expired codes |
| 10 | `audit.archive` | FUTURE | Monthly archive of old audit logs |

**Also built (not in spec):** `knowledge.health` — daily cron at 3 AM for coverage gaps, stale detection.

**Known gap:** `knowledge/health-check-complete` event is emitted but nothing consumes it. No alerting.

---

## 8. Database Schema (TECH-SPEC Section 9)

### Application Tables

| Table | Status | Notes |
|-------|--------|-------|
| `ai_sessions` | BUILT | All fields including token counts, feedback, summary, tools_used |
| `session_events` | NOT BUILT | Granular event log per session. Spec calls for it, not implemented |
| `session_findings` | BUILT | Per-finding records |
| `session_tool_calls` | BUILT | Per-tool-call records |
| `technician_profiles` | NOT BUILT | Extended technician data (specialties, total_sessions, avg_rating). FUTURE |
| `invite_codes` | BUILT | Custom invite system |
| `audit_log` | BUILT | Immutable action trail |
| `org_settings` | BUILT | custom_system_prompt, industry type, location |

### Knowledge Tables

| Table | Status |
|-------|--------|
| `knowledge_articles` | BUILT |
| `knowledge_verifications` | BUILT |
| `knowledge_links` | BUILT |

### Scaling

| Feature | Status | Trigger |
|---------|--------|---------|
| TimescaleDB extension | FUTURE | When session_events > 10M rows (~10K sessions) |
| Table partitioning for session_events | FUTURE | Same trigger |

### Missing Schema Items

| Item | Source | Notes |
|------|--------|-------|
| `session_events` table | TECH-SPEC 9.1 | Granular event log not implemented. Events are logged via batch tRPC calls but no dedicated table |
| `technician_profiles` table | TECH-SPEC 9.1 | Extended profile (specialties, stats). Data derived from sessions but no dedicated table |
| `revenue_opportunities` jsonb on ai_sessions | TECH-SPEC 9.1 | Field exists in spec, not confirmed in schema |
| `equipment_identified` jsonb on ai_sessions | TECH-SPEC 9.1 | Field exists in spec, not confirmed in schema |

---

## 9. Authentication & Authorization (TECH-SPEC Section 6.4)

| Feature | Status | Notes |
|---------|--------|-------|
| Better Auth with organization plugin | BUILT | |
| Roles: owner, manager, technician | BUILT | |
| RBAC permissions (org-scoped) | BUILT | |
| Expo plugin for mobile deep linking | BUILT | |
| Session tokens in expo-secure-store | BUILT | |
| Password reset via email | v1.1 | Better Auth supports it, no screen exists |
| Email verification gating | v1.1 | `emailVerified` not checked during login/org ops |
| SSO | FUTURE | Enterprise tier |
| Web auth (dashboard) | v1.1 | |

### Permissions (from TECH-SPEC)

| Permission | Status |
|------------|--------|
| `org:sessions:view` | BUILT |
| `org:sessions:manage` | BUILT |
| `org:team:invite` | BUILT |
| `org:team:manage` | BUILT |
| `org:settings:edit` | BUILT |
| `org:billing:manage` | FUTURE |
| `org:analytics:view` | v1.2 |
| `org:analytics:export` | v1.2 |
| `org:knowledge:verify` | BUILT (backend) |

---

## 10. Security (TECH-SPEC Section 5)

| Measure | Status |
|---------|--------|
| TLS 1.3 for all connections | BUILT (infra-level) |
| Neon Postgres AES-256 at rest | BUILT (infra-level) |
| Ephemeral tokens (API key never reaches client) | BUILT |
| Better Auth session tokens | BUILT |
| RBAC via tRPC middleware | BUILT |
| Zod input validation on all procedures | BUILT |
| Audit trail (append-only) | BUILT |
| Org data isolation (org_id in every query) | BUILT |
| Rate limiting (Upstash) | BUILT |

---

## 11. Legal & Regulatory (LEGAL-ADMIN.md)

### GDPR/DSGVO (Section 5.1)

| Requirement | Status | Notes |
|-------------|--------|-------|
| Datenschutzerklarung (German privacy policy) | v1.1 | Listing all processing activities, legal bases, retention, sub-processors |
| Impressum (Austrian law) | v1.1 | Mediengesetz + E-Commerce-Gesetz |
| DPAs with sub-processors (Neon, Upstash, Qdrant, Vercel, Google, Resend, Sentry, PostHog) | FUTURE | Business/legal action, not code |
| Sub-processor register (public) | v1.2 | Public page listing sub-processors |
| Data subject rights — access (Art. 15) | v1.1 | Via gdpr.export Inngest job |
| Data subject rights — rectification (Art. 16) | FUTURE | Requires manual workflow or API |
| Data subject rights — erasure (Art. 17) | v1.1 | Via gdpr.delete Inngest job |
| Data subject rights — portability (Art. 20) | v1.1 | Via gdpr.export (JSON/CSV) |
| Data export for org owners | v1.1 | |
| Account deletion workflow | v1.1 | Via gdpr.delete |
| Cookie consent (web dashboard) | v1.1 | |
| Double opt-in for marketing emails | FUTURE | No marketing emails yet |
| Verzeichnis der Verarbeitungstatigkeiten (Art. 30) | FUTURE | Document, not code. Before DSB 2026 audit wave |
| Interessenabwagung (balancing test for Art. 6(1)(f)) | FUTURE | Document for audio/video streaming legal basis |
| Knowledge base as new processing activity documentation | FUTURE | |

### EU AI Act (Section 5.2) — Deadline August 2, 2026

| Requirement | Status | Notes |
|-------------|--------|-------|
| Non-dismissible AI indicator during sessions | BUILT | |
| AI-generated content labels on summaries | BUILT | |
| AI-generated content labels on KB articles | BUILT | |
| No emotion recognition | BUILT | |
| Written risk classification rationale | v1.1 | Limited-risk, not high-risk |
| Documentation trail for DSB | v1.1 | |

### F-Gas EU 2024/573 (Section 5.3)

| Requirement | Status | Notes |
|-------------|--------|-------|
| AI references new F-Gas regulation | BUILT | In safetyRulesPrompt |
| Low-GWP refrigerant alternatives (R-290, CO2, R-32) | BUILT | In system prompt |
| Enhanced leak-check thresholds (>= 5 tonnes CO2eq) | BUILT | In system prompt |
| Certification gating (refuse guidance without valid F-Gas cert) | FUTURE | Needs dashboard F-Gas cert tracking |
| 7-year certification refresher alerts | FUTURE | Dashboard feature |
| F-Gas certification tracking in dashboard | FUTURE | |

### Product Liability Directive 2024/2853 (Section 5.4) — Transposition by December 9, 2026

| Requirement | Status | Notes |
|-------------|--------|-------|
| Aggressive disclaimers at session start | BUILT | AI disclosure modal + system prompt |
| AI scope limitation (refuses out-of-competence work) | BUILT | |
| Opt-in session logging for liability evidence | FUTURE | GDPR consent framework needed |
| Terms of Service with liability limitation | v1.1 | |
| Legal counsel review before launch | FUTURE | Business action |

### EU Data Act (Section 5.5)

| Item | Status | Notes |
|------|--------|-------|
| Strategic positioning (equipment data access by design) | N/A | Regulatory tailwind, not implementation |
| Manufacturer data API integrations | FUTURE | Phase 2-3, leveraging Data Act obligations |

### NIS2 / NISG 2026 (Section 5.6)

| Item | Status | Notes |
|------|--------|-------|
| Direct compliance | N/A | Below thresholds (250+ employees, EUR 50M revenue) |
| Supply chain security documentation for enterprise customers | FUTURE | Enterprise tier feature |

---

## 12. Pricing & Billing (LEGAL-ADMIN Section 6)

| Feature | Status | Notes |
|---------|--------|-------|
| Free distribution phase (3-6 months) | ACTIVE | No billing needed |
| Stripe web payments | FUTURE | After validation |
| RevenueCat mobile subscriptions | FUTURE | After validation |
| Usage metering (sessions per tech/month) | v1.2 | billing.meter Inngest job (tracking only) |
| Tier gating (Starter/Professional/Enterprise) | FUTURE | |
| Billing portal | FUTURE | |
| Pricing validation (interviews) | FUTURE | Business action |

---

## 13. Infrastructure & Deployment (TECH-SPEC Sections 11-12)

| Feature | Status | Notes |
|---------|--------|-------|
| Vercel deployment (dashboard) | v1.1 | When apps/web is built |
| EAS Build (mobile) | BUILT (config) | Needs human verification on device |
| EAS Submit (app store) | FUTURE | Pre-launch |
| Neon PR branch databases in CI | NOT BUILT | Spec calls for copy-on-write per PR |
| EAS Build trigger on mobile changes in CI | NOT BUILT | |
| OTA updates (expo-updates) | NOT BUILT | |
| Docker compose for local dev (Postgres + Redis + Qdrant) | NOT BUILT | `tooling/docker/` spec'd but not created |
| Domain setup (app.domain.com → Vercel) | FUTURE | Pre-launch |
| Server migration (Bun → Next.js API routes) | v1.1 | Architecture decision |

---

## 14. Observability & Testing (TECH-SPEC Sections 6.7, 13)

| Tool | Status | Notes |
|------|--------|-------|
| Biome (lint + format) | BUILT | |
| Vitest (unit/integration) | BUILT | 43 test files |
| MSW v2 (WebSocket mocking) | BUILT | |
| Sentry (error tracking) | v1.1 | Not integrated |
| PostHog (analytics + feature flags) | v1.1 | Not integrated |
| Playwright (web E2E) | v1.2+ | Dashboard must exist first |
| Maestro (mobile E2E) | FUTURE | YAML flows not written |
| @vercel/otel (distributed tracing) | FUTURE | Phase 2, with billing/latency debugging |

---

## 15. i18n (TECH-SPEC Section 6.2)

| Feature | Status | Notes |
|---------|--------|-------|
| react-i18next + expo-localization | v1.1 | Installed but not configured |
| 7 language JSON files (en, de, tr, sr, hr, pl, ro) | v1.1 | |
| TypeScript-safe translation keys | v1.1 | |
| `packages/i18n/` shared translations | v1.1 | |
| Dashboard i18n | v1.1 | Wire from day one |
| Gemini auto language detection (AI responses) | BUILT | Native Gemini capability, works without i18n infra |

---

## 16. Email (TECH-SPEC Section 6.8)

| Feature | Status | Notes |
|---------|--------|-------|
| `packages/email/` (React Email + Resend) | v1.1 | Directory exists, empty |
| Password reset email template | v1.1 | |
| Email verification template | v1.1 | |
| Session summary email to manager | v1.1 | |
| GDPR export download link email | v1.1 | |
| Invite notification email | FUTURE | |
| Marketing emails (double opt-in) | FUTURE | |

---

## 17. Future Considerations (TECH-SPEC Section 14)

| Feature | Spec Timeline | Status | Earliest Milestone |
|---------|--------------|--------|--------------------|
| Human expert handoff | Phase 1 | v1.2 | v1.2 |
| Revenue opportunity identification | Phase 1 | NOT BUILT | v1.2 (in AI prompts, requires structured extraction) |
| Offline AI (Gemma 4 E2B via LiteRT) | Phase 2 | NOT BUILT | v2.0+ |
| Public REST API (zod-to-openapi) | Phase 2 | NOT BUILT | v2.0+ |
| Session recording & playback | Phase 2 | NOT BUILT | v2.0+ (GDPR consent framework needed) |
| Dispatcher view | Phase 2 | NOT BUILT | v2.0+ (needs job/ticket model) |
| AR annotation layer | Phase 2-3 | NOT BUILT | v2.0+ (YOLO + ARKit/ARCore) |
| Structured compliance checklists | Phase 2 | NOT BUILT | v2.0+ (digital sign-off, exportable PDF) |
| F-Gas certification tracking | Phase 2 | NOT BUILT | v2.0+ (dashboard feature) |
| Equipment recognition database | Phase 2 | v1.2 (partial) | v1.2 (OCR), v2.0+ (curated DB) |
| ServiceTitan/Housecall Pro integration | Phase 3 | NOT BUILT | v2.0+ (webhook system first) |
| Smart glasses support | When Meta Orion ships | NOT BUILT | v3.0+ |
| BIM/Digital Twin integration | Phase 3 | NOT BUILT | v3.0+ |
| White-labeling | Enterprise tier | NOT BUILT | v2.0+ |
| DACH expansion | After Vienna validation | N/A | After PMF |
| SOC 2 Type II | Before first enterprise deal | N/A | ~6 months before enterprise |
| TimescaleDB | session_events > 10M rows | NOT BUILT | When needed |
| OpenTelemetry (@vercel/otel) | Phase 2 | NOT BUILT | v2.0+ |
| Cross-organization learning | Phase 2 | NOT BUILT | v2.0+ (architecture supports it — nullable org_id) |

---

## 18. Go-to-Market & Investor (LEGAL-ADMIN Sections 8-10)

These are business actions, not code — tracked here for completeness.

| Action | Status | Notes |
|--------|--------|-------|
| Pitch deck targeting Speedinvest ("Physical AI" thesis) | NOT STARTED | Need live demo first |
| WKO SHL outreach in Vienna | NOT STARTED | Need functioning multilingual product (v1.1) |
| 5-10 pilot HVAC businesses | NOT STARTED | Target for validation phase |
| Trade show presence (ISH, IFH Intherm) | NOT STARTED | |
| Case studies documenting ROI | NOT STARTED | Need 3-6 months of pilot data |
| Pricing validation interviews (10+ owners) | NOT STARTED | |
| Legal counsel review | NOT STARTED | Required before any public launch |

---

## 19. Competitive Feature Gaps (LEGAL-ADMIN Section 3)

Features competitors have that we don't yet:

| Competitor | Feature They Have | Our Status |
|------------|------------------|-----------|
| XOi Technologies | Revenue opportunity analytics (24% uplift per request) | FUTURE — AI prompts can reference, no structured extraction |
| XOi Technologies | Dataplate OCR asset intelligence | v1.2 |
| Augmentir | AR overlays, no-code workflow builder | FUTURE (AR); N/A (workflow builder is anti-feature per spec) |
| Aquant / Comfort Systems "Mark" | Human expert handoff for 3,600 techs | v1.2 |
| Aquant / Comfort Systems "Mark" | Full offline AI | FUTURE (Gemma 4 E2B) |
| Aquant / Comfort Systems "Mark" | 700+ OEM manual integration | FUTURE (ColPali + manufacturer APIs) |
| Intelligent Technician | 7+ days offline, edge-native | FUTURE (Gemma 4 E2B, but not 7 days) |
| BrightAI | Workforce wearables | N/A (smartphone-only strategy) |
| FieldMind | Active tribal knowledge from Slack/docs | PARTIAL — KB ingests from sessions, not external sources yet |

---

## 20. Risk Register Status (LEGAL-ADMIN Section 12)

| Risk | Mitigation Status |
|------|------------------|
| Gemini API outage/deprecation | PARTIAL — `LiveSessionProvider` abstraction exists. Gemma offline fallback NOT BUILT |
| GDPR enforcement action | v1.1 — privacy-by-design (BUILT), Art. 30 records (FUTURE), DPAs (FUTURE) |
| Product liability claim | PARTIAL — disclaimers (BUILT), scope limitation (BUILT). Session logging (FUTURE), TOS (v1.1), legal review (FUTURE) |
| Technician adoption resistance | BUILT — voice-first UX, 30-second onboarding, multilingual |
| Competitor enters with more funding | PARTIAL — first-mover in Austrian market; regulatory moat needs documentation |
| Poor connectivity at job sites | PARTIAL — reconnection (BUILT), cached summaries (BUILT). Offline AI (FUTURE) |
| EU AI Act non-compliance | v1.1 — indicators (BUILT), labels (BUILT), no emotion (BUILT). Risk doc (v1.1) |
| Pricing too low for sustainability | NOT ADDRESSED — cost validation not done. Session costs $0.35-$0.50 vs EUR 29/month |

---

## Summary: Milestone Coverage

| Milestone | Items | Focus |
|-----------|-------|-------|
| **v1.0** (SHIPPED) | Mobile copilot, 3 tools, auth, KB backend, session lifecycle | Core AI loop |
| **v1.1** (NEXT) | i18n, observability, legal, dashboard foundation + core screens, email, mobile polish | Market-ready product |
| **v1.2** (PLANNED) | 7 more tools, push notifications, expert escalation, analytics, KB management UI, OCR | Deeper product for validation |
| **v2.0+** (FUTURE) | Billing, offline AI, PDF upload (ColPali), multi-agent, FSM integrations, session recording, compliance checklists, public API | Scale + enterprise features |
| **v3.0+** (FUTURE) | AR overlay, BIM/Digital Twin, smart glasses, DACH expansion, SOC 2 | Platform expansion |

---

*This document should be updated at each milestone boundary to reflect current state.*
