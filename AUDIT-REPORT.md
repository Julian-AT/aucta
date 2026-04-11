# Aucta v2 Deep Audit Report

**Date:** 2026-04-10
**Scope:** All planning docs, full codebase, research, architecture, roadmap
**Purpose:** Inform v2 architecture upgrade decisions

---

## Executive Summary

v1.0 shipped successfully (60/62 requirements). The codebase is a strong prototype with clean patterns (repository + DI, layered prompts, hybrid search), first-class EU AI Act compliance, and a sophisticated knowledge base architecture. However, it is **not production-ready** due to: wildcard CORS with credentials, missing service layer, a 455-line god hook orchestrating the entire session, zero i18n infrastructure, no observability (Sentry/PostHog listed but not installed), and silent Qdrant failures that invisibly degrade the KB.

The highest-leverage v2 investments are: (1) fix security blockers, (2) add service layer, (3) rewrite session orchestration as a state machine, (4) implement i18n, (5) add the web dashboard, (6) adopt Gemini inference tiers + Karpathy Wiki compilation for cost/quality.

---

## 1. By the Numbers

| Metric | Value |
|--------|-------|
| Implementation LOC | ~9,600 |
| Test LOC | ~7,700 |
| Test:Code ratio | 0.80:1 |
| Files | ~134 source, ~43 test |
| Packages | 5 (ai, api, db, shared, auth) |
| Apps | 2 (mobile, server) |
| DB migrations | 4 |
| Inngest jobs | 4 (sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth) |
| tRPC routers | 4 (session, knowledge, org, invite) |
| AI tools | 3 (lookupErrorCode, logFinding, searchKnowledgeBase) |
| E2E tests | 0 |
| v1.0 requirements shipped | 60/62 |

---

## 2. Planning Doc Health

### Current & Useful
- `ROADMAP.md` — Accurate milestone tracker
- `PROJECT.md` — Living project doc with 56 v1.0 + 20 v1.1 requirements
- `STATE.md` — Correct GSD state (v1.1 at 0%)
- `FULL-PRODUCT-INVENTORY.md` — Best tracking doc, 551 lines
- `RETROSPECTIVE.md` — Valuable lessons (wire integrations same phase, clean dead code immediately)
- `research/PITFALLS.md` — 10 critical v1.1 pitfalls
- `research/DASHBOARD-AND-DX-RESEARCH.md` — Next.js 16 patterns, tRPC SSE, DX optimization
- `research/REALTIME-AI-INFERENCE.md` — Latency budgets, audio pipeline, Qdrant tuning
- `research/SELF-LEARNING-KB-RESEARCH.md` — Multi-tenant RAG, knowledge atomization, Docling

### Stale / Needs Update
- `milestones/v1.0-ROADMAP.md` — Progress table frozen before Phases 6-7 completed
- `milestones/v1.0-MILESTONE-AUDIT.md` — Status still "gaps_found" despite all blockers resolved
- `research/SUMMARY.md` — v1.0-era open questions, some resolved during dev
- `MILESTONE-CONTEXT.md` — Deleted from working tree but tracked in git

### Contradictions Found
1. v1.0-ROADMAP shows Phase 6 "not started" / Phase 7 "in progress" — both are complete
2. KB-10 (manual text input): unchecked in REQUIREMENTS but listed as "BUILT" in INVENTORY
3. Milestone audit status never updated to "resolved" after Phase 6-7 fixes

---

## 3. Architecture Assessment

### Grade: B+

**Strengths:**
- Clean package boundaries (no circular deps)
- Repository pattern with constructor injection everywhere
- DTO boundaries via Zod at every seam
- Type safety: tRPC + Zod + Drizzle = DB-to-mobile type chain
- Event-driven async pipeline (Inngest)
- EU AI Act compliance woven into every layer

**Weaknesses (ranked by severity):**

#### CRITICAL: No service layer
Routers contain business logic. `session.router.ts` creates ephemeral tokens, builds system prompts, assembles tool declarations, dispatches tool calls, manages session lifecycle, and lazy-inits Qdrant — all inline. Same for `knowledge.router.ts`. Business logic must move to service classes.

#### CRITICAL: God hook — `useGeminiSession.ts` (455 lines)
Orchestrates 10+ concerns: token acquisition, WebSocket connection, audio capture/playback, frame capture, tool relay, reconnection, session cleanup, persistence, store management. Impossible to test state transitions reliably. Must be rewritten as an explicit state machine.

#### HIGH: Thin server shell
`apps/server/src/index.ts` (83 lines) is manual Bun.serve() with no middleware pipeline, no health check, no graceful shutdown, no request ID tracing. Creates Inngest handler on every request (line 62).

#### HIGH: Missing dashboard
v1.1 requires Next.js 16 dashboard. Zero web infrastructure exists yet — expected, but planning for it affects architecture decisions now (shared packages, auth session handling web vs mobile, tRPC SSE on Vercel serverless).

---

## 4. Security Issues

### CRITICAL
1. **Wildcard CORS with credentials** — `apps/server/src/index.ts:23`: any origin reflected. Combined with `Access-Control-Allow-Credentials: true`, this allows credentialed requests from any domain. Production blocker.
2. **No CSRF protection** — tRPC endpoints accept credentialed requests from any origin.
3. **No rate limit on `session.createToken`** — can exhaust Gemini API key quota.

### HIGH
4. **Non-validated env vars** — `DATABASE_URL!`, `GEMINI_API_KEY!` crash at runtime if unset. Should validate at startup.
5. **40+ console.log in production paths** — logs request bodies, auth cookies, response data. Leaks sensitive data.
6. **No input sanitization beyond Zod** — string fields stored without XSS sanitization. Future dashboard rendering = XSS vector.
7. **IP spoofing via x-forwarded-for** — trusted without validation, bypasses rate limiting.

### MEDIUM
8. **Invite codes: insufficient brute-force protection** — 6-char codes with 100/60s rate limit.
9. **No password complexity requirements** on sign-up.
10. **Debug logging leaks request bodies** in tRPC provider.

---

## 5. Performance Issues (Critical Path)

### Real-Time Pipeline Latency Chain
```
Mobile → Bun Server (ephemeral token) → Direct WebSocket to Gemini
→ Audio/Video Streaming ↔ Tool calls relayed through Bun Server
→ Response audio streamed to mobile
```

### Issues
1. **Tool relay adds ~200-500ms per call** — Gemini → mobile → server → execute → mobile → Gemini. The mobile-as-middleman hop is unnecessary.
2. **No audio chunk configuration** — relies on native defaults. Optimal for Gemini Live: 250ms chunks.
3. **Hardcoded frame capture** — 1 FPS at 768px. No adaptive quality for slow connections.
4. **120s reconnection timeout** — too long for field app. Should offer escape after 15-30s.
5. **No WebSocket keepalive** — NAT timeouts can silently drop connections on mobile networks.
6. **Audio playback drift** — scheduling math accumulates errors on GC pauses / network jitter.
7. **In-memory knowledge filtering** — fetches all articles then filters in JS. Degrades at scale.
8. **Inngest handler created per request** — `inngestServe()` called inside request handler.

---

## 6. Missing Implementations

| Feature | Importance | Status |
|---------|-----------|--------|
| i18n (7 languages) | CORE VALUE PROP | Zero implementation |
| Web dashboard | v1.1 MILESTONE | Not started |
| Sentry error tracking | PRODUCTION REQ | Listed, not installed |
| PostHog analytics | PRODUCTION REQ | Listed, not installed |
| Health check endpoint | PRODUCTION REQ | Missing |
| Graceful server shutdown | PRODUCTION REQ | Missing |
| Request ID / tracing | OBSERVABILITY | Missing |
| Push notifications | ENGAGEMENT | Not implemented |
| Screen wake lock | UX | Listed, not used |
| Offline write queue | RESILIENCE | Only MMKV read cache exists |
| Session events table | DASHBOARD DEP | Missing (needed for session playback) |
| GitHub Actions CI | INFRA | Referenced but not implemented |

---

## 7. What's Genuinely Excellent

1. **EU AI Act compliance** — Non-dismissible AI indicator, mandatory disclosure modal, safety prompt with explicit competence boundaries, F-Gas EU 2024/573 awareness. First-class, not bolted on.

2. **Knowledge base architecture** — 4-tier confidence (unverified → technician_reviewed → expert_approved → master_reference), verification workflow, LLM compilation, cross-article linking, hybrid search with RRF, coverage gap + stale + conflict detection.

3. **Repository pattern execution** — 9 repos, all consistent structure, `generateId()` with meaningful prefixes, Zod-validated output, Drizzle contained.

4. **Mobile session UX** — Camera-first fullscreen, orientation-aware, animated indicators, 56dp touch targets, proper safe area handling.

5. **Prompt architecture** — Layered composable system (core + HVAC expertise + safety). Simple and extensible.

6. **buildTool() factory** — Consistent tool definitions with Zod → JSON Schema conversion, dependency injection, timeout handling.

---

## 8. New Research Findings (Supplemental)

### 8.1 Gemini Inference Tiers
- **Priority tier** (75-100% premium): non-sheddable, for live sessions. Verify if applicable to Live API.
- **Flex tier** (50% discount): sheddable, for background KB processing. Use for compilation pipeline.
- **Implicit caching**: Gemini 2.5+ auto-caches repeated system instruction prefixes. ~75% savings on prefix tokens. Zero code changes needed — just ensure deterministic system instructions.

### 8.2 Virtual Filesystem Pattern (just-bash + ChromaFs)
Vercel's `bash-tool` + Mintlify's ChromaFs pattern: virtual FS over vector DB. Agent can `grep`, `cat`, `find` across KB. ~100ms boot (vs ~46s for sandboxes). Precise retrieval (exact string matches) that vector search can't do. Maps directly to per-company KB with Qdrant backing.

### 8.3 expo-two-way-audio
Bidirectional PCM streaming with AEC for Expo. Community go-to for Gemini Live + Expo. **Gotcha:** 16kHz playback only — Gemini outputs 24kHz. Fork and extend. Low activity (1 contributor, last commit Jan 2025) — plan to maintain internally.

### 8.4 Qdrant 1.16 Tiered Multitenancy
Eliminates Pool-to-Silo migration. Small tenants share fallback shard; large tenants promoted to dedicated shards transparently. Also: ACORN search (97.2% accuracy with multi-filter vs 53.3% without), inline storage (10x QPS on disk), configurable RRF `k`, ASCII folding for multilingual search.

### 8.5 Karpathy's LLM Wiki Pattern
Treat KB construction like compilation: raw docs → LLM processing → structured wiki entries → optimized store. Denser, more predictable embeddings, lower hallucination risk. Pairs with existing PIPA pipeline. Use Flex tier for compilation.

### 8.6 Mobile App Patterns (Google Lens, ChatGPT Voice, Perplexity)
- Pre-connect WebSocket at app launch, not session start
- Scene-change detection to reduce frame sends (60-80% bandwidth savings)
- "Pulsing orb" visual feedback pattern
- Source citations for trust
- Haptic feedback for state transitions (critical for hands-busy technicians)

---

## 9. Prioritized Action Plan

### P0 — Fix Before Any Deployment
| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Fix wildcard CORS — whitelist specific origins | 1h | Security blocker |
| 2 | Validate all env vars at startup | 1h | Reliability |
| 3 | Rate limit session.createToken | 30m | Security |
| 4 | Strip console.log, add structured logger (pino) | 2h | Security + perf |
| 5 | Add health check endpoint | 30m | Infrastructure |

### P1 — Core Architecture Upgrades
| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 6 | Extract service layer from routers | 1-2d | Architecture |
| 7 | Rewrite useGeminiSession as state machine | 2-3d | Reliability + testability |
| 8 | Implement i18n foundation (react-i18next + string extraction) | 2-3d | Core value prop |
| 9 | Add Next.js 16 dashboard foundation (apps/web) | 2-3d | v1.1 milestone |
| 10 | Handle Qdrant failures explicitly (retry queue, alerts) | 1d | KB reliability |

### P2 — Performance & AI Quality
| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 11 | Move tool execution server-side (eliminate mobile middleman) | 2d | -200-500ms per tool call |
| 12 | Add WebSocket keepalive pings | 2h | Connection reliability |
| 13 | Configure audio chunk size (250ms) | 1h | Audio latency |
| 14 | Add scene-change detection for adaptive frame capture | 1d | Bandwidth savings |
| 15 | Use Gemini Flex tier for background processing | 2h | 50% cost savings |
| 16 | Implement Karpathy Wiki compilation pipeline | 2-3d | KB quality |

### P3 — DX & Infrastructure
| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 17 | Set up GitHub Actions CI with Turborepo caching | 1d | Developer workflow |
| 18 | Integrate Sentry (Next.js + RN SDKs) | 1d | Observability |
| 19 | Integrate PostHog (analytics + feature flags) | 1d | Product analytics |
| 20 | Add Maestro E2E tests for critical path | 2d | Quality assurance |
| 21 | Implement expo-keep-awake during sessions | 30m | UX polish |
| 22 | Add graceful server shutdown | 1h | Reliability |

### P4 — Knowledge Base Enhancements
| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 23 | Adopt Qdrant tiered multitenancy (1.16+) | 1d | Scale + isolation |
| 24 | Build virtual filesystem KB interface (bash-tool) | 2-3d | Retrieval precision |
| 25 | Add document upload + processing (Docling sidecar) | 3-5d | KB content |
| 26 | SQL-level knowledge list filtering | 2h | Performance |

---

## 10. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Gemini Live API "Preview" breaking changes | HIGH | Pin API version, abstract connection layer, have fallback to standard API |
| Session cost: $0.35-$0.50 per 15min vs EUR 29/month | HIGH | Implicit caching, Flex tier, session duration limits, usage analytics |
| EU AI Act deadline: August 2, 2026 (< 4 months) | HIGH | Compliance already first-class, focus on documentation + audit trail |
| NativeWind v5 preview instability | MEDIUM | Already committed (user decision). Pin version, test on every SDK update |
| tRPC SSE + Vercel serverless timeout limits | MEDIUM | Use edge functions or polling fallback for dashboard real-time |
| expo-two-way-audio unmaintained | MEDIUM | Fork, extend, maintain internally |

---

## Conclusion

The v1.0 codebase is a solid foundation with clean architectural patterns and genuine domain expertise baked in. The path to v2 is not a rewrite but a targeted hardening: fix security (P0), extract the service layer and session state machine (P1), add the dashboard and i18n (P1), then layer on performance optimizations and KB enhancements (P2-P4). The new research findings (Gemini tiers, virtual FS, Qdrant 1.16, Karpathy Wiki) provide concrete paths to better AI quality at lower cost.
