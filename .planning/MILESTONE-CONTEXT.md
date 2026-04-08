# Milestone v1.1 Context: Market-Ready

**Created:** 2026-04-08
**Based on:** Deep analysis of TECH-SPEC.md, LEGAL-ADMIN.md, v1.0 audit, and full codebase inventory

## What v1.0 Delivered

v1.0 shipped 2026-04-07 (7 phases, 30 plans, 22,867 LOC, 374 files, 5 days). Intentionally simplified:

- Full mobile AI copilot: camera + audio → Gemini Live → spoken guidance
- 3 of 10 AI tools (lookupErrorCode, logFinding, searchKnowledgeBase)
- Full auth with org/roles/invites/RBAC
- Full knowledge base backend (ingest → compile → retrieve → verify → health)
- Session lifecycle with summaries, feedback, offline cache
- EU AI Act in-session compliance (non-dismissible indicator, AI labels, no emotion recognition)
- 43 test files, zero TODOs/FIXMEs — clean codebase

## Gap Analysis: Spec vs v1.0

| Domain | Spec | v1.0 | Gap |
|--------|------|------|-----|
| AI Tools | 10 tools | 3 built | 7 tools missing |
| Web Dashboard | 6 sections (Next.js) | Nothing | Entire app missing (apps/web does not exist) |
| i18n | 7 languages | English-only UI | Core USP undelivered |
| Observability | Sentry + PostHog | Zero | No error tracking or analytics |
| Legal/GDPR | Privacy policy, Impressum, DPAs, data rights, TOS | In-session compliance only | Pre-launch legal pages missing |
| Auth completeness | Password reset, email verification | Login/signup only | Missing screens |
| Push notifications | Escalation alerts, summaries | Nothing | No infrastructure |
| Mobile UX | Tutorial, session history, stats, language picker | Session + settings only | Several screens missing |
| Background jobs | 10 Inngest functions | 4 built | 6 missing (GDPR, analytics, email, billing, invite expiry) |
| Email | Transactional email (React Email + Resend) | Nothing | packages/email empty |
| Billing | Stripe + RevenueCat | Nothing | Free during validation — intentionally deferred |
| Expert escalation | Full workflow with context handoff | Nothing | Tool + push infra needed |
| Equipment OCR | Dataplate extraction | Nothing | AI sees video but no structured extraction |
| ColPali PDF upload | Multimodal RAG for manuals | Nothing | Python sidecar required |

## Milestone Strategy: 2 Milestones

### Why 2, not 1 or 3

- **Not 1:** ~40+ plans spanning dashboard, i18n, legal, tools, mobile UX. Double v1.0 scope with no natural break. Scope risk too high.
- **Not 3:** Splitting "mobile ready" / "dashboard" / "AI expansion" creates a milestone with no buyer surface. In B2B SaaS the buyer (owner) and user (technician) are different — the owner needs a dashboard to see value. A mobile-only milestone is a demo, not a launch.
- **2 milestones** create a clean value boundary: v1.1 = launch-ready product, v1.2 = deeper product for validation period.

---

## v1.1: "Market-Ready" (~20 plans, 6 phases)

**Goal:** A Vienna HVAC business owner can sign up, invite their multilingual team, technicians use the AI copilot in their language, and the owner monitors activity from a web dashboard — all GDPR and EU AI Act compliant.

**Unlocks:** First real customer deployment. The complete go-to-market story.

### Phase 1: i18n Foundation + Mobile Settings (~3 plans)
- react-i18next + expo-localization infrastructure, `packages/i18n/`
- Extract all hardcoded strings from 14 screens, 7 language JSON files
- Language preference picker, theme persistence to MMKV

### Phase 2: Observability & Auth Completeness (~3 plans)
- Sentry integration (mobile + server, source maps, error boundaries)
- PostHog integration (mobile events, server events, feature flags)
- Password reset screen, email verification gating, bootstrap `packages/email/` with React Email + Resend

### Phase 3: Legal & GDPR Compliance (~3 plans)
- Datenschutzerklarung, Impressum, TOS (in-app + web-renderable)
- GDPR Inngest jobs: `gdpr.export`, `gdpr.delete`, `invite.expire`
- EU AI Act risk classification document (regulatory, not code)

### Phase 4: Dashboard Foundation (~4 plans)
- Next.js 16 bootstrap (`apps/web/`), Turbopack, Tailwind v4
- **Architecture decision: migrate `apps/server/` into Next.js API routes** (84-line Bun server → `apps/web/app/api/`). Single Vercel deployment. Matches TECH-SPEC.
- Better Auth web integration, login/signup, org context
- Dashboard shell (sidebar, header, shadcn/ui), cookie consent, Sentry/PostHog web SDKs

### Phase 5: Dashboard Core Screens (~5 plans)
- DASH-01 Overview (live sessions via tRPC SSE, today's numbers, trends, alerts)
- DASH-03 Team management (roster, invite flow, roles)
- DASH-02 Session explorer (search, filter, detail view)
- DASH-06 Org settings (profile, AI config, escalation contacts)
- `email.sessionSummary` Inngest job (email summary to manager)

### Phase 6: Mobile Polish & Integration (~2 plans)
- Session history screen, knowledge feedback prompt, tutorial overlay (3 screens)
- EAS build verification (human), cross-platform E2E flow (owner dashboard → technician mobile)

### Deferred from v1.1
All 7 remaining AI tools, push notifications, expert escalation, equipment OCR, DASH-04 Analytics, DASH-05 KB Management, personal stats, billing.

---

## v1.2: "Deepen & Scale" (~15 plans, 5 phases)

**Goal:** Expand AI from 3 to 10 tools, add analytics and KB management to dashboard, wire push notifications and expert escalation, drive retention during 3-6 month validation.

### Phase 1: AI Tools Batch 1 (~3 plans)
- getEquipmentSpecs, getOrgProcedure, getWiringDiagram, calculateRefrigerantCharge

### Phase 2: AI Tools Batch 2 + Push Notifications (~3 plans)
- checkSafetyRecall, identifyPart, escalateToExpert
- Push notification infrastructure (expo-notifications, token registration)

### Phase 3: Dashboard Analytics & KB Management (~4 plans)
- DASH-04 Analytics (usage trends, cost analysis, quality metrics)
- DASH-05 KB management (article browser, verification queue, manual text upload)

### Phase 4: Mobile UX & Retention (~3 plans)
- Personal stats screen, equipment dataplate OCR, knowledge feedback loop

### Phase 5: Integration Hardening (~2 plans)
- Full E2E with all 10 tools, DPA documentation, EU AI Act deadline prep

---

## Deferred Beyond v1.2

| Feature | Reason |
|---------|--------|
| Billing (Stripe + RevenueCat) | Free during 3-6 month validation |
| Offline AI (Gemma 4 E2B) | Wait for Gemini Live limitations |
| PDF manual upload (ColPali) | Python sidecar, disproportionate infra |
| Multi-agent architecture | Single Gemini session sufficient |
| FSM integrations | Not needed for validation |
| Public REST API | No external integrators yet |
| Session recording | GDPR consent complexity |
| Cross-org learning | Single-org first |

## Key Architecture Decision

**Migrate `apps/server/` → Next.js API routes in v1.1 Phase 4.** The current Bun server (`apps/server/src/index.ts`) is 84 lines handling tRPC, Better Auth, and Inngest. Moving to `apps/web/app/api/` creates a single Vercel deployment, matches the TECH-SPEC, eliminates CORS, and unifies the server. Mobile app points tRPC at `app.domain.com/api/trpc`.

## Codebase Findings Worth Noting

- **Theme switching is cosmetic only:** Settings screen `handleThemeChange` sets local `useState`, no MMKV persistence, no root-level dark class application
- **`knowledge/health-check-complete` event goes nowhere:** Emitted by health job but nothing consumes it
- **`react-i18next` installed but not configured:** In dependencies, zero translation files, no init
- **`@notifee/react-native` installed but unused:** Zero references in source
- **`expo-network` + `@react-native-community/netinfo` both installed:** Potential duplicate, neither used
- **`packages/email/` exists but empty:** React Email + Resend not bootstrapped
- **No password reset screen:** Better Auth supports it, no UI exists
- **Email verification not enforced:** `emailVerified` flag not checked during login/org operations
- **18 human verification items** from v1.0 still untested on real devices

## Research Recommendation

Skip research for v1.1 — no novel technology. i18n, Next.js dashboard, legal pages, and observability are all proven patterns on the existing stack. The v1.0 research in `.planning/research/` covers the stack decisions that still apply.
