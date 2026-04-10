---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Market-Ready
status: active
stopped_at: null
last_updated: "2026-04-10"
last_activity: 2026-04-10
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 0
  completed_plans: 0
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time.
**Current focus:** v1.1 Market-Ready — Phase 10 (Gemini Migration & Session Hardening) next

## Current Position

Phase: Defining requirements for remaining phases (10-13)
Plan: —
Status: Phases 8-9 complete, defining requirements for Phases 10-13
Last activity: 2026-04-10 — Milestone v1.1 requirements definition started

Progress: [███░░░░░░░] 33%

## What Was Done (2026-04-10)

### Phase 8: Architecture Upgrade (COMPLETE)
- Deep codebase audit → AUDIT-REPORT.md
- P0: CORS hardening (explicit allowlist), env validation (Zod), structured JSON logger, request IDs, graceful shutdown, health endpoints
- P1: SessionService + KnowledgeService extracted from routers (service layer pattern)
- P1: useGeminiSession hook refactored into smaller modules (session-callbacks.ts, session-lifecycle.ts)
- STANDARDS.md written (10 sections: architecture, errors, security, logging, AI, mobile, testing, git, files, deps)

### Phase 9: Dashboard & i18n Foundation (COMPLETE)
- Next.js 16 dashboard (apps/web): layout, tRPC provider, 5 pages (overview, sessions, KB, team, settings)
- i18n foundation: 7 languages (en, de, tr, sr, hr, pl, ro) in packages/shared/src/i18n/
- Mobile i18n: expo-localization auto-detect, react-i18next, converted key components (AIDisclosure, AIIndicator, ConnectionLost, Feedback)
- Web i18n: browser language detection, I18nProvider wired into root layout

### Deep Audit (2026-04-10)
- Comprehensive 10-section AUDIT-REPORT.md with competitive landscape, cost model, and 30-item prioritized action plan
- Identified P0 blocker: Gemini 3.1 dropped async function calling → server-side tool execution required
- Cost analysis: $0.35-$0.50/session unsustainable at EUR 29 flat → tiered pricing mandatory
- Competitive benchmark: MeasureQuick ($49/mo, 100K+ users) is primary competitor
- Milestones revised: v1.1 expanded from 4 to 6 phases (10-13) with Layer 1/Layer 2 structure
- v1.2 Competitive Edge planned (phases 14-16): sensor integration, edge AI, platform integrations

## Reference Documents

GSD agents: read these files before starting any phase work. They contain research, analysis, and quality criteria that inform every step.

- **`.planning/AUDIT-REPORT.md`** — 10-section deep audit: architecture critique with specific file:line references, AI pipeline cost model ($0.35-$0.50/session breakdown, optimization levers), KB pipeline gaps (singleton anti-pattern, missing retry queue), dashboard scope (what owners actually need vs stubs), tech stack validation (keep/replace/add/avoid), competitive landscape (MeasureQuick $49/mo 100K users, XOi $230M funding, Aquant, Augmentir), 15 innovation opportunities ranked by impact/effort, risk register (technical + business + regulatory), 30-item prioritized action plan (P0-P4)
- **`.planning/EVAL-FRAMEWORK.md`** — 25 test scenarios (safety 5, tool use 5, knowledge 5, multilingual 3, UX 4, edge cases 3) with binary pass criteria. Scoring: Safety 30%, Tool Use 25%, Knowledge 20%. Pass threshold: overall >= 0.85, no category < 0.70. Use during plan and verify steps.
- **`.planning/research/SUPPLEMENTAL-RESEARCH-REPORT.md`** — Gemini Flex/Batch tiers, Qdrant 1.16 ACORN + tiered multitenancy, Karpathy Wiki pattern, Silero VAD, expo-two-way-audio, mobile UX patterns
- **`.planning/research/PITFALLS.md`** — Known gotchas: CORS migration, Bun/Metro compat, NativeWind v5, Expo SDK 55 breaking changes
- **`STANDARDS.md`** — Code conventions: service layer pattern, error handling, logging, package boundaries

## Accumulated Context

### Decisions

- Service layer pattern adopted: business logic in services, routers are thin wrappers
- ErrorWithCode in services → errorConverter middleware → TRPCError (never throw TRPCError directly)
- Structured JSON logger replaces all console.log
- CORS: explicit origin allowlist only, never reflect arbitrary origins
- i18n: shared translations in @aucta/shared, app-specific initialization
- Dashboard: Next.js 16 with Turbopack, shadcn/ui, tRPC integration
- Gemini 3.1 Flash Live is the target model (replacing 2.5)
- Server-side tool execution is P0 (mobile relay adds 200-500ms blocking latency)
- Tiered pricing: EUR 29 (30 sessions), EUR 49 (60), EUR 79 (unlimited) — flat unlimited is unsustainable
- Karpathy Wiki compilation pipeline for KB v2 (compile before embed)
- Qdrant 1.16 tiered multitenancy for scaling

### Pending Todos

- Phase 10: Gemini 3.1 migration, server-side tool execution, singleton fix, keepalive, VAD, scene detection
- Phase 11: Dashboard with real data (session feed, KB CRUD, team mgmt, auth flow, billing)
- Phase 12: KB v2 (Karpathy Wiki, retry queue, Qdrant 1.16, ACORN, Flex tier, visual recognition)
- Phase 13: CI/CD, Sentry, PostHog, Maestro E2E, session intelligence emails, haptics

### Blockers/Concerns

- Gemini 3.1 Flash Live is "Preview" — API surface may change, pricing uncertain
- Gemini 3.1 dropped async function calling — server-side tool execution is mandatory
- Session resumption unreliable per developer reports — design for clean restart
- Session cost economics: $0.35-$0.50 per 15-min session, must optimize to <$0.25
- EU AI Act transparency deadline: August 2, 2026
- Product Liability Directive transposition deadline: December 9, 2026
- i18next needs to be installed via `bun install` before next build
- expo-two-way-audio has 1 contributor, last commit Jan 2025 — plan to fork

## Session Continuity

Last session: 2026-04-10
Stopped at: Phase 10 (Gemini Migration & Session Hardening) not started
Resume file: None
