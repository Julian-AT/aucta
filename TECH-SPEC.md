# Aucta

## Technical Specification — Engineering Baseline

**Product:** Aucta — HVAC AI Copilot for technicians and field teams.

**Version:** 3.0
**Date:** April 3, 2026
**Status:** Foundation / Pre-Development
**Audience:** Engineering team, department leads, technical stakeholders

---

## 1. Product Overview

**Aucta** is a real-time AI copilot for HVAC technicians. The mobile app streams camera video (1 FPS JPEG) and microphone audio (PCM 16kHz) directly to Google's Gemini 2.5 Flash Live API via WebSocket. Gemini reasons over the multimodal input, calls domain-specific tools (error code lookup, knowledge base search, equipment identification), and streams spoken guidance back in the technician's language. No audio or video touches our servers — the app connects directly to Gemini using short-lived ephemeral tokens issued by our API. A Next.js dashboard gives business owners visibility into team activity, session analytics, and a self-learning knowledge base that compounds organizational expertise over time.

**Core loop:** Camera + Voice → Gemini Live (with tool calling) → Spoken guidance + structured session data → Knowledge base ingestion → Smarter AI next session.

---

## 2. Core Surfaces & User Journeys

### 2.1 Mobile App (Technician-Facing)

**Primary user:** Technician on a job site.
**Core interaction:** Point camera → talk → receive spoken guidance.

**User Journey:**

1. **First use:** Download app → enter invite code or scan QR → auto-join organization → brief tutorial overlay (3 screens max) → ready
2. **Starting a session:** Tap "Start Session" → camera activates → AI greets in detected language → technician describes the job or just points at equipment → AI begins guidance
3. **During a session:** Hands-free voice interaction → AI identifies equipment, suggests next steps, warns about safety issues → technician can ask follow-up questions → AI adapts to what it sees in real time → AI calls tools mid-conversation (error code lookup, knowledge base search, part identification) without interrupting the audio stream
4. **Equipment scan:** Technician holds camera steady on equipment dataplate → AI extracts manufacturer, model number, serial number via vision → auto-populates session context and queries the knowledge base for relevant procedures
5. **Expert escalation:** Technician taps escalation button or says "I need help" → AI packages session context (equipment identified, conversation summary, last captured frames) → push notification sent to designated senior technician → expert can respond with text guidance or join a call
6. **Ending a session:** Tap stop or say "end session" → optional feedback (1-5 stars + note) → knowledge feedback prompt ("Was the guidance accurate? Anything to add?") → session summary generated → summary available in history
7. **Between sessions:** View past session summaries → see personal stats → browse cached knowledge articles offline → update language preference → check for app updates

**Critical UX Requirements:**

- Maximum two taps to start a session from app launch
- Large, glove-friendly touch targets (minimum 48x48dp, recommended 56x56dp)
- High-contrast UI readable in direct sunlight (WCAG AAA contrast ratios)
- Audio-first interaction — the technician should never need to type during a session
- Works in portrait and landscape (phone may be propped up or held at angles)
- Non-dismissible AI indicator visible throughout the session (EU AI Act Art. 50 compliance)
- Offline reference: recent session summaries and knowledge articles cached locally via MMKV

### 2.2 Web Dashboard (Owner/Manager-Facing)

**Primary users:** Business owner, operations manager.
**Core interaction:** Monitor team performance, manage organization, review sessions, curate knowledge base.

**Dashboard Sections:**

**Overview (Home):**

- Live activity: active sessions right now (count + technician names) — updated in real time via tRPC subscriptions (SSE)
- Today's key numbers: sessions completed, total AI time, estimated cost
- Week/month trends: session volume, avg duration, language distribution
- Alerts: low-rated sessions, unusually long sessions, connection failures
- Revenue opportunities: aggregated replacement/upsell suggestions from session summaries

**Team Management:**

- Technician roster with status (online/offline/in-session)
- Invite flow: generate code/link → set role (technician/manager) → set expiry
- Individual technician profiles: session history, performance trend, language, specialties
- Bulk actions: deactivate, reassign role, export data
- Skill matrix: which technicians have handled which equipment types (derived from session metadata)

**Session Explorer:**

- Searchable/filterable session history across entire organization
- Session detail view: timeline of events, duration, language, token usage, cost, feedback, tools used
- Transcript viewer (when available): AI responses with timestamps
- Equipment identified: structured data extracted during the session
- Revenue opportunities flagged by AI during the session
- Export: CSV/PDF for compliance documentation

**Analytics:**

- Usage trends: sessions per day/week/month, peak usage hours
- Cost analysis: total AI cost, cost per session, cost per technician, projected monthly spend
- Quality metrics: average feedback rating, reconnection rate, error rate
- Language breakdown: which languages are used, how often
- Equipment frequency: most commonly encountered equipment types (from session metadata)
- Time-to-competency: session duration trend for new hires (do they get faster?)
- First-time fix rate correlation: if integrated with FSM, track whether AI-assisted jobs have fewer callbacks
- Knowledge base analytics: most retrieved articles, correlation with positive feedback, coverage gaps

**Knowledge Base Management:**

- Article browser: search, filter by category/equipment brand/model/confidence level
- Verification queue: pending articles awaiting review, approve/reject/request revision workflow
- Manual upload: drag-and-drop PDF manuals for RAG ingestion (ColPali multimodal processing)
- Custom text knowledge: paste procedures, tips, org-specific information into structured articles
- Health dashboard: coverage gaps by equipment brand/model, stale articles, detected inconsistencies
- Article detail view: full content, version history, verification trail, retrieval statistics, source attribution

**Organization Settings:**

- Company profile, billing, subscription management
- AI configuration: custom system prompt additions (company-specific procedures, safety protocols, preferred brands)
- Expert escalation: designate senior technicians as escalation targets
- Data retention settings
- Notification preferences
- API keys (for future integrations)

### 2.3 Landing Page (Framer)

Fully decoupled at `domain.com`. No shared backend. Links to `app.domain.com` for signup.

**Key pages:** Hero + value prop, features, pricing, testimonials, demo booking (Calendly/Cal.com embed), blog (Framer CMS), legal pages (Impressum, Datenschutzerklärung).

**Conversion flow:** `domain.com` → "Get Started" CTA → redirects to `app.domain.com/signup` → owner creates account → onboarding wizard.

---

## 3. AI Pipeline Architecture

The AI pipeline follows architectural patterns extracted from Claude Code's enterprise-grade agent system — specifically its Tool system (`Tool.ts` + `buildTool()`), QueryEngine orchestration loop, memory/knowledge system (`memdir/`, `extractMemories/`), and multi-agent coordination (`coordinator/`, `AgentTool`).

### 3.1 Tool System (`packages/ai/tools/`)

Modeled on Claude Code's `Tool.ts` + `buildTool()` pattern. Each tool is a self-contained module:

```
packages/ai/tools/
├── base.ts                          # buildTool() factory, ToolDef type, Zod schemas
├── lookupErrorCode/
│   ├── index.ts                     # call(), validateInput(), isReadOnly()
│   ├── prompt.ts                    # Tool description for Gemini function declaration
│   ├── types.ts                     # Zod input/output schemas
│   └── lookupErrorCode.test.ts
├── getEquipmentSpecs/
│   ├── index.ts
│   ├── prompt.ts
│   └── types.ts
├── getWiringDiagram/
├── calculateRefrigerantCharge/
├── checkSafetyRecall/
├── getOrgProcedure/
├── logFinding/
├── identifyPart/
├── searchKnowledgeBase/             # RAG retrieval tool
│   ├── index.ts                     # Hybrid search: BM25 + vector
│   ├── prompt.ts
│   ├── reranker.ts                  # Cross-encoder reranking
│   └── types.ts
├── escalateToExpert/                # Human handoff tool
│   ├── index.ts
│   ├── prompt.ts
│   └── types.ts
└── registry.ts                      # assembleToolPool() — registers all tools
```

**Key design principles (from Claude Code):**

- `buildTool()` factory enforces consistent structure: every tool has `call()`, `prompt()`, `validateInput()`, `isReadOnly()`, input/output Zod schemas
- Tools are registered in a pool via `registry.ts` (mirrors Claude Code's `assembleToolPool`)
- Each tool's `prompt.ts` contains the Gemini function declaration (name, description, parameters) — this is what Gemini sees
- Tools are composable: the session orchestrator can run tools serially or concurrently (matching Claude Code's `toolOrchestration.ts` with `runToolsSerially()` / `runToolsConcurrently()`)

**10 HVAC-specific tools (Gemini function declarations):**

| #   | Tool                         | Input                           | Output                                    | Data Source                       |
| --- | ---------------------------- | ------------------------------- | ----------------------------------------- | --------------------------------- |
| 1   | `lookupErrorCode`            | manufacturer, code              | meaning, repair steps, severity           | Knowledge base + manufacturer DB  |
| 2   | `getEquipmentSpecs`          | model_number                    | specs, installation date, warranty status | Equipment library (per-org)       |
| 3   | `getWiringDiagram`           | model_number                    | relevant manual section/diagram reference | Knowledge base (ColPali RAG)      |
| 4   | `calculateRefrigerantCharge` | model, line_length_m            | target charge in kg, refrigerant type     | Manufacturer tables               |
| 5   | `checkSafetyRecall`          | model_number                    | active recalls, safety notices            | Manufacturer API / web scrape     |
| 6   | `getOrgProcedure`            | procedure_type                  | org-specific custom procedure text        | org_settings.custom_system_prompt |
| 7   | `logFinding`                 | category, description, severity | confirmation, finding_id                  | ai_sessions.metadata              |
| 8   | `identifyPart`               | description, visual_context     | part_number, supplier, estimated_cost     | Parts database (Phase 2)          |
| 9   | `searchKnowledgeBase`        | query, equipment_context        | retrieved articles with confidence tags   | Qdrant + Postgres                 |
| 10  | `escalateToExpert`           | context_summary, urgency        | notification_sent, expert_name            | Push notification system          |

**Gemini function calling integration:**

- Tools are declared in the WebSocket `setup` message as `tools[].functionDeclarations`
- When Gemini returns a `toolCall` event, the `toolDispatcher` resolves it to the matching tool, calls `call()`, and returns the result via `toolResponse`
- Gemini 2.5 Flash Live supports **async function calling**: tool calls execute while audio continues streaming (non-blocking UX)
- Tool call timeout: 10 seconds default, configurable per tool
- Tool errors are caught and returned to Gemini as structured error responses so the AI can gracefully inform the technician

### 3.2 Session Orchestration Engine (`packages/ai/session/`)

Modeled on Claude Code's `QueryEngine.ts` — the central coordinator for LLM interactions.

```
packages/ai/session/
├── orchestrator.ts              # SessionOrchestrator class — full session lifecycle
├── connection.ts                # WebSocket connection to Gemini Live API
├── tokenBudget.ts               # Token tracking, cost estimation
├── systemPrompt.ts              # Layered system prompt assembly
├── toolDispatcher.ts            # Routes Gemini tool calls to the tool registry
├── audioProcessor.ts            # PCM encoding/decoding, sample rate conversion
├── videoProcessor.ts            # JPEG frame capture, base64 encoding, resize
├── reconnection.ts              # Exponential backoff, sessionResumption
├── eventLogger.ts               # Batched event logging to tRPC (every 5s)
└── types.ts                     # Session state machine types
```

**SessionOrchestrator lifecycle:**

```
1. createSession()  → Auth check → create DB row → fetch ephemeral token
2. connect()        → Open WSS to Gemini → send setup message (model, voice, system prompt, tools)
3. streamLoop()     → Continuous loop:
   ├── Send: camera JPEG (1 FPS, 768px, base64) + mic PCM (16kHz/16-bit/mono)
   ├── Receive: audio PCM (24kHz) + text transcription
   ├── Handle: toolCall events → toolDispatcher.dispatch() → toolResponse
   ├── Handle: turnComplete events → log session event
   └── Handle: interruption events → cancel current audio playback
4. disconnect()     → Close WebSocket → update DB row → trigger summary generation (Inngest)
```

**System prompt assembly** (layered pattern from Claude Code's `buildEffectiveSystemPrompt()`):

```typescript
const systemPrompt = buildEffectiveSystemPrompt([
  coreRolePrompt, // "You are an expert HVAC technician copilot..."
  hvacExpertisePrompt, // Domain knowledge, procedures, troubleshooting frameworks
  safetyRulesPrompt, // Always-on safety warnings, F-Gas EU 2024/573
  orgOverlayPrompt, // Per-org custom instructions from dashboard settings
  knowledgeBasePrompt, // Retrieved context from org knowledge base (index + key articles)
  sessionHistoryPrompt, // "This technician has handled 47 Daikin VRV installations"
  jobContextPrompt, // FSM job context (Phase 2)
  aiActTransparencyPrompt, // "You are an AI system, not a human expert"
]);
```

### 3.3 Self-Learning Knowledge Base (`packages/ai/knowledge/`)

Inspired by Andrej Karpathy's "LLM Knowledge Bases" pattern and Claude Code's memory system (`memdir/`, `extractMemories/`, `SessionMemory/`). The system continuously learns from sessions and builds a verifiable, org-specific + global knowledge base.

```
packages/ai/knowledge/
├── core/
│   ├── knowledgeBase.ts         # KnowledgeBase class — CRUD on wiki articles
│   ├── article.ts               # Article type: markdown + frontmatter metadata
│   ├── index.ts                 # Auto-maintained index files (summaries, categories)
│   └── types.ts
├── ingest/
│   ├── sessionIngester.ts       # Post-session: extract learnings from session data
│   ├── manualIngester.ts        # PDF/text manual upload processing
│   ├── feedbackIngester.ts      # Technician corrections/additions to AI guidance
│   └── webIngester.ts           # Manufacturer data, recall notices (scheduled)
├── compile/
│   ├── wikiCompiler.ts          # LLM "compiles" raw data into structured wiki articles
│   ├── articleGenerator.ts      # Generate/update articles from new data
│   ├── linker.ts                # Backlinks, cross-references between articles
│   ├── categorizer.ts           # Organize into concepts: equipment, procedures, safety
│   └── deduplicator.ts          # Merge duplicate knowledge entries
├── retrieve/
│   ├── search.ts                # Hybrid search: BM25 + vector + metadata filters
│   ├── embeddings.ts            # Generate embeddings for articles
│   ├── reranker.ts              # Cross-encoder reranking for precision
│   └── contextBuilder.ts        # Build prompt context from retrieved articles
├── verify/
│   ├── verificationQueue.ts     # Queue of AI-generated knowledge awaiting verification
│   ├── expertReview.ts          # Senior technician review/approval workflow
│   ├── consistencyChecker.ts    # LLM "lint" — find inconsistencies across articles
│   ├── factChecker.ts           # Cross-reference against manufacturer data
│   └── confidenceScorer.ts      # Score confidence levels
├── storage/
│   ├── vectorStore.ts           # Qdrant client (EU region)
│   ├── articleStore.ts          # Postgres: article metadata, versions, verification status
│   └── fileStore.ts             # Vercel Blob: PDF originals, images
└── health/
    ├── healthCheck.ts           # LLM audit: inconsistencies, gaps, stale data
    ├── coverageAnalyzer.ts      # Which equipment models lack documentation?
    └── suggestions.ts           # LLM suggests new articles, connections, questions to investigate
```

**5-phase knowledge flywheel:**

```
INGEST ──→ COMPILE ──→ VERIFY ──→ RETRIEVE ──→ HEALTH
  ↑                                               │
  └───────────────────────────────────────────────┘
```

**Phase 1 — INGEST:**

- Session data: equipment identified, procedures discussed, errors encountered, tool calls made
- Technician feedback: "AI was wrong about X, the correct approach is Y"
- Manual uploads: PDF manuals → ColPali multimodal embeddings (captures text + diagrams as images)
- External sources: manufacturer recall notices, regulatory updates (scheduled web scrape)

**Phase 2 — COMPILE (LLM-driven, humans verify):**

- Raw session learnings → LLM generates/updates wiki articles (markdown + frontmatter metadata)
- Articles organized by: equipment brand → model → procedure type
- Auto-generated backlinks and cross-references between related articles
- Index files maintained by LLM (brief summaries, categories) — allows direct reading at small scale
- Conflict resolution: when new data contradicts existing articles, flag for review

**Phase 3 — VERIFY (critical differentiator):**

| Confidence Level       | Source                         | Dashboard Badge | AI Attribution                               |
| ---------------------- | ------------------------------ | --------------- | -------------------------------------------- |
| `unverified`           | AI-extracted from session      | Yellow          | "Based on unverified observation..."         |
| `technician_reviewed`  | Experienced tech confirmed     | Blue            | "Based on technician-confirmed procedure..." |
| `expert_approved`      | Manager/senior tech signed off | Green           | "Based on verified procedure..."             |
| `manufacturer_sourced` | From uploaded manual/API       | Purple          | "Per manufacturer documentation..."          |

- Verification queue in dashboard: managers/senior techs review AI-generated knowledge
- Digital signatures on verified articles (audit trail)
- Automatic flagging when new articles contradict verified knowledge
- Stale detection: articles not referenced in N months marked for review

**Phase 4 — RETRIEVE (during live sessions):**

- Gemini calls `searchKnowledgeBase()` tool mid-conversation
- Hybrid search: keyword (BM25) + semantic (vector via Qdrant) + metadata filters (equipment model)
- Cross-encoder reranking on top-K results for precision
- Retrieved articles injected into Gemini context as tool response
- Source attribution: "Based on verified procedure for Daikin VRV IV..."

**Phase 5 — HEALTH (continuous improvement):**

- LLM audits wiki for inconsistencies, imputes missing data
- Identifies coverage gaps: "No articles for Mitsubishi PUMY series"
- Suggests new article candidates from cross-referencing session patterns
- Tracks article utility: which articles are retrieved most, which correlate with positive session feedback
- Output: health report visible in dashboard analytics section

**Key architectural decisions (from Claude Code's `extractMemories`):**

- Knowledge extraction runs **asynchronously after each session** (Inngest job), not during — avoids impacting session latency
- The LLM writes and maintains all wiki data; humans verify, rarely edit directly
- At small scale (<500 articles / ~400K words): LLM reads index files directly without full RAG
- At scale: full RAG via Qdrant vector search takes over from index-file browsing
- Per-org knowledge is isolated; global knowledge (manufacturer specs, regulatory info) shared across orgs

### 3.4 Multi-Agent Architecture (Phase 2)

Modeled on Claude Code's `coordinator/` and `AgentTool` — specialized sub-agents for complex tasks:

- **DiagnosticAgent:** Multi-step troubleshooting following plan → act → observe → reflect loop. Decomposes complex problems into sequential diagnostic steps.
- **SafetyAuditAgent:** Reviews completed session for safety compliance, generates exportable compliance report.
- **SummaryAgent:** Post-session, generates structured summary with findings, recommendations, and revenue opportunities (equipment nearing end-of-life, efficiency upgrades).
- **KnowledgeAgent:** Processes session data into knowledge base articles, handles the compile and categorize steps.

---

## 4. Knowledge Base & AI Context Architecture

### 4.1 Context Layers (Injected into Gemini System Prompt)

| Layer                         | Source                                            | Scope             | Example                                                                                                        |
| ----------------------------- | ------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Base HVAC knowledge**       | Curated system prompt                             | All organizations | General HVAC principles, safety procedures, common equipment                                                   |
| **Organization context**      | Org settings in dashboard                         | Per-org           | "We are Klimatechnik GmbH, we primarily service Daikin and Mitsubishi units, our safety protocol requires XYZ" |
| **Knowledge base**            | Retrieved articles via `searchKnowledgeBase` tool | Per-org + global  | Verified procedures, error code meanings, equipment-specific instructions                                      |
| **Equipment library**         | ColPali RAG over uploaded manuals                 | Per-org           | Specific model numbers, wiring diagrams, error code lookups                                                    |
| **Verified tribal knowledge** | Technician-confirmed corrections                  | Per-org           | "For Daikin VRV IV U4 error, always check the thermistor at the outdoor unit first"                            |
| **Session history**           | Aggregated from past sessions                     | Per-technician    | "This technician has handled 47 Daikin VRV installations"                                                      |
| **Job context**               | FSM integration (future)                          | Per-session       | "This is a maintenance call for a 2019 Daikin FTXM, customer reported error code U4"                           |

### 4.2 System Prompt Architecture

The system prompt follows a layered structure, assembled by `buildEffectiveSystemPrompt()`:

1. **Core behavior + AI Act transparency:** Role definition, safety-first mandate, language adaptation rules, explicit AI disclosure
2. **HVAC expertise + safety rules:** Domain knowledge, troubleshooting frameworks, F-Gas EU 2024/573 references, lockout/tagout, emergency response protocols
3. **Organization overlay:** Company-specific instructions from dashboard settings (free text, validated for length)
4. **Knowledge base context:** Retrieved articles injected with confidence tags — the AI knows whether information is verified or unverified
5. **Session history:** Aggregated technician experience summary

The dashboard allows owners/managers to add organization-specific instructions that get appended to the system prompt for all sessions in their org. This customization requires zero technical knowledge.

### 4.3 Knowledge Base Data Model

**Article schema:** `id`, `org_id` (nullable — null = global), `slug`, `title`, `category`, `content_md`, `summary`, `equipment_brand`, `equipment_model`, `confidence_level` (unverified/technician_reviewed/expert_approved/manufacturer_sourced), `source_type` (session/manual/feedback/web/llm_generated), `source_session_id`, `version`, `previous_version_id`, `embedding_id` (Qdrant point ID), `word_count`, `retrieval_count`, `last_retrieved_at`, `created_by`, `verified_by`, `verified_at`, `created_at`, `updated_at`

**Verification schema:** `id`, `article_id`, `org_id`, `reviewer_id`, `status` (pending/approved/rejected/needs_revision), `reviewer_notes`, `reviewed_at`, `created_at`

**Link schema:** `id`, `source_article_id`, `target_article_id`, `link_type` (reference/prerequisite/related), `created_at`

---

## 5. Security Architecture

### 5.1 Data Security

| Layer                | Measure                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Data in transit**  | TLS 1.3 for all HTTP/WSS connections                                                                  |
| **Data at rest**     | Neon Postgres AES-256 encryption at rest; Upstash Redis encryption at rest                            |
| **API key security** | Gemini API key never reaches the client; ephemeral tokens with constrained permissions                |
| **Authentication**   | Better Auth with session tokens stored in `expo-secure-store` (iOS Keychain / Android Keystore)       |
| **Authorization**    | Role-based access control via Better Auth organization plugin; permissions checked in tRPC middleware |
| **Input validation** | Zod schemas on every tRPC procedure; server-side validation only (never trust client)                 |

### 5.2 Audit Trail

Every significant action is logged to an `audit_log` table:

- User authentication events (login, logout, failed attempts)
- Organization changes (member added/removed, role changed, settings modified)
- Session lifecycle events (started, ended, failed)
- Knowledge base changes (article created, verified, rejected)
- Data export requests
- Admin actions (invite created, account deactivated)

Each audit entry includes: timestamp, actor (user ID), action type, target entity, IP address, and metadata. Audit logs are immutable (append-only) and retained for the legal minimum period.

### 5.3 Organizational Data Isolation

Multi-tenant architecture with strict data isolation:

- Every database query includes `org_id` filtering — enforced at the tRPC middleware level, not left to individual router implementations
- Technicians can only see their own sessions; managers can see sessions within their org; owners can see everything in their org
- No cross-org data access is possible through the API

### 5.4 Rate Limiting

Implemented as tRPC middleware using `@upstash/ratelimit`:

| Endpoint                       | Strategy                | Limit      |
| ------------------------------ | ----------------------- | ---------- |
| Auth endpoints (login, signup) | Fixed window per IP     | 10/minute  |
| `session.createToken`          | Sliding window per user | 5/minute   |
| tRPC general                   | Token bucket per user   | 100/minute |
| Invite code generation         | Fixed window per org    | 20/hour    |
| Data export                    | Fixed window per org    | 2/hour     |

### 5.5 Knowledge Base Access Control

- Org-scoped articles: only accessible by org members
- Global articles: readable by all, writable only by system
- Verification actions: restricted to `manager` and `owner` roles
- Article edit history: versioned, immutable audit trail

---

## 6. Tech Stack Decisions

Every tool at its latest stable version as of April 2026. Open-source chosen over paid when quality is comparable.

### 6.1 Monorepo Foundation

| Decision                  | Tool                    | Version | Why                                                                        |
| ------------------------- | ----------------------- | ------- | -------------------------------------------------------------------------- |
| Build orchestrator        | **Turborepo**           | 2.9.x   | Vercel-native, auto-detects workspace structure                            |
| Package manager + runtime | **Bun**                 | 1.3.x   | 25-30x faster installs; transparent `node_modules` for Metro compatibility |
| Language                  | **TypeScript (strict)** | 6.0.x   | End-to-end type safety from DB schema to mobile UI                         |

### 6.2 Frontend

| Decision                     | Tool                                  | Version                       | Why                                                                                       |
| ---------------------------- | ------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| Mobile framework             | **Expo SDK**                          | 55                            | New Architecture default, managed workflow, EAS Build/Update                              |
| Mobile navigation            | **Expo Router**                       | 55.x                          | File-based routing, typed routes, deep linking                                            |
| Dashboard framework          | **Next.js**                           | 16.2.x                        | Cache Components (`"use cache"`), Turbopack stable, React Compiler                        |
| Dashboard styling            | **Tailwind CSS v4**                   | 4.2.x                         | CSS-first config, shared design tokens with mobile                                        |
| Mobile styling               | **NativeWind v5 + Tailwind v4**       | NW 5.0.0-preview.3 + TW 4.2.x | Unified Tailwind v4 across web + mobile                                                   |
| Dashboard components         | **shadcn/ui**                         | CLI v4                        | Copy-paste ownership, Radix primitives, accessible                                        |
| Mobile components            | **React Native Reusables**            | Latest                        | shadcn philosophy for React Native, NativeWind-based                                      |
| Client state (live sessions) | **Zustand**                           | 5.0.x                         | `getState()`/`setState()` outside React — required for WebSocket + native audio callbacks |
| Server state                 | **TanStack Query**                    | 5.96.x                        | Request/response caching for tRPC                                                         |
| i18n                         | **react-i18next + expo-localization** | Latest                        | Cross-platform, TypeScript key autocomplete                                               |

**NativeWind v5 compatibility:** Requires React Native 0.83.x+ (Expo SDK 55), Reanimated v4+ (4.3.x), New Architecture (Fabric) enabled by default in Expo SDK 55.

### 6.3 API & Data

| Decision            | Tool                             | Version    | Why                                                             |
| ------------------- | -------------------------------- | ---------- | --------------------------------------------------------------- |
| Internal API        | **tRPC**                         | 11.16.x    | End-to-end type safety                                          |
| Real-time dashboard | **tRPC subscriptions (SSE)**     | (built-in) | Live session monitoring without polling                         |
| Validation          | **Zod**                          | 4.3.x      | Single schema validates tRPC input, forms, and DB inserts       |
| ORM                 | **Drizzle ORM**                  | 0.45.x     | 7.4KB footprint, sub-500ms serverless cold starts, SQL-like API |
| Database            | **Neon Postgres (EU Frankfurt)** | Latest     | Serverless, branching for previews, EU data residency           |
| Cache               | **Upstash Redis (EU)**           | Latest     | HTTP-based, rate limiting, ephemeral token caching              |
| Vector DB           | **Qdrant (EU)**                  | 1.17.x     | Knowledge base vector search, hybrid retrieval                  |
| Background jobs     | **Inngest**                      | 4.1.x      | Serverless-native, step functions with independent retries      |
| OpenAPI generation  | **zod-to-openapi**               | Latest     | Phase 2 public API prep at zero cost from existing Zod schemas  |

### 6.4 Authentication

| Decision       | Tool            | Version | Why                                                                                                      |
| -------------- | --------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| Auth framework | **Better Auth** | 1.5.x   | Open-source, self-hosted, org plugin with RBAC, Expo plugin, data in your Postgres — zero vendor lock-in |

**Organization model:** `organization()` plugin with roles: `owner`, `manager`, `technician`. Permissions: `org:sessions:view`, `org:sessions:manage`, `org:team:invite`, `org:team:manage`, `org:settings:edit`, `org:billing:manage`, `org:analytics:view`, `org:analytics:export`, `org:knowledge:verify`.

### 6.5 AI / Real-Time

| Decision            | Tool                        | Version    | Why                                                                                    |
| ------------------- | --------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| AI model            | **Gemini 2.5 Flash Live**   | Latest     | Real-time multimodal (video + audio) via WebSocket; auto language detection            |
| Gemini SDK          | **@google/genai**           | 1.48.x     | Unified SDK (replaces legacy `@google/generative-ai`)                                  |
| API key security    | **Ephemeral tokens**        | N/A        | Short-lived, constrained to system prompt + tools; eliminates need for WebSocket proxy |
| Audio recording     | **expo-av / custom PCM**    | Latest     | PCM 16kHz/16-bit/mono matching Gemini input                                            |
| Audio playback      | **react-native-audio-api**  | Latest     | `AudioBufferQueueSourceNode` for streaming PCM at 24kHz                                |
| Video capture       | **expo-camera**             | 55.x       | 1 FPS JPEG capture at 768x768                                                          |
| Tool calling        | **Gemini function calling** | (built-in) | 10 HVAC-specific tools called mid-conversation                                         |
| Knowledge retrieval | **ColPali + Qdrant**        | Latest     | Multimodal RAG for equipment manuals (text + diagrams)                                 |
| On-device fallback  | **Gemma 4 E2B via LiteRT**  | (Phase 2)  | 2.3B parameter offline AI for connectivity loss                                        |

### 6.6 Infrastructure & Deployment

| Decision               | Tool                          | Version | Why                                                       |
| ---------------------- | ----------------------------- | ------- | --------------------------------------------------------- |
| Dashboard hosting      | **Vercel**                    | Latest  | Native Turborepo support, preview deploys, edge functions |
| Mobile CI/CD           | **EAS Build + EAS Workflows** | Latest  | M4 Pro builds, OTA updates, GitHub Actions integration    |
| CI pipeline            | **GitHub Actions**            | Latest  | Turborepo remote caching                                  |
| Background job hosting | **Inngest on Vercel**         | 4.1.x   | Serverless-native, no separate infrastructure             |
| Vector DB hosting      | **Qdrant Cloud (EU)**         | 1.17.x  | Managed, EU data residency; or self-hosted for cost       |

### 6.7 Observability & Quality

| Decision                      | Tool                        | Version                    | Why                                                    |
| ----------------------------- | --------------------------- | -------------------------- | ------------------------------------------------------ |
| Analytics + feature flags     | **PostHog** (self-hostable) | Web 1.364.x / RN 4.39.x    | Replaces 3 paid services; unlimited flags on free tier |
| Error tracking                | **Sentry**                  | Next.js 10.47.x / RN 8.7.x | First-class Expo + Next.js SDKs; free tier             |
| Linting + formatting          | **Biome**                   | 2.4.x                      | Single tool, 35x faster than ESLint + Prettier         |
| Unit/integration tests        | **Vitest**                  | 4.1.x                      | Vite-native, shared config                             |
| Web E2E                       | **Playwright**              | 1.59.x                     | WebSocket mocking support                              |
| Mobile E2E                    | **Maestro**                 | 2.4.x                      | Expo-recommended, YAML-based                           |
| API/WS mocking                | **MSW v2**                  | 2.12.x                     | `ws.link()` for WebSocket interception                 |
| Distributed tracing (Phase 2) | **@vercel/otel**            | Latest                     | OpenTelemetry for billing/latency debugging            |

### 6.8 Payments & Email

| Decision             | Tool                     | Version                  | Why                                                    |
| -------------------- | ------------------------ | ------------------------ | ------------------------------------------------------ |
| Web payments         | **Stripe**               | 21.x                     | Dashboard checkout, billing portal                     |
| Mobile subscriptions | **RevenueCat**           | 9.15.x                   | App Store/Play Store receipts, free under $2,500/month |
| Transactional email  | **React Email + Resend** | RE 5.2.x / Resend 6.10.x | React templates, 3,000 free emails/month               |

### 6.9 Mobile-Specific

| Decision                 | Tool                                | Why                                                   |
| ------------------------ | ----------------------------------- | ----------------------------------------------------- |
| Screen wake lock         | **expo-keep-awake**                 | Prevents dimming during sessions                      |
| Android background audio | **@notifee/react-native**           | Foreground service for sustained audio                |
| Push notifications       | **expo-notifications**              | Job alerts, session summaries, expert escalation      |
| OTA updates              | **expo-updates**                    | Field-deployed B2B app; can't always update via store |
| Local storage            | **MMKV** (4.3.x)                    | 30x faster than AsyncStorage, synchronous             |
| Connectivity             | **@react-native-community/netinfo** | Offline detection + reconnection                      |

---

## 7. Monorepo Directory Structure

```
aucta/
├── apps/
│   ├── mobile/                              # Expo SDK 55 (technician-facing)
│   │   ├── app/                             # Expo Router file-based routes
│   │   │   ├── (auth)/                      # Auth screens (login, signup, join-org)
│   │   │   ├── (app)/                       # Authenticated screens
│   │   │   │   ├── session/                 # Live AI session
│   │   │   │   ├── history/                 # Past sessions
│   │   │   │   └── settings/                # Preferences
│   │   │   └── _layout.tsx
│   │   ├── components/
│   │   │   ├── session/                     # Camera, audio, status, escalation
│   │   │   ├── auth/                        # Login, org join
│   │   │   └── common/
│   │   ├── hooks/                           # useGeminiSession, useAudioRecorder, etc.
│   │   ├── stores/                          # Zustand: session.store.ts, app.store.ts
│   │   ├── lib/
│   │   │   ├── auth-client.ts               # Better Auth + expo plugin
│   │   │   ├── api.ts                       # tRPC client
│   │   │   └── gemini/                      # Connection, protocol, audio, constants
│   │   └── package.json
│   │
│   └── web/                                 # Next.js 16 (owner/manager-facing)
│       ├── app/
│       │   ├── (auth)/                      # Auth pages
│       │   ├── (dashboard)/
│       │   │   ├── overview/
│       │   │   ├── sessions/
│       │   │   ├── team/
│       │   │   ├── analytics/
│       │   │   ├── knowledge/               # Knowledge base management
│       │   │   └── settings/
│       │   └── api/
│       │       ├── trpc/[trpc]/             # tRPC handler
│       │       ├── auth/[...all]/           # Better Auth handler
│       │       ├── inngest/                 # Inngest handler
│       │       └── token/                   # Ephemeral token issuer
│       ├── modules/                         # Web-specific tRPC hooks + components
│       │   ├── sessions/
│       │   │   └── hooks/useSessionList.ts  # tRPC queries — MUST live here
│       │   ├── knowledge/
│       │   │   └── hooks/useVerificationQueue.ts
│       │   └── analytics/
│       │       └── hooks/useAnalytics.ts
│       ├── components/
│       │   ├── dashboard/                   # Charts, metrics, data tables
│       │   ├── sessions/                    # Session list, detail, transcript
│       │   ├── team/                        # Roster, invite, roles
│       │   ├── knowledge/                   # Article browser, verification, upload
│       │   └── common/
│       └── package.json
│
├── packages/
│   ├── ai/                                  # AI Pipeline (most critical package)
│   │   └── src/
│   │       ├── tools/                       # Tool system (buildTool pattern)
│   │       │   ├── base.ts                  # Tool factory, types, schemas
│   │       │   ├── registry.ts              # assembleToolPool()
│   │       │   ├── lookupErrorCode/
│   │       │   ├── getEquipmentSpecs/
│   │       │   ├── getWiringDiagram/
│   │       │   ├── calculateRefrigerantCharge/
│   │       │   ├── checkSafetyRecall/
│   │       │   ├── getOrgProcedure/
│   │       │   ├── logFinding/
│   │       │   ├── identifyPart/
│   │       │   ├── searchKnowledgeBase/
│   │       │   └── escalateToExpert/
│   │       ├── session/                     # Session orchestration engine
│   │       │   ├── orchestrator.ts
│   │       │   ├── connection.ts
│   │       │   ├── systemPrompt.ts
│   │       │   ├── toolDispatcher.ts
│   │       │   ├── audioProcessor.ts
│   │       │   ├── videoProcessor.ts
│   │       │   ├── reconnection.ts
│   │       │   ├── eventLogger.ts
│   │       │   └── types.ts
│   │       ├── knowledge/                   # Self-learning knowledge base
│   │       │   ├── core/
│   │       │   ├── ingest/
│   │       │   ├── compile/
│   │       │   ├── retrieve/
│   │       │   ├── verify/
│   │       │   ├── storage/
│   │       │   └── health/
│   │       ├── prompts/                     # System prompt fragments
│   │       │   ├── core.ts
│   │       │   ├── hvacExpertise.ts
│   │       │   ├── safety.ts
│   │       │   ├── aiActTransparency.ts
│   │       │   └── builder.ts
│   │       └── agents/                      # Specialized sub-agents (Phase 2)
│   │           ├── diagnosticAgent.ts
│   │           ├── safetyAuditAgent.ts
│   │           ├── summaryAgent.ts
│   │           └── knowledgeAgent.ts
│   │
│   ├── api/                                 # tRPC router definitions
│   │   └── src/
│   │       ├── root.ts                      # Merged router
│   │       ├── trpc.ts                      # Init, context, middleware, rate limiting
│   │       ├── routers/                     # auth, org, session, technician, analytics, billing, knowledge
│   │       └── jobs/                        # Inngest job definitions
│   │           ├── sessionSummarize.ts
│   │           ├── knowledgeIngest.ts
│   │           ├── analyticsAggregate.ts
│   │           ├── billingMeter.ts
│   │           ├── gdprExport.ts
│   │           ├── gdprDelete.ts
│   │           └── inviteExpire.ts
│   │
│   ├── db/                                  # Drizzle ORM schema + repositories
│   │   └── src/
│   │       ├── client.ts
│   │       ├── schema/                      # users, orgs, members, sessions, events,
│   │       │                                # invites, profiles, audit-log, org-settings,
│   │       │                                # knowledge-articles, knowledge-verifications,
│   │       │                                # knowledge-links
│   │       ├── repositories/                # Data access layer (Drizzle stays here)
│   │       │   ├── sessionRepository.ts
│   │       │   ├── knowledgeRepository.ts
│   │       │   ├── technicianRepository.ts
│   │       │   ├── orgRepository.ts
│   │       │   └── auditRepository.ts
│   │       ├── relations.ts
│   │       └── types.ts                     # Inferred types from schema
│   │
│   ├── auth/                                # Better Auth shared config
│   │   └── src/                             # server.ts, client.ts, plugins.ts, permissions.ts
│   │
│   ├── shared/                              # Cross-app types, schemas, constants, utils
│   │   └── src/
│   │       ├── schemas/                     # Zod schemas (SINGLE SOURCE OF TRUTH)
│   │       ├── dto/                         # DTOs at every boundary (Zod-validated)
│   │       ├── types/                       # Inferred TypeScript types
│   │       ├── constants/                   # roles, session-status, languages, limits
│   │       └── utils/                       # format, validate, errors, id generation
│   │           └── errors.ts                # ErrorWithCode class
│   │
│   ├── ui/                                  # Web-only shadcn/ui components
│   ├── email/                               # React Email templates + Resend wrapper
│   ├── i18n/                                # Shared translations (en, de, tr, sr, hr, pl, ro)
│   └── config/                              # Shared Tailwind v4 preset, tsconfig, biome config
│       ├── tailwind.config.ts               # Shared Tailwind v4 config
│       ├── tailwind-mobile.config.ts        # NativeWind v5 overrides
│       └── design-tokens.ts                 # Shared tokens (colors, spacing, typography)
│
├── tooling/
│   ├── scripts/                             # setup.sh, db-reset.sh, generate-types.ts
│   └── docker/                              # Local Postgres + Redis + Qdrant for offline dev
│
├── agents/                                  # AI agent rules & knowledge (single source of truth)
│   ├── rules/                               # Modular engineering rules with impact ratings
│   ├── skills/                              # Reusable prompts
│   ├── commands.md                          # Full CLI command reference
│   └── knowledge-base.md                    # Domain knowledge & business rules
│
├── specs/                                   # Spec-driven development (opt-in)
│   └── _templates/                          # Template for new feature specs
│
├── docs/
│   ├── TECH-SPEC.md                         # This document
│   ├── LEGAL-ADMIN.md                       # Legal/administrative companion
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── AGENTS.md                                # Main agent guide — Do/Don't, Boundaries, PR checklist
├── CLAUDE.md                                # Pointer to AGENTS.md (auto-loaded by Claude Code)
├── SPEC-WORKFLOW.md                         # Spec-driven development workflow (opt-in)
├── turbo.json
├── package.json                             # packageManager: "bun@1.3.x", workspaces
└── bun.lock
```

### 7.1 End-to-End Type Safety Chain

```
Zod schema (packages/shared)
    → tRPC input validation (packages/api)
    → Drizzle table definition (packages/db)
    → Inferred row types (packages/db/types)
    → TanStack Query hooks (apps/mobile, apps/web)
    → UI rendering (type-checked props)
```

A schema change in `packages/shared` propagates TypeScript errors to every consumer — across both apps. No runtime surprises.

### 7.2 LLM-Optimized Development

This project will be primarily built with AI coding agents. Patterns that maximize LLM productivity:

- **AGENTS.md at root:** Main agent guide loaded by all AI tools (Claude Code, Cursor, etc.). Do/Don't, Boundaries, PR checklist.
- **CLAUDE.md:** Thin pointer to AGENTS.md (auto-loaded by Claude Code).
- **agents/ directory:** Modular engineering rules with impact ratings, domain knowledge base, and command reference. Symlinked into `.claude/` and `.cursor/` for tool-agnostic sharing.
- **specs/ directory:** Opt-in spec-driven development for complex features. Each spec has its own CLAUDE.md for feature-specific agent context.
- **Co-located files:** Each feature is a directory (component + hook + types + constants), not scattered across global folders.
- **Descriptive file names:** `session.router.ts` not `router.ts`; `useAudioRecorder.ts` not `useRecorder.ts`.
- **No barrel files:** LLMs handle direct imports better than re-export chains.
- **One concept per file:** Functions under 30 lines; extract helpers into named files.
- **Test co-location:** `session.router.test.ts` lives next to `session.router.ts`.
- **Prefixed IDs:** `ses_`, `org_`, `usr_`, `evt_`, `inv_`, `art_`, `ver_` — self-documenting in logs and debuggers.
- **Composition over inheritance:** Following Claude Code's architecture — 40+ tools, each a self-contained module registered in a pool.

### 7.3 Architectural Patterns

These patterns are adapted from Cal.com's 16,000+ commit monorepo and are enforced via Biome lint rules and code review.

#### Repository Pattern (CRITICAL)

All database access goes through Repository classes. Drizzle ORM calls never appear in services, tRPC routers, or UI code.

```typescript
// packages/db/src/repositories/sessionRepository.ts
export class SessionRepository {
  constructor(private db: DrizzleClient) {}

  async findById(id: string, orgId: string): Promise<SessionDTO | null> {
    const rows = await this.db
      .select({
        id: aiSessions.id,
        orgId: aiSessions.orgId,
        status: aiSessions.status,
        startedAt: aiSessions.startedAt,
      })
      .from(aiSessions)
      .where(and(eq(aiSessions.id, id), eq(aiSessions.orgId, orgId)));
    return rows[0] ?? null;
  }
}
```

Benefits: technology changes (e.g., migrating from Drizzle to another ORM) only affect repository implementations. Nothing else in the codebase changes.

#### DTO Boundaries (CRITICAL)

Drizzle row types never leak to the frontend. Explicit Zod-validated DTOs at every architectural boundary:

```
Repository (Drizzle types) → DTO → Service → DTO → tRPC Router → Client
```

DTOs live in `packages/shared/src/dto/` and are validated with Zod. Use string literal unions instead of Drizzle enums to stay ORM-agnostic.

#### Constructor Injection (HIGH)

Services receive dependencies through constructor injection for testability:

```typescript
// packages/ai/src/session/sessionService.ts
interface SessionServiceDeps {
  sessionRepo: SessionRepository;
  tokenService: TokenService;
  eventLogger: EventLogger;
}

export class SessionService {
  constructor(private deps: SessionServiceDeps) {}

  async startSession(input: StartSessionInput) {
    const token = await this.deps.tokenService.createEphemeral(input);
    const session = await this.deps.sessionRepo.create({ ...input, token });
    return session;
  }
}
```

In tests, dependencies are easily mocked. In production, they are wired via a factory or DI container.

#### Error Handling Pattern (HIGH)

- `ErrorWithCode` in services, repositories, and AI tools (never imports tRPC)
- `TRPCError` only in tRPC router files
- tRPC middleware auto-converts `ErrorWithCode` to the appropriate `TRPCError`

```typescript
// In a service — no tRPC import
throw ErrorWithCode.NotFound(`Session ${id} not found for org ${orgId}`);

// In a tRPC router — TRPCError is allowed here
throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
```

#### Feature Boundaries (HIGH)

- `packages/ai/`, `packages/db/`, `packages/shared/` — framework-agnostic, no tRPC client imports
- `apps/web/modules/` — Next.js-specific code, tRPC hooks, web-only components
- `apps/mobile/modules/` — Expo-specific code, tRPC hooks, native components
- Import direction is one-way: packages → apps, never the reverse
- Enforced via Biome `noRestrictedImports` rules

#### PR Size Guidelines (HIGH)

- Under 500 lines of code changes per PR
- Under 10 files changed per PR
- Conventional commit titles (`feat:`, `fix:`, `refactor:`)
- Draft PRs by default
- Split by layer (schema → backend → frontend), by feature component, or by refactor vs feature

See `AGENTS.md` for the full PR checklist and boundary rules.

---

## 8. Gemini Live API Architecture

### 8.1 Connection Flow

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Mobile App    │         │   Dashboard API  │         │   Gemini Live   │
│   (Expo)        │         │   (Next.js 16)   │         │   (Google)      │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ 1. session.createToken    │                           │
         │ ─────────────────────────>│                           │
         │                           │ 2. Auth + org verify      │
         │                           │ 3. Create ai_sessions row │
         │                           │ 4. Build layered system   │
         │                           │    prompt                 │
         │                           │ 5. Register tool          │
         │                           │    declarations           │
         │                           │                           │
         │                           │ 6. POST ephemeral token   │
         │                           │ ─────────────────────────>│
         │                           │ <─────────────────────────│
         │                           │ 7. token + config         │
         │                           │                           │
         │ <─────────────────────────│                           │
         │ 8. { token, sessionId,    │                           │
         │      tools, config }      │                           │
         │                           │                           │
         │ 9. WSS connect            │                           │
         │ ──────────────────────────────────────────────────────>│
         │ 10. setup { model, voice, │                           │
         │      systemInstruction,   │                           │
         │      tools }              │                           │
         │                           │                           │
         │ 11. JPEG + PCM stream     │                           │
         │ ──────────────────────────────────────────────────────>│
         │ <──────────────────────────────────────────────────────│
         │ 12. PCM audio + text      │                           │
         │     + toolCalls           │                           │
         │                           │                           │
         │ 13. toolCall: e.g.        │                           │
         │     searchKnowledgeBase   │                           │
         │ ─────────────────────────>│ (tRPC call)               │
         │ <─────────────────────────│ (tool result)             │
         │                           │                           │
         │ 14. toolResponse          │                           │
         │ ──────────────────────────────────────────────────────>│
         │                           │                           │
         │ 15. Batched event logs    │                           │
         │     (every 5 seconds)     │                           │
         │ ─────────────────────────>│ 16. Insert session_events │
```

### 8.2 Function Calling Architecture

- Tool declarations are embedded in the WebSocket `setup` message as `tools[].functionDeclarations`
- Gemini 2.5 Flash Live supports **async function calling**: the AI can request a tool call while continuing to stream audio — the tool executes in the background and the result is injected when ready
- The `toolDispatcher` resolves incoming `toolCall` events to the matching tool from the registry, validates input via the tool's Zod schema, calls `call()`, and sends back a `toolResponse`
- Tool call timeout: 10 seconds (configurable per tool); on timeout, an error response is returned to Gemini
- Multiple concurrent tool calls are supported — the dispatcher uses the `toolUseId` to match responses

### 8.3 Offline Resilience

Job sites (basements, rooftops, rural areas) often have poor connectivity.

- **Connectivity monitoring:** `@react-native-community/netinfo` detects connection state changes
- **Graceful degradation:** On connection loss, show clear "Connection lost" UI with last AI response visible
- **Auto-reconnect:** Exponential backoff (1s → 2s → 4s → max 30s), using Gemini's `sessionResumption` for session continuity
- **Local buffer:** Continue recording audio/video locally during disconnection; on reconnect, provide context to the AI that a gap occurred (do NOT replay buffered data — latency would be too high)
- **Offline reference:** Cache recent session summaries and frequently used knowledge articles locally via MMKV
- **On-device fallback (Phase 2):** Gemma 4 E2B (2.3B parameters, Apache 2.0) via Google AI Edge LiteRT runs on the phone's NPU. Provides basic guidance, safety lookups, and cached knowledge queries without connectivity. Seamless handoff back to Gemini Live when connectivity returns.

---

## 9. Database Schema

All tables managed via Drizzle ORM. Better Auth manages its own tables (`user`, `session`, `account`, `organization`, `member`) automatically.

### 9.1 Application Tables

| Table                 | Purpose                         | Key Fields                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai_sessions`         | One row per AI guidance session | id, org_id, user_id, status (active/completed/failed/timeout), started_at, ended_at, duration_ms, model_version, language_detected, token_count_input, token_count_output, cost_usd, feedback_rating, feedback_note, summary, equipment_identified (jsonb), revenue_opportunities (jsonb), tools_used (jsonb), metadata (jsonb) |
| `session_events`      | Granular event log per session  | id, session_id, event_type (connect/disconnect/reconnect/audio_start/video_start/model_response/error/tool_use/tool_response/feedback), timestamp, latency_ms, data (jsonb)                                                                                                                                                     |
| `technician_profiles` | Extended technician data        | id, user_id, org_id, preferred_language, specialties (jsonb), total_sessions, total_duration_ms, average_rating, last_active_at                                                                                                                                                                                                 |
| `invite_codes`        | Org invitation system           | id, org_id, code (6-char), created_by, role (technician/manager), max_uses, used_count, expires_at                                                                                                                                                                                                                              |
| `audit_log`           | Immutable action trail          | id, org_id, actor_id, action_type, target_entity, target_id, ip_address, metadata (jsonb), created_at                                                                                                                                                                                                                           |
| `org_settings`        | Per-org AI + app configuration  | id, org_id, custom_system_prompt, data_retention_days, escalation_contacts (jsonb), notification_prefs (jsonb), billing_config (jsonb)                                                                                                                                                                                          |

### 9.2 Knowledge Base Tables

| Table                     | Purpose                                  | Key Fields                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `knowledge_articles`      | The wiki — AI-maintained, human-verified | id, org_id (nullable), slug, title, category, content_md, summary, equipment_brand, equipment_model, confidence_level, source_type, source_session_id, version, previous_version_id, embedding_id, word_count, retrieval_count, last_retrieved_at, created_by, verified_by, verified_at, created_at, updated_at |
| `knowledge_verifications` | Verification queue entries               | id, article_id, org_id, reviewer_id, status (pending/approved/rejected/needs_revision), reviewer_notes, reviewed_at, created_at                                                                                                                                                                                 |
| `knowledge_links`         | Article backlinks (auto-maintained)      | id, source_article_id, target_article_id, link_type (reference/prerequisite/related), created_at                                                                                                                                                                                                                |

### 9.3 Scaling Considerations

At early stage, Postgres handles everything. When `session_events` exceeds tens of millions of rows:

- Add **TimescaleDB** as a Postgres extension for time-based partitioning and 90-95% compression
- No separate database needed; no migration; `CREATE EXTENSION timescaledb` and convert the table

---

## 10. Background Job System (Inngest)

Inngest runs on existing Vercel infrastructure (serverless-native). Handler at `apps/web/app/api/inngest/route.ts`. Free tier: 25K-50K runs/month.

| #   | Job                    | Trigger                       | Steps                                                                                          |
| --- | ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `session.summarize`    | `session/ended` event         | Fetch session → fetch events → generate AI summary → save → extract knowledge → notify manager |
| 2   | `knowledge.ingest`     | `knowledge/session-completed` | Extract learnings → compile articles → update index → check health                             |
| 3   | `knowledge.compile`    | `knowledge/manual-uploaded`   | Process PDF (ColPali) → generate embeddings → create articles → link related                   |
| 4   | `analytics.aggregate`  | Cron: daily at 02:00 UTC      | Roll up session_events into daily stats per org                                                |
| 5   | `billing.meter`        | Cron: hourly                  | Count sessions per org for usage tracking                                                      |
| 6   | `gdpr.export`          | `gdpr/export-requested`       | Package all org data as JSON/CSV → upload to Vercel Blob → email download link                 |
| 7   | `gdpr.delete`          | `gdpr/deletion-requested`     | Cascade delete personal data → anonymize session metadata → purge from Qdrant                  |
| 8   | `email.sessionSummary` | `session/summary-ready`       | Send formatted session summary to manager (if configured)                                      |
| 9   | `invite.expire`        | Cron: daily at 00:00 UTC      | Mark expired invite codes                                                                      |
| 10  | `audit.archive`        | Cron: monthly                 | Archive audit logs older than retention period                                                 |

```typescript
// Example: packages/api/src/jobs/sessionSummarize.ts
inngest.createFunction(
  { id: "session-summarize", name: "Generate Session Summary" },
  { event: "session/ended" },
  async ({ event, step }) => {
    const session = await step.run("fetch-session", () =>
      getSession(event.data.sessionId),
    );
    const events = await step.run("fetch-events", () =>
      getSessionEvents(session.id),
    );
    const summary = await step.run("generate-summary", () =>
      generateSummary(session, events),
    );
    await step.run("save-summary", () =>
      updateSession(session.id, { summary }),
    );
    await step.run("ingest-knowledge", () =>
      extractKnowledge(session, events, summary),
    );
    await step.run("notify-manager", () => sendSummaryEmail(session, summary));
  },
);
```

---

## 11. Deployment & DNS

| Domain           | Points To               | Managed By                     |
| ---------------- | ----------------------- | ------------------------------ |
| `domain.com`     | Framer                  | Framer DNS                     |
| `app.domain.com` | Vercel                  | CNAME → `cname.vercel-dns.com` |
| Mobile app       | App Store / Google Play | EAS Build                      |

### 11.1 Estimated Monthly Costs (Early Stage)

| Service                       | Cost                  |
| ----------------------------- | --------------------- |
| Vercel Pro                    | EUR 20                |
| Neon Postgres (EU, Launch)    | EUR 19                |
| Upstash Redis (EU)            | EUR 0-5               |
| Qdrant Cloud (EU, free tier)  | EUR 0                 |
| EAS Build (free tier)         | EUR 0                 |
| Framer Basic                  | EUR 5-15              |
| PostHog (free / self-hosted)  | EUR 0                 |
| Sentry (free tier)            | EUR 0                 |
| Resend (free tier)            | EUR 0                 |
| Better Auth                   | EUR 0 (open-source)   |
| Inngest (free tier, 25K runs) | EUR 0                 |
| Gemini API                    | ~EUR 10-50 (usage)    |
| **Total**                     | **~EUR 55-110/month** |

---

## 12. CI/CD Pipeline

**On every push:**

- Biome lint + format check
- TypeScript type-check (`turbo run typecheck`)
- Vitest unit tests (`turbo run test`)
- Build all packages (`turbo run build` with remote caching)
- Inngest function type verification

**On push to main:**

- Vercel auto-deploys dashboard (preview → production)
- Neon database branch created per PR (copy-on-write, isolated test data)
- If `apps/mobile/**` or `packages/**` changed: trigger EAS Build (preview profile)

**On release tag:**

- EAS Build production profile
- App store submission via EAS Submit

---

## 13. Testing Strategy

| Layer       | Tool                   | What Gets Tested                                                                                       |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Unit        | Vitest 4.1.x           | Zod schemas, utils, Zustand store logic, tRPC procedures, tool implementations, knowledge base logic   |
| Integration | Vitest + MSW 2.12.x    | tRPC → Drizzle → test DB (Neon branch), WebSocket protocol, Inngest jobs, knowledge ingestion pipeline |
| Web E2E     | Playwright 1.59.x      | Dashboard auth, org management, session list, analytics, knowledge base verification workflow          |
| Mobile E2E  | Maestro 2.4.x          | Onboarding, org join, session start/stop, settings                                                     |
| WebSocket   | MSW v2 `ws.link()`     | Gemini protocol: setup → audio → toolCall → toolResponse → turnComplete → interruption → reconnection  |
| AI Tools    | Vitest + mocked Gemini | Each tool's `call()`, `validateInput()`, prompt generation                                             |
| Knowledge   | Vitest + test Qdrant   | Ingestion, compilation, retrieval, verification flow                                                   |

---

## 14. Future Considerations

Deliberately deferred from v1 but architecturally accounted for:

| Feature                                    | When                         | Why Deferred                                                        |
| ------------------------------------------ | ---------------------------- | ------------------------------------------------------------------- |
| **Human expert handoff**                   | Phase 1                      | Safety-critical, low implementation complexity                      |
| **Revenue opportunity identification**     | Phase 1 (in AI prompts)      | Business owner value prop, no extra infra                           |
| **Offline AI (Gemma 4 E2B via LiteRT)**    | Phase 2                      | LiteRT integration, on-device model validation needed               |
| **Public REST API**                        | Phase 2                      | `zod-to-openapi` prep in place; premature before PMF                |
| **Session recording & playback**           | Phase 2                      | Privacy consent framework needed; recommended for liability defense |
| **Dispatcher view**                        | Phase 2                      | Needs job/ticket model; not in MVP scope                            |
| **AR annotation layer**                    | Phase 2-3                    | YOLO + ARKit/ARCore on smartphone; no extra hardware                |
| **Structured compliance checklists**       | Phase 2                      | Digital sign-off, exportable PDF for regulatory audits              |
| **F-Gas certification tracking**           | Phase 2                      | Dashboard feature, 7-year refresher alerts (EU 2024/573)            |
| **Equipment recognition database**         | Phase 2                      | Curated per-org via dashboard; AI enriches from visual data         |
| **ServiceTitan/Housecall Pro integration** | Phase 3                      | Partnership discussions; webhook system must be proven first        |
| **Smart glasses support**                  | When Meta Orion ships        | Expo camera abstraction allows input source swap                    |
| **BIM/Digital Twin integration**           | Phase 3                      | Enterprise building data; context injection layer supports it       |
| **White-labeling**                         | Enterprise tier              | Org settings schema supports per-org branding                       |
| **DACH expansion**                         | After Vienna validation      | i18n + multilingual AI already in place                             |
| **SOC 2 Type II**                          | Before first enterprise deal | ~6 months lead time                                                 |
| **TimescaleDB**                            | session_events > 10M rows    | Postgres extension, no migration needed                             |
| **OpenTelemetry**                          | Phase 2 (with billing)       | `@vercel/otel`, distributed tracing for cost attribution            |

---

## 15. CLI Setup Commands

Complete monorepo bootstrapping, all versions pinned to April 2026 latest stable:

```bash
# 1. Monorepo initialization
mkdir aucta && cd aucta
git init
bun init -y

# 2. Turborepo
bun add turbo --dev

# 3. Workspace directories
mkdir -p apps/{mobile,dashboard}
mkdir -p packages/{ai,api,db,auth,shared,ui,email,i18n,config}
mkdir -p tooling/{scripts,docker}
mkdir -p docs

# 4. Dashboard (Next.js 16)
cd apps/web
bunx create-next-app@latest . --typescript --tailwind --app --src-dir=false --turbopack
cd ../..

# 5. Mobile (Expo SDK 55)
cd apps/mobile
bunx create-expo-app@latest . --template tabs
cd ../..

# 6. Root dev dependencies
bun add -d turbo typescript@6 @biomejs/biome vitest @playwright/test

# 7. Dashboard dependencies
bun add next@16 react@19 react-dom@19 --filter apps/web
bun add @trpc/server @trpc/client @trpc/next @tanstack/react-query zod drizzle-orm \
  @neondatabase/serverless better-auth @upstash/redis @upstash/ratelimit inngest \
  posthog-js @sentry/nextjs stripe --filter apps/web
bun add -d drizzle-kit --filter apps/web
bunx --cwd apps/web shadcn@latest init

# 8. Mobile dependencies
bun add expo-router expo-camera expo-av expo-keep-awake expo-secure-store \
  expo-localization react-i18next @react-native-community/netinfo react-native-mmkv \
  zustand @trpc/client @tanstack/react-query zod @google/genai \
  posthog-react-native @sentry/react-native react-native-purchases \
  --filter apps/mobile
bun add nativewind@5 tailwindcss@4 react-native-reanimated@4 --filter apps/mobile

# 9. AI package
bun add @google/genai zod --filter packages/ai

# 10. Knowledge base / vector DB
bun add @qdrant/js-client-rest --filter packages/ai

# 11. Database package
bun add drizzle-orm @neondatabase/serverless zod --filter packages/db
bun add -d drizzle-kit --filter packages/db

# 12. Auth package
bun add better-auth --filter packages/auth

# 13. Email package
bun add react-email @react-email/components resend --filter packages/email

# 14. API package
bun add @trpc/server zod inngest --filter packages/api

# 15. OpenAPI generation (Phase 2 prep)
bun add @asteasolutions/zod-to-openapi --filter packages/shared

# 16. Neon CLI setup
brew install neonctl
neonctl auth
neonctl projects create --name aucta --region-id aws-eu-central-1

# 17. Upstash Redis
brew tap upstash/tap && brew install upstash

# 18. Qdrant (local dev via Docker)
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant:v1.17.1

# 19. Inngest local dev
bunx inngest-cli dev

# 20. Database migrations
cd packages/db && bunx drizzle-kit generate && bunx drizzle-kit migrate
```

---

_This document is the engineering baseline for **Aucta**. For business strategy, regulatory compliance, investor material, and risk management, see [LEGAL-ADMIN.md](./LEGAL-ADMIN.md). For AI agent development guidelines, see [AGENTS.md](./AGENTS.md). For spec-driven development, see [SPEC-WORKFLOW.md](./SPEC-WORKFLOW.md)._
