# Product Requirements Document (PRD)

## HVAC AI Copilot — Architecture, Strategy & Technical Specification

**Version:** 2.0
**Date:** April 3, 2026
**Status:** Foundation / Pre-Development
**Audience:** Founding team, technical leads, investors, legal counsel

---

## 1. Executive Summary

An AI copilot for HVAC technicians that provides real-time visual and voice guidance through a smartphone camera. The AI watches what the technician sees, listens to their questions in any language, and speaks back expert-level guidance — like having a master HVAC technician looking over their shoulder on every job.

This is not a replacement for ServiceTitan, Housecall Pro, or any existing field service management (FSM) software. It is a new category: **AI-powered skill augmentation for physical work**. It complements existing tools by making every technician — regardless of experience level or native language — perform like a 10-year veteran.

**Initial market:** HVAC businesses in and around Vienna, Austria (5,393+ enterprises in the SHL sector).

**Business model:** B2B SaaS. The business owner buys the product, technicians use the app. Free distribution during validation phase, transitioning to per-seat subscription pricing.

**Core USP:** Multilingual real-time AI guidance. Vienna's HVAC workforce includes native speakers of Turkish, Serbian, Croatian, Polish, Romanian, and other languages. No competitor addresses the language barrier that is a daily reality on European job sites.

---

## 2. Stakeholder Map

Every person who touches or is affected by the product. Architecture, permissions, and features must account for all of these roles.

### 2.1 Internal to the HVAC Business

| Role                         | Surface            | What They Need                                                     | Key Metrics They Care About                                                         |
| ---------------------------- | ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Business Owner**           | Dashboard          | ROI justification, cost control, competitive advantage, compliance | Revenue per technician, callback rate, training cost reduction, AI cost per session |
| **Operations Manager**       | Dashboard          | Workforce oversight, scheduling efficiency, quality assurance      | Active sessions, session quality scores, technician utilization, error rates        |
| **Dispatcher**               | Dashboard (future) | Job assignment context, technician skill matching                  | Technician availability, skill-job matching, first-time fix rate                    |
| **Technician (experienced)** | Mobile App         | Quick reference, validation of decisions, documentation            | Session speed, parts identified, confidence in unfamiliar equipment                 |
| **Technician (new hire)**    | Mobile App         | Step-by-step guidance, language support, safety reminders          | Learning curve reduction, time to first solo job, safety compliance                 |
| **Apprentice**               | Mobile App         | Training mode, supervised learning, skill assessment               | Skills verified, training hours logged, supervisor sign-off                         |

### 2.2 External

| Role                                          | Interaction                              | What They Need                                                        |
| --------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| **End Customer** (homeowner/building manager) | Indirect — sees technician using the app | Faster, more accurate service; confidence in the technician           |
| **Equipment Manufacturer**                    | Integration partner (future)             | Product manuals and diagnostics surfaced through AI; brand visibility |
| **Regulatory Body**                           | Compliance verification                  | Proof that safety procedures were followed; audit trail               |
| **Insurance Provider**                        | Risk assessment                          | Evidence of standardized procedures; reduced incident rates           |

### 2.3 Internal to Our Company

| Role                    | Surface                      | What They Need                                                    |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Sales/BD**            | CRM + landing page analytics | Lead tracking, conversion metrics, demo scheduling                |
| **Customer Success**    | Dashboard admin view         | Onboarding progress, usage trends, churn signals                  |
| **Product/Engineering** | Internal analytics           | Feature adoption, session quality, error rates, model performance |

---

## 3. Competitive Positioning

### 3.1 Category Definition

This product occupies a new category — **AI Skill Augmentation** — that sits alongside existing FSM software, not in competition with it.

| Category                   | Examples                                               | What They Do                               | Our Relationship                                                               |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| Field Service Management   | ServiceTitan ($250–400/tech/mo), Housecall Pro, Jobber | Scheduling, dispatch, invoicing, CRM       | **Complement** — we make their technicians better, not replace their workflows |
| Connected Worker Platforms | Augmentir, Atheer, ScopeAR                             | Digitized checklists, remote expert assist | **Compete** — they require pre-authored SOPs; we reason in real time           |
| General AI Assistants      | ChatGPT, Gemini app, Claude                            | General knowledge, text-based              | **Differentiate** — we are purpose-built for physical work with live video     |

### 3.2 Why We Win

1. **Real-time visual reasoning.** Not pre-authored SOPs. The AI sees the actual equipment and adapts.
2. **Automatic multilingual support.** No configuration needed. The technician speaks; the AI responds in their language.
3. **Zero hardware requirement.** Smartphone only. No smart glasses, no headsets, no IT department approval.
4. **30-second onboarding.** Scan QR code → join org → start using. No training required.
5. **Data flywheel.** Every session makes the AI context smarter. Early movers accumulate the deepest domain knowledge.
6. **Complementary pricing.** At a fraction of ServiceTitan's per-tech cost, we are an easy add-on decision, not a platform replacement.

### 3.3 Integration Strategy

The product must integrate with, not replace, the tools HVAC businesses already use.

**Phase 1 (MVP):** Standalone. No integrations. Pure AI copilot.

**Phase 2:** Webhook/API system allowing third-party tools to push job context into AI sessions (equipment type, customer history, past service notes) and receive session summaries back.

**Phase 3:** Native integrations with ServiceTitan, Housecall Pro, and Jobber — the three most common FSM tools in the DACH region. Session summaries auto-attach to job records.

**Architecture implication:** The API layer must be designed from day one with a public API in mind. tRPC handles internal app-to-app communication; a separate REST API gateway (versioned, key-authenticated) will serve third-party integrations. This is an additional `apps/api-gateway` or a set of Next.js API routes with OpenAPI documentation.

---

## 4. Core Surfaces & User Journeys

### 4.1 Mobile App (Technician-Facing)

**Primary user:** Technician on a job site.
**Core interaction:** Point camera → talk → receive spoken guidance.

**User Journey:**

1. **First use:** Download app → enter invite code or scan QR → auto-join organization → brief tutorial overlay (3 screens max) → ready
2. **Starting a session:** Tap "Start Session" → camera activates → AI greets in detected language → technician describes the job or just points at equipment → AI begins guidance
3. **During a session:** Hands-free voice interaction → AI identifies equipment, suggests next steps, warns about safety issues → technician can ask follow-up questions → AI adapts to what it sees in real time
4. **Ending a session:** Tap stop or say "end session" → optional feedback (1–5 stars + note) → session summary generated → summary available in history
5. **Between sessions:** View past session summaries → see personal stats → update language preference → check for app updates

**Critical UX Requirements:**

- Maximum two taps to start a session from app launch
- Large, glove-friendly touch targets (technicians wear work gloves)
- High-contrast UI readable in direct sunlight
- Audio-first interaction — the technician should never need to type during a session
- Works in portrait and landscape (phone may be propped up or held at angles)

### 4.2 Web Dashboard (Owner/Manager-Facing)

**Primary users:** Business owner, operations manager.
**Core interaction:** Monitor team performance, manage organization, review sessions.

**Dashboard Sections:**

**Overview (Home):**

- Live activity: active sessions right now (count + technician names)
- Today's key numbers: sessions completed, total AI time, estimated cost
- Week/month trends: session volume, avg duration, language distribution
- Alerts: low-rated sessions, unusually long sessions, connection failures

**Team Management:**

- Technician roster with status (online/offline/in-session)
- Invite flow: generate code/link → set role (technician/manager) → set expiry
- Individual technician profiles: session history, performance trend, language, specialties
- Bulk actions: deactivate, reassign role, export data
- Skill matrix: which technicians have handled which equipment types (derived from session metadata)

**Session Explorer:**

- Searchable/filterable session history across entire organization
- Session detail view: timeline of events, duration, language, token usage, cost, feedback
- Transcript viewer (when available): AI responses with timestamps
- Export: CSV/PDF for compliance documentation

**Analytics:**

- Usage trends: sessions per day/week/month, peak usage hours
- Cost analysis: total AI cost, cost per session, cost per technician, projected monthly spend
- Quality metrics: average feedback rating, reconnection rate, error rate
- Language breakdown: which languages are used, how often
- Equipment frequency: most commonly encountered equipment types (from session metadata)
- Time-to-competency: session duration trend for new hires (do they get faster?)
- First-time fix rate correlation: if integrated with FSM, track whether AI-assisted jobs have fewer callbacks

**Organization Settings:**

- Company profile, billing, subscription management
- AI configuration: custom system prompt additions (company-specific procedures, safety protocols, preferred brands)
- Data retention settings
- Notification preferences
- API keys (for future integrations)

### 4.3 Landing Page (Framer — Marketing)

Fully decoupled at `domain.com`. No shared backend. Links to `app.domain.com` for signup.

**Key pages:** Hero + value prop, features, pricing, testimonials, demo booking (Calendly/Cal.com embed), blog (Framer CMS), legal pages (Impressum, Datenschutzerklärung).

**Conversion flow:** `domain.com` → "Get Started" CTA → redirects to `app.domain.com/signup` → owner creates account → onboarding wizard.

---

## 5. Knowledge Base & AI Context Architecture

The AI's value compounds when it has context beyond general HVAC knowledge. This is the data flywheel.

### 5.1 Context Layers (Injected into Gemini System Prompt)

| Layer                    | Source                          | Scope             | Example                                                                                                        |
| ------------------------ | ------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Base HVAC knowledge**  | Curated system prompt           | All organizations | General HVAC principles, safety procedures, common equipment                                                   |
| **Organization context** | Org settings in dashboard       | Per-org           | "We are Klimatechnik GmbH, we primarily service Daikin and Mitsubishi units, our safety protocol requires XYZ" |
| **Equipment library**    | Uploaded manuals/specs (future) | Per-org           | Specific model numbers, wiring diagrams, error code lookups                                                    |
| **Session history**      | Aggregated from past sessions   | Per-technician    | "This technician has handled 47 Daikin VRV installations"                                                      |
| **Job context**          | FSM integration (future)        | Per-session       | "This is a maintenance call for a 2019 Daikin FTXM, customer reported error code U4"                           |

### 5.2 System Prompt Architecture

The system prompt sent via ephemeral token constraints follows a layered structure:

1. **Core behavior:** Role definition, safety-first mandate, language adaptation rules
2. **HVAC expertise:** Domain knowledge, common procedures, troubleshooting frameworks
3. **Organization overlay:** Company-specific instructions from dashboard settings
4. **Safety rules:** Always-on safety warnings for refrigerant handling, electrical work, fall hazards

The dashboard allows owners/managers to add organization-specific instructions (free text, validated for length/appropriateness) that get appended to the system prompt for all sessions in their org. This is a key differentiator — it makes the AI customizable per business without requiring any technical knowledge.

---

## 6. Safety & Compliance Features

HVAC work involves real physical risks. The product must actively support safety, not just avoid liability.

### 6.1 AI Safety Behaviors

- **Proactive safety warnings:** When the AI sees electrical panels, refrigerant lines, or height-related scenarios, it should mention relevant safety precautions without being asked
- **Lockout/tagout reminders:** For electrical work, the AI should remind technicians about isolation procedures
- **Refrigerant handling:** The AI should reference F-Gas regulation (EU 517/2014) requirements when relevant
- **Scope limitation:** The AI must clearly state when a situation requires a licensed electrician, plumber, or specialist — and refuse to guide work outside its competence boundaries
- **Emergency response:** If a technician describes an emergency (gas leak, electrical shock, injury), the AI should provide immediate first-response guidance and advise calling emergency services

### 6.2 Compliance Documentation

Session logs serve as a lightweight compliance trail:

- Timestamp of every AI session
- Equipment identified (when detectable)
- Safety warnings issued
- Duration and outcome
- Exportable as PDF per session or in bulk

This is not a formal compliance system, but it provides documentation that businesses can use for insurance, quality audits, and regulatory inspections.

---

## 7. Regulatory Architecture

### 7.1 GDPR (DSGVO) — Mandatory, Austria-Based

As an Austria-based SaaS processing personal data of EU residents, GDPR compliance is non-negotiable and affects every architectural decision.

**Data Classification:**

| Data Type                                       | Classification                            | Legal Basis                        | Retention                                         |
| ----------------------------------------------- | ----------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| User account data (name, email)                 | Personal data                             | Contract necessity (Art. 6(1)(b))  | Duration of account + 30 days                     |
| Audio recordings (AI sessions)                  | Personal data (voice biometric potential) | Legitimate interest (Art. 6(1)(f)) | Not stored by default — streamed and discarded    |
| Video frames (AI sessions)                      | Personal data (may contain faces)         | Legitimate interest (Art. 6(1)(f)) | Not stored by default — streamed and discarded    |
| Session metadata (timestamps, duration, tokens) | Personal data (linked to user)            | Contract necessity                 | Per org data retention setting, default 12 months |
| Analytics aggregates                            | Anonymized/pseudonymized                  | Legitimate interest                | Indefinite                                        |

**Critical architectural decision:** Audio and video frames are streamed directly from the mobile app to Gemini's API via WebSocket. They are NOT stored on our servers. This eliminates the largest GDPR surface area. Session metadata (timestamps, duration, cost, feedback) is stored and subject to standard GDPR controls.

**Required implementations:**

- **Datenschutzerklärung (Privacy Policy):** German-language, DSGVO-compliant, listing every processing activity with legal basis, retention period, and sub-processor
- **Impressum:** Required by Austrian law (Mediengesetz, E-Commerce-Gesetz), must be accessible within 2 clicks from every page
- **Data Processing Agreements (AVV/AV-Vertrag):** Signed DPAs with all sub-processors (Neon, Upstash, Vercel, Google/Gemini, Resend, Sentry, PostHog)
- **Sub-processor register:** Public list of all sub-processors with data categories and transfer safeguards
- **Data subject rights:** Automated workflows for access (Art. 15), rectification (Art. 16), erasure (Art. 17), portability (Art. 20) — must respond within 30 days
- **Data export:** Organization owners can export all their org data (JSON/CSV) at any time
- **Account deletion:** Full deletion workflow that removes all personal data and anonymizes session metadata
- **Cookie consent:** Not applicable on mobile app; required on dashboard (use a GDPR-compliant consent banner, EU data residency for analytics)
- **Double opt-in:** Required in Austria for marketing emails

**Sub-processor data residency:** Neon Postgres offers EU regions (Frankfurt). Upstash has EU regions. Vercel has EU edge nodes. Verify that all sub-processors can guarantee EU data residency or have adequate Standard Contractual Clauses (SCCs).

### 7.2 EU AI Act — Transparency Obligations (August 2026)

The HVAC AI Copilot is a **deployer** of a general-purpose AI model (Gemini), not a provider of an AI system. This distinction matters.

**Risk classification:** The product likely falls under **limited risk (transparency obligations)**, not high risk. It does not involve biometric identification, critical infrastructure control, employment decisions, or any Annex III category. It provides guidance and recommendations; it does not make autonomous decisions affecting individuals' rights.

**Required transparency measures (by August 2, 2026):**

- **AI interaction disclosure:** Users (technicians) must be clearly informed they are interacting with an AI system, not a human expert. This must be shown at session start and in the app's information section.
- **AI-generated content marking:** If session summaries or reports are generated by AI, they must be marked as AI-generated.
- **No emotion recognition in workplace:** The AI must not assess, infer, or report technicians' emotional states to their employers. Session quality is measured by explicit feedback and objective metrics only.

**Architecture implication:** Every AI session must display a clear, non-dismissible indicator that the guidance comes from an AI system. Session summaries must carry an "AI-generated" label.

### 7.3 F-Gas Regulation (EU 517/2014)

Technicians working with fluorinated refrigerants must hold valid F-Gas certification. The product should:

- Not replace or substitute certification requirements
- Include a disclaimer that AI guidance does not replace certified training
- Reference F-Gas procedures when relevant in AI guidance

---

## 8. Security Architecture

### 8.1 Data Security

| Layer                | Measure                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Data in transit**  | TLS 1.3 for all HTTP/WSS connections                                                                  |
| **Data at rest**     | Neon Postgres encrypts at rest by default (AES-256); Upstash Redis encrypts at rest                   |
| **API key security** | Gemini API key never reaches the client; ephemeral tokens with constrained permissions                |
| **Authentication**   | Better Auth with session tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore)       |
| **Authorization**    | Role-based access control via Better Auth organization plugin; permissions checked in tRPC middleware |
| **Input validation** | Zod schemas on every tRPC procedure; server-side validation only (never trust client)                 |

### 8.2 Audit Trail

Every significant action is logged to an `audit_log` table:

- User authentication events (login, logout, failed attempts)
- Organization changes (member added/removed, role changed, settings modified)
- Session lifecycle events (started, ended, failed)
- Data export requests
- Admin actions (invite created, account deactivated)

Each audit entry includes: timestamp, actor (user ID), action type, target entity, IP address, and metadata. Audit logs are immutable (append-only) and retained for the legal minimum period.

### 8.3 Organizational Data Isolation

Multi-tenant architecture with strict data isolation:

- Every database query includes `org_id` filtering — enforced at the tRPC middleware level, not left to individual router implementations
- Technicians can only see their own sessions; managers can see sessions within their org; owners can see everything in their org
- No cross-org data access is possible through the API

---

## 9. Tech Stack Decisions

Every decision is justified with a single reason. Open-source is chosen over paid when quality is comparable.

### 9.1 Monorepo Foundation

| Decision                  | Tool                    | Why                                                                                                                           |
| ------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Build orchestrator        | **Turborepo**           | Vercel-native, minimal config, auto-detects workspace structure                                                               |
| Package manager + runtime | **Bun**                 | 25–30× faster installs than npm; transparent `node_modules` for Metro compatibility; Turborepo supports `bun.lock` since v2.6 |
| Language                  | **TypeScript (strict)** | End-to-end type safety from DB schema to mobile UI                                                                            |

### 9.2 Frontend

| Decision                     | Tool                                  | Why                                                                                       |
| ---------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| Mobile framework             | **Expo SDK 53+**                      | Managed workflow, EAS Build/Update, New Architecture by default                           |
| Mobile navigation            | **Expo Router**                       | File-based routing, typed routes, deep linking                                            |
| Dashboard framework          | **Next.js 15**                        | App Router, RSC for data-heavy views, Vercel-native                                       |
| Dashboard styling            | **Tailwind CSS v4**                   | Utility-first, shared design tokens                                                       |
| Mobile styling               | **NativeWind v4 + Tailwind v3**       | v5 unstable; v4 production-proven                                                         |
| Dashboard components         | **shadcn/ui**                         | Copy-paste ownership, Radix primitives, accessible                                        |
| Mobile components            | **React Native Reusables**            | shadcn philosophy for React Native, NativeWind-based                                      |
| Client state (live sessions) | **Zustand**                           | `getState()`/`setState()` outside React — required for WebSocket + native audio callbacks |
| Server state                 | **TanStack Query v5**                 | Request/response caching for tRPC                                                         |
| i18n                         | **react-i18next + expo-localization** | Cross-platform, TypeScript key autocomplete                                               |

### 9.3 API & Data

| Decision     | Tool                          | Why                                                             |
| ------------ | ----------------------------- | --------------------------------------------------------------- |
| Internal API | **tRPC v11**                  | End-to-end type safety; 700K+ weekly downloads                  |
| Validation   | **Zod**                       | Single schema validates tRPC input, forms, and DB inserts       |
| ORM          | **Drizzle ORM**               | 7.4KB footprint, sub-500ms serverless cold starts, SQL-like API |
| Database     | **Neon Postgres (EU region)** | Serverless, branching for previews, EU data residency available |
| Cache        | **Upstash Redis (EU region)** | HTTP-based, rate limiting, ephemeral token caching              |

### 9.4 Authentication

| Decision       | Tool            | Why                                                                                                      |
| -------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| Auth framework | **Better Auth** | Open-source, self-hosted, org plugin with RBAC, Expo plugin, data in your Postgres — zero vendor lock-in |

**Organization model:** `organization()` plugin with roles: `owner`, `manager`, `technician`. Permissions: `org:sessions:view`, `org:sessions:manage`, `org:team:invite`, `org:team:manage`, `org:settings:edit`, `org:billing:manage`, `org:analytics:view`, `org:analytics:export`.

### 9.5 AI / Real-Time

| Decision         | Tool                                 | Why                                                                                                                  |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| AI model         | **Gemini 2.5 Flash Live Preview**    | Real-time multimodal (video + audio) via WebSocket; 1 FPS video; auto language detection; lowest live-streaming cost |
| API key security | **Ephemeral tokens**                 | Short-lived, constrained to system prompt + tools; eliminates WebSocket proxy                                        |
| Audio recording  | **@speechmatics/expo-two-way-audio** | PCM 16kHz/16-bit/mono matching Gemini input; built-in AEC                                                            |
| Audio playback   | **react-native-audio-api**           | `AudioBufferQueueSourceNode` for streaming PCM at 24kHz                                                              |
| Video capture    | **expo-camera**                      | 1 FPS JPEG capture at 768×768                                                                                        |

### 9.6 Infrastructure & Deployment

| Decision                 | Tool                          | Why                                                       |
| ------------------------ | ----------------------------- | --------------------------------------------------------- |
| Dashboard hosting        | **Vercel**                    | Native Turborepo support, preview deploys, edge functions |
| Mobile CI/CD             | **EAS Build + EAS Workflows** | M4 Pro builds, OTA updates, GitHub Actions integration    |
| CI pipeline              | **GitHub Actions**            | Turborepo remote caching                                  |
| WebSocket proxy (future) | **Fly.io**                    | Only if web-based AI sessions needed; $2/month            |

### 9.7 Observability & Quality

| Decision                  | Tool                        | Why                                                            |
| ------------------------- | --------------------------- | -------------------------------------------------------------- |
| Analytics + feature flags | **PostHog** (self-hostable) | Replaces 3 paid services; unlimited flags on free tier; RN SDK |
| Error tracking            | **Sentry**                  | First-class Expo + Next.js SDKs; free tier                     |
| Linting + formatting      | **Biome**                   | Single tool, 35× faster than ESLint + Prettier                 |
| Unit/integration tests    | **Vitest**                  | Vite-native, shared config                                     |
| Web E2E                   | **Playwright**              | WebSocket mocking support                                      |
| Mobile E2E                | **Maestro**                 | Expo-recommended, YAML-based                                   |
| API/WS mocking            | **MSW v2**                  | `ws.link()` for WebSocket interception                         |

### 9.8 Payments & Email

| Decision             | Tool                     | Why                                                    |
| -------------------- | ------------------------ | ------------------------------------------------------ |
| Web payments         | **Stripe**               | Dashboard checkout, billing portal                     |
| Mobile subscriptions | **RevenueCat**           | App Store/Play Store receipts, free under $2,500/month |
| Transactional email  | **React Email + Resend** | React templates, 3,000 free emails/month               |

### 9.9 Mobile-Specific

| Decision                 | Tool                                | Why                                                   |
| ------------------------ | ----------------------------------- | ----------------------------------------------------- |
| Screen wake lock         | **expo-keep-awake**                 | Prevents dimming during sessions                      |
| Android background audio | **@notifee/react-native**           | Foreground service for sustained audio                |
| Push notifications       | **expo-notifications**              | Job alerts, session summaries                         |
| OTA updates              | **expo-updates**                    | Field-deployed B2B app; can't always update via store |
| Local storage            | **MMKV**                            | 30× faster than AsyncStorage, synchronous             |
| Connectivity             | **@react-native-community/netinfo** | Offline detection + reconnection                      |

---

## 10. Monorepo Directory Structure

Designed for end-to-end type safety, LLM readability, and clean separation of concerns. Follows Claude Code's composition pattern: each module is a self-contained directory with co-located logic, types, constants.

```
hvac-copilot/
├── apps/
│   ├── mobile/                          # Expo app (technician-facing)
│   │   ├── app/                         # Expo Router file-based routes
│   │   │   ├── (auth)/                  # Auth screens (login, signup, join-org)
│   │   │   ├── (app)/                   # Authenticated screens
│   │   │   │   ├── session/             # Live AI session
│   │   │   │   ├── history/             # Past sessions
│   │   │   │   └── settings/            # Preferences
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   │   ├── session/                 # Camera, audio, status (co-located)
│   │   │   ├── auth/                    # Login, org join
│   │   │   └── common/
│   │   ├── hooks/                       # useGeminiSession, useAudioRecorder, etc.
│   │   ├── stores/                      # Zustand: session.store.ts, app.store.ts
│   │   ├── lib/
│   │   │   ├── auth-client.ts           # Better Auth + expo plugin
│   │   │   ├── api.ts                   # tRPC client
│   │   │   └── gemini/                  # Connection, protocol, audio, constants
│   │   └── package.json
│   │
│   └── dashboard/                       # Next.js 15 (owner/manager-facing)
│       ├── app/
│       │   ├── (auth)/                  # Auth pages
│       │   ├── (dashboard)/
│       │   │   ├── overview/
│       │   │   ├── sessions/
│       │   │   ├── team/
│       │   │   ├── analytics/
│       │   │   └── settings/
│       │   └── api/                     # tRPC handler, Better Auth, token issuer
│       ├── components/
│       │   ├── dashboard/               # Charts, metrics, data tables
│       │   ├── sessions/                # Session list, detail, transcript
│       │   ├── team/                    # Roster, invite, roles
│       │   └── common/
│       └── package.json
│
├── packages/
│   ├── api/                             # tRPC router definitions
│   │   └── src/
│   │       ├── root.ts                  # Merged router
│   │       ├── trpc.ts                  # Init, context, middleware
│   │       └── routers/                 # auth, org, session, technician, analytics, billing
│   │
│   ├── db/                              # Drizzle ORM schema + client
│   │   └── src/
│   │       ├── client.ts
│   │       ├── schema/                  # users, organizations, members, sessions, events, invites, profiles, audit-log
│   │       ├── relations.ts
│   │       └── types.ts                 # Inferred types from schema
│   │
│   ├── auth/                            # Better Auth shared config
│   │   └── src/                         # server.ts, client.ts, plugins.ts, permissions.ts
│   │
│   ├── shared/                          # Cross-app types, schemas, constants, utils
│   │   └── src/
│   │       ├── schemas/                 # Zod schemas (SINGLE SOURCE OF TRUTH)
│   │       ├── types/                   # Inferred TypeScript types
│   │       ├── constants/               # roles, session-status, languages, limits
│   │       └── utils/                   # format, validate, errors, id generation
│   │
│   ├── ui/                              # Web-only shadcn/ui components
│   ├── email/                           # React Email templates + Resend wrapper
│   ├── i18n/                            # Shared translations (en, de, tr, sr, hr, pl, ro)
│   └── config/                          # Shared tailwind preset, tsconfig presets, biome config
│
├── tooling/
│   ├── scripts/                         # setup.sh, db-reset.sh, generate-types.ts
│   └── docker/                          # Local Postgres + Redis for offline dev
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── GDPR.md                          # Data processing inventory, sub-processor list
│   └── SECURITY.md
│
├── CLAUDE.md                            # LLM project context (auto-loaded by Claude Code)
├── turbo.json
├── package.json                         # packageManager: "bun@1.2.x", workspaces
└── bun.lock
```

### 10.1 End-to-End Type Safety Chain

```
Zod schema (packages/shared)
    → tRPC input validation (packages/api)
    → Drizzle table definition (packages/db)
    → Inferred row types (packages/db/types)
    → TanStack Query hooks (apps/mobile, apps/web)
    → UI rendering (type-checked props)
```

A schema change in `packages/shared` propagates TypeScript errors to every consumer — across both apps. No runtime surprises.

### 10.2 LLM-Optimized Development

This project will be primarily built with AI coding agents (Claude Code). Patterns that maximize LLM productivity:

- **CLAUDE.md at root:** Auto-loaded every session. Contains stack, commands, conventions, forbidden patterns.
- **Co-located files:** Each feature is a directory (component + hook + types + constants), not scattered across global folders.
- **Descriptive file names:** `session.router.ts` not `router.ts`; `useAudioRecorder.ts` not `useRecorder.ts`.
- **No barrel files:** LLMs handle direct imports better than re-export chains.
- **One concept per file:** Functions under 30 lines; extract helpers into named files.
- **Test co-location:** `session.router.test.ts` lives next to `session.router.ts`.
- **Prefixed IDs:** `ses_`, `org_`, `usr_`, `evt_`, `inv_` — self-documenting in logs and debuggers.
- **Composition over inheritance:** Following Claude Code's own architecture (40+ tools, each a self-contained module).

---

## 11. Gemini Live API Architecture

### 11.1 Connection Flow

The mobile app connects directly to Gemini via WebSocket using ephemeral tokens. No audio or video data touches our servers.

1. Technician taps "Start Session" in Expo app
2. App calls tRPC `session.createToken` procedure on dashboard API
3. Dashboard API: authenticates user → verifies org membership → creates `ai_sessions` DB row → calls Google ephemeral token endpoint with constrained system prompt → returns `{ token, sessionId }`
4. App opens WebSocket to `wss://generativelanguage.googleapis.com/...` with ephemeral token
5. App sends `setup` message (model config, voice, system instruction)
6. App streams: camera JPEG (1 FPS, 768px, base64) + mic PCM (16kHz, 16-bit, mono)
7. Gemini streams back: audio PCM (24kHz) + optional text transcription
8. App logs session events to tRPC every 5 seconds (batched)
9. On disconnect: update session record, generate summary

### 11.2 Offline Resilience

Job sites (basements, rooftops, rural areas) often have poor connectivity.

- **Connectivity monitoring:** `@react-native-community/netinfo` detects connection state changes
- **Graceful degradation:** On connection loss, show clear "Connection lost" UI with last AI response visible
- **Auto-reconnect:** Exponential backoff (1s → 2s → 4s → max 30s), using Gemini's `sessionResumption` for session continuity
- **Local buffer:** Continue recording audio/video locally during disconnection; on reconnect, do NOT replay buffered data (latency would be too high) — instead, provide context to the AI that a gap occurred
- **Offline reference:** Cache recent session summaries locally via MMKV for reference between sessions

---

## 12. Database Schema (Key Entities)

All tables managed via Drizzle ORM. Better Auth manages its own tables (user, session, account, organization, member) automatically.

### 12.1 Application Tables

| Table                 | Purpose                         | Key Fields                                                                                                                                                                                                                            |
| --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai_sessions`         | One row per AI guidance session | id, org_id, user_id, status (active/completed/failed/timeout), started_at, ended_at, duration_ms, model_version, language_detected, token_count_input, token_count_output, cost_usd, feedback_rating, feedback_note, metadata (jsonb) |
| `session_events`      | Granular event log per session  | id, session_id, event_type (connect/disconnect/reconnect/audio_start/video_start/model_response/error/tool_use/feedback), timestamp, latency_ms, data (jsonb)                                                                         |
| `technician_profiles` | Extended technician data        | id, user_id, org_id, preferred_language, specialties (jsonb), total_sessions, total_duration_ms, average_rating, last_active_at                                                                                                       |
| `invite_codes`        | Org invitation system           | id, org_id, code (6-char), created_by, role (technician/manager), max_uses, used_count, expires_at                                                                                                                                    |
| `audit_log`           | Immutable action trail          | id, org_id, actor_id, action_type, target_entity, target_id, ip_address, metadata (jsonb), created_at                                                                                                                                 |
| `org_settings`        | Per-org AI + app configuration  | id, org_id, custom_system_prompt, data_retention_days, notification_prefs (jsonb), billing_config (jsonb)                                                                                                                             |

### 12.2 Scaling Considerations

At early stage, Postgres handles everything. When `session_events` exceeds tens of millions of rows:

- Add **TimescaleDB** as a Postgres extension for time-based partitioning and 90–95% compression
- No separate database needed; no migration; just `CREATE EXTENSION timescaledb` and convert the table

---

## 13. Pricing Model

### 13.1 Phase 1: Free Distribution (MVP Validation)

Goal: Get 50–200 active technicians using the product weekly. Collect feedback, measure retention, prove the core loop works.

- Free for all businesses
- No feature gating
- Inference costs absorbed (Gemini 2.5 Flash is cheap enough for this)
- Duration: 3–6 months

### 13.2 Phase 2: Paid Subscriptions

Pricing anchored against the value delivered, not against ServiceTitan ($250–400/tech/month). Our product is an add-on, not a platform replacement.

**Proposed tiers (subject to validation):**

| Tier             | Price          | Includes                                                                     | Target                    |
| ---------------- | -------------- | ---------------------------------------------------------------------------- | ------------------------- |
| **Starter**      | Free           | 3 technicians, 50 sessions/month, basic dashboard                            | Solo operators, trial     |
| **Professional** | €29/tech/month | Unlimited sessions, full analytics, priority support, custom AI instructions | 5–20 tech businesses      |
| **Enterprise**   | Custom         | SSO, API access, dedicated support, SLA, custom integrations                 | 20+ tech businesses, MSPs |

**Usage metering:** Track sessions per technician per month. Overage on Starter tier triggers upgrade prompt, not a hard block.

**Key metric:** AI cost per session (estimated €0.02–0.10 depending on duration). Healthy margin at €29/tech/month even with heavy usage.

---

## 14. Deployment & DNS

| Domain           | Points To               | Managed By                     |
| ---------------- | ----------------------- | ------------------------------ |
| `domain.com`     | Framer                  | Framer DNS                     |
| `app.domain.com` | Vercel                  | CNAME → `cname.vercel-dns.com` |
| Mobile app       | App Store / Google Play | EAS Build                      |

### 14.1 Estimated Monthly Costs (Early Stage)

| Service                      | Cost               |
| ---------------------------- | ------------------ |
| Vercel Pro                   | €20                |
| Neon Postgres (EU, Launch)   | €19                |
| Upstash Redis (EU)           | €0–5               |
| EAS Build (free tier)        | €0                 |
| Framer Basic                 | €5–15              |
| PostHog (free / self-hosted) | €0                 |
| Sentry (free tier)           | €0                 |
| Resend (free tier)           | €0                 |
| Better Auth                  | €0 (open-source)   |
| Gemini API                   | ~€10–50 (usage)    |
| **Total**                    | **~€55–110/month** |

---

## 15. CI/CD Pipeline

**On every push:**

- Biome lint + format check
- TypeScript type-check (`turbo run typecheck`)
- Vitest unit tests (`turbo run test`)
- Build all packages (`turbo run build` with remote caching)

**On push to main:**

- Vercel auto-deploys dashboard (preview → production)
- If `apps/mobile/**` or `packages/**` changed: trigger EAS Build (preview profile)

**On release tag:**

- EAS Build production profile
- App store submission via EAS Submit

---

## 16. Testing Strategy

| Layer       | Tool               | What Gets Tested                                                            |
| ----------- | ------------------ | --------------------------------------------------------------------------- |
| Unit        | Vitest             | Zod schemas, utils, Zustand store logic, tRPC procedures                    |
| Integration | Vitest + MSW v2    | tRPC → Drizzle → test DB, WebSocket protocol                                |
| Web E2E     | Playwright         | Dashboard auth, org management, session list, analytics                     |
| Mobile E2E  | Maestro            | Onboarding, org join, session start/stop, settings                          |
| WebSocket   | MSW v2 `ws.link()` | Gemini protocol: setup → audio → turnComplete → interruption → reconnection |

---

## 17. Future Considerations

Deliberately deferred from v1 but architecturally accounted for:

| Feature                                    | When                                      | Why Deferred                                                                      |
| ------------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| **Smart glasses support**                  | When Meta Orion or similar reaches market | Expo camera abstraction allows input source swap                                  |
| **Offline AI (on-device model)**           | When suitable small models exist          | Zustand session store is backend-agnostic                                         |
| **Public REST API**                        | Phase 2/3                                 | Third-party integrations need stable API; premature before product-market fit     |
| **ServiceTitan/Housecall Pro integration** | Phase 3                                   | Requires partnership discussions; webhook system must be proven first             |
| **Session recording & playback**           | Phase 2                                   | Privacy implications require consent framework; session_events schema supports it |
| **Dispatcher view**                        | Phase 2                                   | Needs job/ticket model; not in MVP scope                                          |
| **Equipment recognition database**         | Phase 2                                   | Curated per-org via dashboard; AI enriches from visual data                       |
| **White-labeling**                         | Enterprise tier                           | Org settings schema supports per-org branding                                     |
| **DACH expansion**                         | After Vienna validation                   | i18n + multilingual AI already in place                                           |
| **SOC 2 Type II**                          | Before first enterprise deal              | Required for enterprise procurement; start process ~6 months before needed        |
| **TimescaleDB**                            | When session_events > 10M rows            | Postgres extension, no migration needed                                           |

---

## 18. Open Questions for Team Discussion

1. **Session recording consent:** Should we offer opt-in session recording for training purposes? Major GDPR implications — requires explicit consent per session, separate data retention policy, and right to deletion. But enormous value for training new hires.

2. **Dispatcher integration:** How deep should the FSM integration go? A lightweight webhook (push job context in, pull session summary out) vs. a full dispatch board in our dashboard.

3. **AI model fallback:** What happens if Gemini has an outage? Should we integrate a secondary model (Claude, GPT-4o Realtime) as fallback, or accept downtime? Architectural cost of multi-model support is significant.

4. **Pricing validation:** Is €29/tech/month the right anchor? Need to validate with 10+ HVAC business owners. Consider value-based pricing (cost savings from reduced callbacks, faster training) vs. seat-based.

5. **End-customer visibility:** Should the end customer (homeowner) know that the technician is using AI guidance? Some may see it as a positive (cutting-edge service); others may see it as a negative (inexperienced technician). This is a positioning question, not a technical one.

6. **Equipment manual uploads:** Should org owners be able to upload PDF manuals that get injected into the AI context? Technically feasible (RAG pipeline), but adds significant complexity. Alternative: allow owners to paste key information as text into custom system prompt settings.

7. **Safety liability:** What legal disclaimers are needed around AI-guided physical work? The AI must never be positioned as a substitute for professional training or certification. Legal counsel review required before launch.

---

_This document is a living artifact. It will be updated as decisions are made, features are validated, and the team grows._
