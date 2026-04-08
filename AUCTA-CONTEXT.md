# Aucta - Complete Project Context

> This document is a self-contained briefing for an LLM assistant. It captures the full vision, architecture, tech stack, codebase state, conventions, and implementation details of the Aucta project as of April 8, 2026.

---

## 1. What Is Aucta?

Aucta is a **real-time AI copilot for HVAC technicians**. A technician points their phone camera at equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time - like having a master technician looking over their shoulder on every job.

**Core loop:** Camera (1 FPS JPEG) + Microphone (PCM 16kHz) --> Gemini 2.5 Flash Live API via WebSocket --> Spoken guidance (PCM 24kHz) + structured tool calls --> Session data --> Knowledge base ingestion --> Smarter AI next session.

**Key differentiator:** No competitor offers real-time multimodal reasoning (continuous live camera + voice simultaneously). XOi captures photos but doesn't reason in real-time. Aquant is voice/text only. Augmentir requires pre-authored SOPs.

---

## 2. Business Context

- **Market:** HVAC businesses in Vienna, Austria (7,650 WKO SHL member businesses). Multilingual workforce (Turkish, Serbian, Croatian, Polish, Romanian).
- **Business model:** B2B SaaS. Free during validation (3-6 months, target 50-200 active technicians), then EUR 29/tech/month Professional tier.
- **Revenue risk:** A 15-minute session costs ~$0.35-$0.50 in Gemini API fees. At 5 sessions/day per technician, API costs could consume 50-75% of revenue.
- **Regulatory:** GDPR (Austria-based, EU data residency), EU AI Act transparency (deadline August 2, 2026), F-Gas EU 2024/573, Product Liability Directive 2024/2853.

---

## 3. Current Status

**v1.0 MVP shipped on April 7, 2026.** 7 phases, 30 plans, 22,867 LOC TypeScript across 374 files. 185 commits. 5-day build.

The mobile app and full AI backend are complete. The web dashboard does not exist yet (deferred to v1.1).

### What's Built (v1.0)
- Turborepo monorepo with Bun, TypeScript strict, Biome linting
- Better Auth with organizations, roles (owner/manager/technician), invite codes, RBAC
- tRPC API with org-scoped middleware, rate limiting via Upstash Redis
- Ephemeral token system (Gemini API key never reaches client)
- Layered system prompt assembly (core role, HVAC expertise, safety rules, org overlay, knowledge context)
- Tool system: `buildTool()` factory, tool registry, tool dispatcher for Gemini function calling
- 3 tools implemented: `lookupErrorCode`, `logFinding`, `searchKnowledgeBase`
- Live AI session: camera JPEG stream (1 FPS, 768px) + PCM audio (16kHz) -> Gemini 2.5 Flash Live -> spoken guidance
- Session orchestration: WebSocket lifecycle, reconnection with `sessionResumption`, audio/video pipelines
- Session UI: non-dismissible AI indicator (EU AI Act), connection status, audio indicator, stop button, end session dialog, connection lost overlay
- Session lifecycle: DB persistence (ai_sessions, session_findings, session_tool_calls), incremental persistence, feedback (1-5 stars)
- Post-session Inngest summary pipeline with Gemini 2.5 Pro, AI-generated content labeling
- MMKV offline cache for recent session summaries (20-session LRU)
- Knowledge article schema with 4-tier confidence levels and confidence-weighted search ranking
- Hybrid BM25 + dense vector search via Qdrant with org-scoped filtering
- Session ingestion -> LLM article compilation -> auto-backlinks pipeline
- Verification queue (review submission, auto-creation on ingestion, confidence promotion)
- Knowledge health monitoring (coverage gaps, stale content, daily cron)
- CI pipeline: Biome lint, TypeScript typecheck, Vitest tests, Turborepo build

### What's NOT Built Yet (v1.1+)
- Web dashboard (Next.js 16): overview, session explorer, team management, analytics, KB management, org settings
- Additional AI tools: getEquipmentSpecs, getWiringDiagram, calculateRefrigerantCharge, checkSafetyRecall, getOrgProcedure, identifyPart, escalateToExpert
- i18n (react-i18next for en, de, tr, sr, hr, pl, ro)
- Sentry error tracking + PostHog analytics
- Equipment identification via dataplate OCR
- Expert escalation with AI-packaged context handoff
- Push notifications
- EAS development builds verified on physical devices

### Known Risks
- Gemini Live API is labeled "Preview" - may have breaking changes or pricing shifts
- Session cost economics ($0.35-$0.50 per 15-min session vs EUR 29/month revenue)
- NativeWind v5 is preview (v5.0.0-preview.3) - pre-release dependency (user chose to use it despite risk)

---

## 4. Technology Stack

All versions pinned to April 2026 latest stable.

### Core Runtime
| Technology | Version | Purpose |
|---|---|---|
| Turborepo | 2.9.x | Build orchestrator |
| Bun | 1.3.x | Package manager + server runtime |
| TypeScript | 6.0.x | Language (strict mode) |

### Mobile App
| Technology | Version | Purpose |
|---|---|---|
| Expo SDK | 55 | Mobile framework (React Native 0.83, React 19.2) |
| Expo Router | 55.x | File-based navigation with typed routes |
| NativeWind | v5.0.0-preview.3 | Mobile styling (Tailwind for RN) |
| Tailwind CSS | 4.2.x | Design system tokens |
| Zustand | 5.0.x | Client state (live sessions) - `getState()`/`setState()` outside React for WebSocket/audio callbacks |
| TanStack Query | 5.96.x | Server state |
| react-native-audio-api | 0.11.7 | Audio capture + playback (Web Audio API interface) |
| MMKV | 4.3.x | Local storage (30x faster than AsyncStorage) |
| expo-camera | ^55.0.0 | 1 FPS JPEG capture |
| expo-keep-awake | ^55.0.0 | Prevents screen dimming during sessions |
| expo-secure-store | ^55.0.0 | Auth token storage (iOS Keychain / Android Keystore) |

### Web Dashboard (Not Built Yet)
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.x | Dashboard framework |
| shadcn/ui | CLI v4 | Component library |

### API & Data
| Technology | Version | Purpose |
|---|---|---|
| tRPC | 11.16.x | End-to-end typed API |
| Zod | 4.3.x | Schema validation at all boundaries |
| Drizzle ORM | 0.45.x (pinned, NOT v1.0-beta) | ORM (7.4KB, sub-500ms cold starts) |
| Neon Postgres | EU Frankfurt | Primary database |
| Upstash Redis | EU | Cache + rate limiting |
| Qdrant | 1.17.x (EU) | Vector DB for knowledge base hybrid search |
| Inngest | 4.1.x | Serverless background jobs |

### Authentication
| Technology | Version | Purpose |
|---|---|---|
| Better Auth | 1.5.x | Self-hosted auth with org plugin, RBAC, Expo plugin |

### AI / Real-Time
| Technology | Version | Purpose |
|---|---|---|
| Gemini 2.5 Flash Live | Preview | Real-time multimodal AI (sub-second audio streaming, video, async function calling) |
| Gemini 2.5 Flash | GA | Standard inference for knowledge compilation |
| Gemini 2.5 Pro | GA | Session summarization |
| @google/genai | 1.48.x | Unified Gemini SDK |
| Ephemeral tokens | N/A | 1 use, 1-min new-session window, 30-min message window |

### Quality & Observability
| Technology | Version | Purpose |
|---|---|---|
| Biome | 2.4.x | Lint + format (replaces ESLint + Prettier) |
| Vitest | 4.1.x | Unit + integration testing |
| Playwright | 1.59.x | Web E2E (future) |
| Maestro | 2.4.x | Mobile E2E (future) |
| MSW | 2.12.x | API/WebSocket mocking in tests |

### Version-Critical Gotchas
- **NativeWind v5 is preview, not stable.** v5.0.0-preview.3 has had crashes with lightningcss errors. The user chose to use it anyway.
- **Gemini 2.5 Flash Live is "Preview"** - API surface may change. Uses `apiVersion: 'v1alpha'` for both Live API and ephemeral tokens.
- **expo-av removed from Expo Go in SDK 55** - must use development builds for audio testing.
- **Drizzle: Pin to ^0.45.0** - v1.0.0-beta has an unstable migration system. Never install it.
- **Zod 4 breaking changes** - `error` parameter replaces `errorMap`/`message`/`invalid_type_error`. Built-in `z.toJSONSchema()`.
- **tRPC 11 breaking changes** - transformers moved to links, React Query v5 required.

---

## 5. Monorepo Structure

```
aucta/
├── apps/
│   ├── mobile/              # Expo SDK 55 (React Native 0.83)
│   │   ├── app/             # Expo Router file-based routes
│   │   │   ├── _layout.tsx  # Root: SessionProvider + tRPC + auth guard
│   │   │   ├── (auth)/      # login, sign-up, org-choice, create-org, join-org, join-preview
│   │   │   └── (app)/       # Protected routes
│   │   │       ├── session.tsx    # Live AI session screen
│   │   │       ├── feedback.tsx   # Post-session feedback
│   │   │       └── (tabs)/       # Tab navigation
│   │   │           ├── index.tsx      # Home (Start Session CTA)
│   │   │           └── settings.tsx   # User/org settings
│   │   ├── components/      # UI components
│   │   ├── hooks/           # useGeminiSession (central orchestration)
│   │   ├── lib/
│   │   │   ├── gemini/      # WebSocket protocol, connection, audio, video, tool relay, reconnection
│   │   │   ├── auth-client.ts
│   │   │   ├── api.ts       # tRPC client
│   │   │   └── storage/     # MMKV session cache
│   │   ├── providers/       # SessionProvider (auth state)
│   │   └── stores/          # Zustand session store
│   └── server/              # API server entry point (Inngest registration)
│       └── src/
├── packages/
│   ├── ai/                  # @aucta/ai — AI pipeline (tools, session, knowledge, prompts)
│   │   └── src/
│   │       ├── tools/       # buildTool() factory, registry, dispatcher
│   │       │   ├── base.ts          # buildTool<TInput, TOutput>() factory
│   │       │   ├── registry.ts      # assembleToolPool()
│   │       │   ├── dispatcher.ts    # dispatchToolCalls() with 10s timeout
│   │       │   ├── lookupErrorCode/ # Error code lookup with JSON DB
│   │       │   ├── logFinding/      # Finding logger
│   │       │   └── searchKnowledgeBase/  # Hybrid KB search
│   │       ├── knowledge/   # Self-learning knowledge base
│   │       │   ├── core/    # Types, constants, confidence system
│   │       │   ├── retrieve/# Embeddings, Qdrant client, hybrid search, context builder
│   │       │   ├── ingest/  # Session -> candidate articles via Gemini
│   │       │   ├── compile/ # Article synthesis + inter-article linking
│   │       │   └── health/  # Coverage gaps, stale content detection
│   │       ├── prompts/     # System prompt layers (core, HVAC, safety)
│   │       ├── data/        # Static error code databases (Daikin, Mitsubishi, Fujitsu)
│   │       └── types.ts     # ToolContext, ToolResult<T>, GeminiFunctionDeclaration
│   ├── api/                 # @aucta/api — tRPC routers + Inngest jobs
│   │   └── src/
│   │       ├── root.ts      # appRouter = { org, invite, session, knowledge }
│   │       ├── trpc.ts      # Context creation (Better Auth session extraction)
│   │       ├── middleware/   # auth, org-scope, rate-limit, error-converter
│   │       ├── routers/     # session, invite, org, knowledge routers
│   │       └── jobs/        # Inngest: session-summarize, knowledge-ingest, knowledge-compile, knowledge-health
│   ├── db/                  # @aucta/db — Drizzle schema + migrations
│   │   └── src/
│   │       └── schema/      # auth, ai-sessions, session-findings, session-tool-calls,
│   │                        # knowledge-articles, knowledge-links, knowledge-verifications,
│   │                        # invite-codes, org-settings, audit-log
│   ├── auth/                # @aucta/auth — Better Auth config
│   │   └── src/
│   │       ├── server.ts    # betterAuth() config with org plugin
│   │       ├── client.ts    # createBaseAuthClient()
│   │       └── permissions.ts  # RBAC access control (owner > manager > technician)
│   ├── shared/              # @aucta/shared — Zod schemas, types, constants, utils
│   │   └── src/
│   │       ├── schemas/     # DTOs for all domain objects
│   │       ├── constants/   # roles, industries, limits
│   │       └── utils/       # ErrorWithCode, generateId, invite-code helpers
│   └── config/              # @aucta/config — Shared TypeScript configs
│       ├── tsconfig.base.json
│       ├── tsconfig.library.json
│       └── tsconfig.app.json
├── agents/                  # AI agent rules & knowledge
│   └── rules/               # 14 architectural/quality/testing rules
├── specs/                   # Spec-driven development templates
├── .planning/               # GSD workflow artifacts
│   ├── PROJECT.md           # Living project document
│   ├── ROADMAP.md           # Phase roadmap
│   ├── STATE.md             # Current workflow state
│   ├── MILESTONES.md        # Milestone history
│   └── research/            # Pre-build research docs
├── biome.json               # Biome 2.4 lint/format config
├── turbo.json               # Turborepo pipeline
├── vitest.config.ts         # Vitest workspace (packages/* + apps/mobile)
├── eas.json                 # EAS Build config (dev/preview/production)
├── package.json             # Bun 1.3.8 workspace root
├── TECH-SPEC.md             # Full technical specification (v3.0)
└── CLAUDE.md                # AI agent instructions
```

---

## 6. Architecture

### 6.1 Data Flow Paths

**Hot path (sub-second):** Mobile --> WebSocket --> Gemini Live API. Audio/video streams directly to Gemini; never proxied through the API server.

**Warm path (request-response):** Mobile --> tRPC --> API server --> Postgres/Redis. Tool dispatch, session CRUD, auth.

**Cold path (background):** Inngest --> API server --> Postgres/Qdrant/Gemini. Session summaries, knowledge ingestion/compilation, health checks.

### 6.2 Import Direction (Strictly One-Way)

```
packages/shared  <--  packages/db  <--  packages/ai  <--  packages/api  <--  apps/*
```

Violations are explicitly forbidden:
- `packages/ai` must NEVER import from `@aucta/api` (tRPC)
- `packages/shared` must NEVER import from `packages/ai`
- `packages/db` must NEVER import from `packages/api`
- Apps must NEVER import Drizzle types directly - use DTOs

### 6.3 Gemini Live API Connection Flow

1. Mobile requests ephemeral token from API (`session.createToken`)
2. API: creates DB session row, builds layered system prompt, assembles tool declarations, calls Gemini ephemeral token API
3. API returns `{token, sessionId, tools, config}` to mobile
4. Mobile opens WSS directly to Gemini with the ephemeral token
5. Mobile sends JPEG (1 FPS, 768px max) + PCM (16kHz mono, Int16 LE)
6. Gemini returns PCM audio (24kHz) + text + tool calls
7. Tool calls: Gemini -> Mobile -> tRPC -> API -> DB/Qdrant -> API -> Mobile -> Gemini (~100-300ms round-trip)
8. Session end: mobile calls `session.endSession` -> fires `session/ended` Inngest event -> parallel summary + knowledge ingestion

### 6.4 Session Orchestration (Mobile)

The `useGeminiSession` hook orchestrates the full lifecycle:

1. `startSession()` - sets "connecting", activates keep-awake, creates DB session, acquires ephemeral token, instantiates AudioPlayback/AudioCapture/ToolRelay/FrameCapture/GeminiConnection, calls `connection.connect()`
2. `onSetupComplete` - status "active", starts mic + camera pipelines
3. `onToolCall` - checks for client-side `endSession` tool (waits 3s for goodbye), relays others via ToolRelay, persists tool calls + findings
4. `onDisconnect` - triggers exponential backoff reconnection (1s-30s, 120s window) with fresh ephemeral token + session resumption handle
5. `endSession()` - cleans up all resources, calls tRPC mutation, sets status "completed"

### 6.5 Knowledge Base Pipeline

**5-phase flywheel:**

1. **INGEST:** `session/ended` Inngest event -> `extractLearnings()` uses Gemini 2.5 Flash to extract candidate articles from session summary + findings
2. **COMPILE:** `knowledge/articles-ingested` -> merge candidates (same brand+model), synthesize with Gemini, generate inter-article links
3. **VERIFY:** 4-tier confidence ladder. Auto-creates pending verification on ingestion. Review approval promotes confidence: unverified -> technician_reviewed -> expert_approved (manufacturer_sourced never auto-promoted)
4. **RETRIEVE:** `searchKnowledgeBase` tool -> hybrid BM25 + dense vector (gemini-embedding-001, 3072-dim) via Qdrant -> weighted RRF fusion (dense 2x) -> confidence score boost -> top 3 results with source attribution
5. **HEALTH:** Daily 3am cron -> coverage gaps, stale articles (>90 days), conflicting articles

### 6.6 Authentication & Authorization

- Better Auth with email/password, Expo plugin, organization plugin
- Roles: owner > manager > technician (hierarchy: 3 > 2 > 1)
- One org per user (`organizationLimit: 1`)
- Invite codes: 6-char alphanumeric (excludes I/O/0/1 for glove readability), single-use default, role-scoped
- RBAC permissions: technicians can only view team; managers can invite technicians; owners have full control
- `org_id` always extracted from server session, never from client input
- tRPC middleware chain: `isAuthed` -> `withOrgScope` -> rate limiting -> error conversion

---

## 7. Database Schema

All tables use Drizzle ORM 0.45.x on Neon Postgres (EU Frankfurt).

### Better Auth Tables (managed by Better Auth)
- `user` - id, name, email, emailVerified, image, timestamps
- `session` - id, expiresAt, token, ipAddress, userAgent, userId, activeOrganizationId
- `account` - OAuth/password accounts
- `verification` - email verification tokens
- `organization` - id, name, slug (unique), logo, metadata
- `member` - organizationId, userId, role (default "member"), createdAt
- `invitation` - organizationId, email, role, status, expiresAt, inviterId

### Application Tables

**`ai_sessions`** - Core session tracking
```
id (varchar 30), orgId, userId, status (connecting/active/completed/failed/timeout/abandoned),
startedAt, endedAt, durationMs, modelVersion, languageDetected,
tokenCountInput, tokenCountOutput, feedbackRating (1-5), feedbackNote,
summary, isAiGenerated, toolsUsed (jsonb string[]), metadata (jsonb)
```

**`session_findings`** - Findings logged during sessions (FK -> ai_sessions)
```
id, sessionId, category (safety/maintenance/regulatory/observation/recommendation),
description, severity (low/medium/high/critical), equipmentModel, manufacturer
```

**`session_tool_calls`** - Tool call audit log (FK -> ai_sessions)
```
id, sessionId, toolName, input (jsonb), output (jsonb), durationMs, success, errorMessage
```

**`knowledge_articles`** - Self-learning knowledge base
```
id, orgId, slug, title, summary, contentMd,
category (equipment/procedure/safety/regulatory/troubleshooting),
equipmentBrand, equipmentModel, procedureType,
confidenceLevel (unverified/technician_reviewed/expert_approved/manufacturer_sourced),
sourceType (session/manual/feedback), sourceSessionIds (jsonb string[]),
tags (jsonb string[]), version (default 1), previousVersionId,
embeddingId, embeddingModel, wordCount,
retrievalCount (default 0), lastRetrievedAt,
isAiGenerated (boolean - EU AI Act), createdBy, verifiedBy, verifiedAt
```

**`knowledge_verifications`** - Review queue
```
id, articleId, orgId, reviewerId, status (pending/approved/rejected/needs_revision),
reviewerNotes, reviewedAt
```

**`knowledge_links`** - Inter-article relationships
```
id, sourceArticleId, targetArticleId, linkType (reference/prerequisite/related)
```

**`invite_codes`** - Org invite system
```
id, orgId, code (varchar 6, unique), createdBy,
role (technician/manager), maxUses (default 1), usedCount (default 0), expiresAt
```

**`org_settings`** - Per-org configuration (PK: orgId, one row per org)
```
orgId, industryType, location, updatedAt
```

**`audit_log`** - Immutable audit trail
```
id (serial), orgId, userId, action (varchar 100), resource, resourceId, metadata (jsonb)
```

---

## 8. API (tRPC Routers)

### session router
| Procedure | Type | Auth | Description |
|---|---|---|---|
| `createToken` | mutation | orgProcedure + tokenRateLimit | Build system prompt, assemble tools, get Gemini ephemeral token |
| `dispatchToolCalls` | mutation | orgProcedure | Relay Gemini function calls through tool dispatcher |
| `createSession` | mutation | orgProcedure | Create DB session record |
| `endSession` | mutation | orgProcedure | Update session, fire `session/ended` Inngest event |
| `addFinding` | mutation | orgProcedure | Persist logFinding results |
| `addToolCall` | mutation | orgProcedure | Persist tool call audit log |
| `submitFeedback` | mutation | orgProcedure | Save 1-5 star rating + note |
| `getSession` | query | orgProcedure | Get session by ID |
| `getRecentSessions` | query | orgProcedure | Last 20 sessions |
| `getSessionSummary` | query | orgProcedure | Get AI-generated summary |

### invite router
| Procedure | Type | Auth | Description |
|---|---|---|---|
| `create` | mutation | orgProcedure | Role-scoped invite code creation |
| `lookup` | query | publicProcedure + authRateLimit | Preview org before joining |
| `join` | mutation | protectedProcedure | Join org via invite code (enforces single-org) |
| `list` | query | orgProcedure | List active invite codes |
| `revoke` | mutation | orgProcedure (owner only) | Delete invite code |

### org router
| Procedure | Type | Auth | Description |
|---|---|---|---|
| `create` | mutation | protectedProcedure + authRateLimit | Create org + settings + audit log |
| `getCurrent` | query | orgProcedure | Org details + currentUserRole + settings |
| `getMembers` | query | orgProcedure | List all members |

### knowledge router
| Procedure | Type | Auth | Description |
|---|---|---|---|
| `create` | mutation | orgProcedure | Manual article creation + Qdrant embedding |
| `update` | mutation | orgProcedure | Update article + re-embed + re-link |
| `list` | query | orgProcedure | Paginated with filters |
| `getById` | query | orgProcedure | Single article with org ownership check |
| `healthCheck` | query | orgProcedure | Coverage gaps, stale, conflicts |
| `submitReview` | mutation | orgProcedure | Review + confidence promotion |
| `getPendingReviews` | query | orgProcedure | Verification queue |
| `getReviewsByArticle` | query | orgProcedure | Review history |

---

## 9. Inngest Background Jobs

| Job | Trigger | Description |
|---|---|---|
| `session.summarize` | `session/ended` | Generate markdown summary via Gemini 2.5 Pro, save with `isAiGenerated: true` |
| `knowledge.ingest` | `session/ended` | Extract candidate articles from session data, create as unverified, auto-create verification records, embed to Qdrant, fire `knowledge/articles-ingested` |
| `knowledge.compile` | `knowledge/articles-ingested` | Merge candidates (same brand+model), synthesize with Gemini, generate links, re-embed |
| `knowledge.health` | Cron `0 3 * * *` (daily 3am) | Check all orgs for coverage gaps, stale articles, conflicts |

### Future Jobs (Defined in Spec, Not Yet Implemented)
- `analytics.aggregate` (daily cron)
- `billing.meter` (hourly cron)
- `gdpr.export`, `gdpr.delete`
- `email.sessionSummary`
- `invite.expire` (daily cron)
- `audit.archive` (monthly cron)

---

## 10. AI Tool System

### Tool Architecture

Tools follow the `buildTool<TInput, TOutput>()` factory pattern (inspired by Claude Code's architecture):

```typescript
const myTool = buildTool<MyInput, MyOutput>({
  name: "myTool",
  description: "...",
  inputSchema: MyInputZodSchema,
  call: async (input, context) => {
    // Linear sequence of steps
    return { success: true, data: result };
  },
});
```

- `validateInput()` validates via Zod
- `prompt()` converts Zod schema to Gemini-compatible JSON Schema (strips `$schema` and `additionalProperties`)
- `dispatchToolCalls()` runs all function calls in `Promise.all` with 10s timeout per tool
- Tool results use discriminated union: `{ success: true, data }` or `{ success: false, error }`

### Implemented Tools

**`lookupErrorCode`** - Looks up HVAC error codes from static JSON databases
- Input: manufacturer, errorCode
- Output: found=true with meaning/severity/repairSteps/possibleCauses/equipmentTypes, or found=false
- Data: Daikin, Mitsubishi Electric, Fujitsu error codes

**`logFinding`** - Logs findings during sessions
- Input: category (safety/maintenance/regulatory/observation/recommendation), description, severity, optional equipmentModel/manufacturer
- Output: findingId (`fnd_` prefixed), recorded confirmation

**`searchKnowledgeBase`** - Hybrid search across org knowledge base
- Input: query, optional equipmentBrand/equipmentModel
- Output: found=true with articles (title, summary, content, confidence attribution, score), or found=false

### Planned Tools (Not Yet Implemented)
| Tool | Purpose |
|---|---|
| getEquipmentSpecs | Equipment specifications and warranty lookup |
| getWiringDiagram | Manual section reference via ColPali RAG |
| calculateRefrigerantCharge | Target refrigerant charge calculation |
| checkSafetyRecall | Active safety recall lookup |
| getOrgProcedure | Organization-specific procedures |
| identifyPart | Part identification with supplier/cost |
| escalateToExpert | Push notification to expert with AI-packaged context |

---

## 11. System Prompt Architecture

The system prompt is assembled from ordered layers using `buildEffectiveSystemPrompt(layers)`:

1. **coreRolePrompt** - "You are Aucta, an AI copilot for HVAC technicians." Persona, AI disclosure, communication style
2. **hvacExpertisePrompt** - Diagnostic approach, equipment ID, error code lookup instructions, trade terminology
3. **safetyRulesPrompt** - Lockout/tagout, F-Gas EU 2024/573, competence boundaries, emergency response (112 EU), AI disclaimer
4. **orgOverlayPrompt** - Per-org customization (industry type, location, procedures)
5. **knowledgeBasePrompt** - Retrieved knowledge articles with confidence attribution
6. **sessionHistoryPrompt** - Past session context (future)
7. **jobContextPrompt** - FSM integration context (future)
8. **aiActTransparencyPrompt** - EU AI Act Art. 50 transparency requirements

Safety rules are positioned BEFORE org customization so organizations cannot override safety rules.

---

## 12. Gemini Live API Details

- **Model:** `gemini-2.5-flash-live-preview` (requires `apiVersion: 'v1alpha'`)
- **Audio input:** Raw 16-bit PCM, 16kHz, little-endian, mono
- **Audio output:** Raw 16-bit PCM, 24kHz, little-endian
- **Video input:** JPEG, 1 FPS max, 768px max dimension
- **Ephemeral tokens:** 1 use per token, 1-minute window to start session, 30-minute message window
- **Context window compression:** MUST be enabled via `contextWindowCompression: slidingWindow` - without it, audio+video sessions terminate at ~2 minutes
- **Session resumption:** `sessionResumption` token stored in Zustand, ~2-minute reconnection window
- **Reconnection:** Exponential backoff with jitter (1s base, 30s max, +/-500ms jitter), 120s total window
- **Tool calling:** Async function calling (non-blocking - Gemini continues audio while waiting for tool response)
- **Pricing:** Audio input ~$0.005/min, audio output ~$0.018/min. Standard text: $0.30/1M input, $2.50/1M output

### Client-Side `endSession` Tool
A special tool declaration sent to Gemini that lets the technician end the session by voice. When triggered, the app waits 3 seconds for a goodbye message before disconnecting.

---

## 13. Mobile App Details

### Auth Flow
1. Login/Sign-up -> email/password via Better Auth
2. Post-login: restore `activeOrganizationId` (Better Auth doesn't do this automatically)
3. Org choice: create new org or join via invite code
4. Join flow: enter code -> preview org (name, member count, role) -> confirm join
5. Single-org constraint enforced: one org per user

### Session Store (Zustand)
State machine: idle -> requesting-permissions -> disclosure -> connecting -> active -> disconnected/reconnecting -> completed/failed/timeout

Tracked state: connectionQuality, sessionId, serverSessionId, resumptionHandle, isMicActive, isAISpeaking, reconnectAttempts, findingsCount, toolCallsCount, toolNames, tokenCounts, languageDetected.

### Offline Support
- MMKV cache: 20 most recent session summaries (LRU eviction)
- Connectivity monitoring via `@react-native-community/netinfo`
- Graceful degradation with "Connection lost" overlay
- Future: on-device Gemma 4 E2B via LiteRT

### UX Requirements
- Two taps max to start a session
- 56x56dp touch targets (glove-friendly)
- WCAG AAA contrast
- Audio-first interaction
- Works in portrait + landscape
- Non-dismissible AI indicator throughout session (EU AI Act Art. 50)

---

## 14. Coding Conventions & Rules

### CRITICAL Rules
- **Repository Pattern:** All DB access through Repository classes. Drizzle never in services/routers/UI.
- **DTO Boundaries:** Zod-validated DTOs at every architectural boundary. Drizzle row types never leak.
- **Vertical Slices:** Code organized by domain, not by layer.

### HIGH Impact Rules
- **Constructor Injection:** Services receive dependencies via `deps` interface.
- **Error Handling:** `ErrorWithCode` in services/repos; `TRPCError` only in routers. `packages/ai/` must NOT import `@trpc/server`.
- **Feature Boundaries:** One-way import direction. Framework-agnostic in packages, framework-specific in apps.
- **Testing:** 80%+ coverage for new code. Co-located tests (never `__tests__/` directory).
- **Git Workflow:** Conventional commits. Never force push. Push before checking CI.
- **PR Size:** Under 500 LOC, under 10 files. Draft mode by default.
- **Simplicity:** Readable on first pass. Linear sequences, flat state, one procedure per use case.

### MEDIUM Impact Rules
- **Comments:** Only explain "why", never "what". Good: regulatory reasons, perf trade-offs, API workarounds.
- **Accountability:** Safety-critical code requires tests. org_id filtering enforced at middleware. Confidence levels must be accurate. Ephemeral tokens never logged.

### Naming Conventions
- IDs: `generateId(prefix)` - crypto-random base62 with prefix (e.g., `ses_`, `fnd_`, `inv_`, `art_`)
- Invite codes: 6-char uppercase, charset excludes I/O/0/1
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

---

## 15. Build & CI

### Local Development
```bash
bun install                    # Install dependencies
bun run dev                    # Start all apps (via Turborepo)
bun run typecheck              # TypeScript type checking
bun run lint                   # Biome lint + format check
bun run test                   # Vitest across all packages
bunx biome format --write .    # Auto-format
bunx biome check --fix .       # Auto-fix lint issues
```

### CI Pipeline (GitHub Actions)
Triggers on push/PR to `main`. Single job:
1. Checkout + Setup Bun 1.3
2. `bun install --frozen-lockfile`
3. `bunx biome check .`
4. `bun run typecheck`
5. `bun run test`

### TypeScript Config
- `target: ES2024`, `module: ESNext`, `moduleResolution: bundler`
- `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`
- `isolatedModules: true`, `resolveJsonModule: true`
- Composite projects with declaration maps for packages

### Biome Config
- Formatter: spaces, indent 2, line width 100, double quotes
- Linter: recommended rules
- Imports: auto-organize

### Database Migrations
1. Edit schema in `packages/db/src/schema/`
2. `bunx drizzle-kit generate` from `packages/db/`
3. Review generated SQL in `packages/db/drizzle/`
4. `bunx drizzle-kit migrate` to apply
5. `bun run typecheck` to verify consumers

### EAS Build
- Development: `developmentClient: true`, internal distribution, iOS simulator
- Preview: internal distribution
- Production: app store distribution

---

## 16. Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection (EU Frankfurt, pooler, SSL) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint (EU) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth token |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `BETTER_AUTH_URL` | Auth server URL (`http://localhost:3000` in dev) |
| `EXPO_PUBLIC_API_URL` | tRPC API URL for mobile client |
| `GEMINI_API_KEY` | Google Gemini API key (server-side only, never exposed to client) |
| `GEMINI_LIVE_MODEL` | `gemini-2.5-flash-live-preview` |

---

## 17. Established Patterns

These patterns emerged during v1.0 development and are confirmed correct:

- **ErrorWithCode in services / TRPCError only in routers** - middleware auto-converts
- **Zustand `getState()`/`setState()` for callbacks outside React** - essential for WebSocket and audio callbacks
- **Lazy `require()` for native modules** - prevents Expo Go crashes
- **Fire-and-forget `mutate()` for non-blocking persistence** - tool calls, findings logged without awaiting
- **`z.toJSONSchema()` with `$schema` stripping** - makes Zod schemas compatible with Gemini function declarations
- **Discriminated union output (`found: true/false`)** - for lookup tools
- **`buildTool()` factory** - new tools are trivial to add
- **Layered system prompt assembly** - array-based, not string concatenation
- **No FK constraints to Better Auth tables** - application-layer referential integrity to avoid migration conflicts
- **Per-org concurrency=1 for knowledge ingestion** - prevents race conditions in article compilation

---

## 18. What NOT to Use

| Technology | Why |
|---|---|
| Prisma | 2.8MB engine, 5-10s cold starts. Drizzle is 350x smaller. |
| Firebase Auth | Vendor lock-in, US data default, no org concept |
| Supabase | Vendor lock-in to their Postgres/auth/storage |
| pgvector | No multivector support for ColBERT-style retrieval |
| socket.io | Requires persistent server, incompatible with Vercel serverless |
| Redux Toolkit | Excessive boilerplate, no external state access |
| AsyncStorage | 30x slower than MMKV |
| @google/generative-ai | Legacy SDK, replaced by @google/genai |
| Expo Go for development | SDK 55 removed expo-av, audio requires dev builds |
| Drizzle v1.0-beta | Unstable migration system, pin to ^0.45.0 |

---

## 19. Key Decisions & Rationale

| Decision | Rationale | Status |
|---|---|---|
| Mobile + core AI first | Get the core magic working before business layer | Good |
| Full KB backend, no dashboard UI | KB is key differentiator; verification runs headless | Good |
| Start with 2-3 tools, not all 10 | Prove architecture, expand incrementally | Good |
| Full auth from day one | Org-scoped middleware is foundational | Good |
| Stream-and-discard for audio/video | Eliminates largest GDPR surface area | Good |
| Gemini Live (not OpenAI Realtime) | Multimodal (video+audio), async function calling, auto language detection | Revisit (Preview label) |
| NativeWind v5 over v4 stable | User preference for latest features | Revisit (pre-release risk) |
| No FK to Better Auth tables | Clean separation, no migration conflicts | Good |
| Inngest (not BullMQ) | Serverless-native, runs on Vercel | Good |
| Zustand (not Redux) | getState()/setState() outside React for WS callbacks | Good |
| Constructor injection throughout | Testable and decoupled without DI container overhead | Good |

---

## 20. Out of Scope (Explicitly Excluded)

On-device AI fallback, public REST API, session recording/playback, AR annotation, FSM integrations (ServiceTitan/HousecallPro), billing/payments (for now), multi-agent architecture, landing page, smart glasses support, pre-authored SOP/workflow builder, gamification/leaderboards, in-app per-session billing, real-time chat, video call/screen sharing, white-labeling, emotion recognition/sentiment analysis.
