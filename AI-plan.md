PRD v2 Comprehensive Upgrade Plan

Two output documents, each with a clear audience and purpose.

Document 1: Technical Specification (TECH-SPEC.md)

Audience: 20+ person dev team, department leads, engineering managers
Purpose: The engineering baseline. Every architectural decision, version pin, directory path, and CLI command needed to build this product.

1. AI Pipeline Architecture (Modeled After Claude Code)

The most critical section. The AI pipeline follows architectural patterns extracted from Claude Code's enterprise-grade agent system — specifically its Tool system, QueryEngåine orchestration, Memory/Knowledge system, and multi-agent coordination.

1a. Tool System (packages/ai/tools/)

Directly modeled on Claude Code's Tool.ts + buildTool() pattern. Each tool is a self-contained module with:

packages/ai/tools/
├── base.ts # buildTool() factory, ToolDef type, Zod schemas
├── lookupErrorCode/
│ ├── index.ts # call(), validateInput(), isReadOnly()
│ ├── prompt.ts # Tool description for Gemini function declaration
│ ├── types.ts # Zod input/output schemas
│ └── lookupErrorCode.test.ts
├── getEquipmentSpecs/
│ ├── index.ts
│ ├── prompt.ts
│ └── types.ts
├── getWiringDiagram/
├── calculateRefrigerantCharge/
├── checkSafetyRecall/
├── getOrgProcedure/
├── logFinding/
├── identifyPart/
├── searchKnowledgeBase/ # RAG retrieval tool
│ ├── index.ts # Hybrid search: BM25 + vector
│ ├── prompt.ts
│ ├── reranker.ts # Cross-encoder reranking
│ └── types.ts
├── escalateToExpert/ # Human handoff tool
│ ├── index.ts
│ ├── prompt.ts
│ └── types.ts
└── registry.ts # assembleToolPool() — registers all tools

Key design from Claude Code:

buildTool() factory enforces consistent structure: every tool has call(), prompt(), validateInput(), isReadOnly(), input/output Zod schemas

Tools are registered in a pool via registry.ts (like Claude Code's assembleToolPool)

Each tool's prompt.ts contains the Gemini function declaration (name, description, parameters) — this is what Gemini sees

Tools are composable: the session orchestrator can run tools serially or concurrently (matching Claude Code's toolOrchestration.ts with runToolsSerially() / runToolsConcurrently())

Gemini function calling integration:

Tools are declared in the WebSocket setup message as tools[].functionDeclarations

When Gemini returns a toolCall event, the orchestrator resolves it to the matching tool, calls call(), and returns the result via toolResponse

Gemini 2.5 Flash Live supports async function calling — tool calls execute while audio continues streaming (critical for non-blocking UX)

1b. Session Orchestration Engine (packages/ai/session/)

Modeled on Claude Code's QueryEngine.ts — the central coordinator for LLM interactions.

packages/ai/session/
├── orchestrator.ts # SessionOrchestrator class — manages the full session lifecycle
├── connection.ts # WebSocket connection to Gemini Live API
├── tokenBudget.ts # Token tracking, cost estimation
├── systemPrompt.ts # Layered system prompt assembly
├── toolDispatcher.ts # Routes Gemini tool calls to the tool registry
├── audioProcessor.ts # PCM encoding/decoding, sample rate conversion
├── videoProcessor.ts # JPEG frame capture, base64 encoding, resize
├── reconnection.ts # Exponential backoff, sessionResumption
├── eventLogger.ts # Batched event logging to tRPC (every 5s)
└── types.ts # Session state machine types

SessionOrchestrator lifecycle (maps to Claude Code's QueryEngine loop):

1. createSession() → Auth check → create DB row → fetch ephemeral token
2. connect() → Open WSS to Gemini → send setup message (model, voice, system prompt, tools)
3. streamLoop() → Continuous loop:
   ├── Send: camera JPEG (1 FPS) + mic PCM (16kHz/16-bit/mono)
   ├── Receive: audio PCM (24kHz) + text transcription
   ├── Handle: toolCall events → toolDispatcher.dispatch() → toolResponse
   ├── Handle: turnComplete events → log session event
   └── Handle: interruption events → cancel current audio playback
4. disconnect() → Close WebSocket → update DB row → trigger summary generation

System prompt assembly (directly from Claude Code's layered pattern):

const systemPrompt = buildEffectiveSystemPrompt([
coreRolePrompt, // "You are an expert HVAC technician copilot..."
hvacExpertisePrompt, // Domain knowledge, procedures, troubleshooting frameworks
safetyRulesPrompt, // Always-on safety warnings, F-Gas EU 2024/573
orgOverlayPrompt, // Per-org custom instructions from dashboard
knowledgeBasePrompt, // Retrieved context from org knowledge base
sessionHistoryPrompt, // "This technician has handled 47 Daikin VRV installs"
jobContextPrompt, // FSM job context (Phase 2)
aiActTransparencyPrompt, // "You are an AI system, not a human expert"
]);

1c. Self-Learning Knowledge Base System (packages/ai/knowledge/)

Inspired by Karpathy's "LLM Knowledge Bases" pattern and Claude Code's memory system (memdir/, extractMemories/, SessionMemory/). The system continuously learns from sessions and builds a verifiable, org-specific + global knowledge base.

packages/ai/knowledge/
├── core/
│ ├── knowledgeBase.ts # KnowledgeBase class — CRUD on wiki articles
│ ├── article.ts # Article type: markdown + frontmatter metadata
│ ├── index.ts # Auto-maintained index files (summaries, categories)
│ └── types.ts
├── ingest/
│ ├── sessionIngester.ts # Post-session: extract learnings from session data
│ ├── manualIngester.ts # PDF/text manual upload processing
│ ├── feedbackIngester.ts # Technician corrections/additions to AI guidance
│ └── webIngester.ts # Manufacturer data, recall notices (scheduled)
├── compile/
│ ├── wikiCompiler.ts # LLM "compiles" raw data into structured wiki articles
│ ├── articleGenerator.ts # Generate/update articles from new data
│ ├── linker.ts # Backlinks, cross-references between articles
│ ├── categorizer.ts # Organize into concepts: equipment, procedures, safety
│ └── deduplicator.ts # Merge duplicate knowledge entries
├── retrieve/
│ ├── search.ts # Hybrid search: BM25 + vector + metadata filters
│ ├── embeddings.ts # Generate embeddings for articles
│ ├── reranker.ts # Cross-encoder reranking for precision
│ └── contextBuilder.ts # Build prompt context from retrieved articles
├── verify/
│ ├── verificationQueue.ts # Queue of AI-generated knowledge awaiting verification
│ ├── expertReview.ts # Senior technician review/approval workflow
│ ├── consistencyChecker.ts # LLM "lint" — find inconsistencies across articles
│ ├── factChecker.ts # Cross-reference against manufacturer data
│ └── confidenceScorer.ts # Score confidence: unverified → technician-verified → expert-verified
├── storage/
│ ├── vectorStore.ts # Qdrant client (EU region)
│ ├── articleStore.ts # Postgres: article metadata, versions, verification status
│ └── fileStore.ts # Vercel Blob: PDF originals, images
└── health/
├── healthCheck.ts # LLM audit: inconsistencies, gaps, stale data
├── coverageAnalyzer.ts # Which equipment models lack documentation?
└── suggestions.ts # LLM suggests new articles, connections, questions to investigate

The Knowledge Flywheel (Karpathy pattern adapted for HVAC):

Phase 1: INGEST
├── Session data: equipment identified, procedures discussed, errors encountered
├── Technician feedback: "AI was wrong about X, the correct approach is Y"
├── Manual uploads: PDF manuals → ColPali multimodal embeddings
└── External sources: manufacturer recall notices, regulatory updates

Phase 2: COMPILE (LLM-driven, humans verify)
├── Raw session learnings → LLM generates/updates wiki articles
├── Articles organized by: equipment brand → model → procedure type
├── Auto-generated backlinks and cross-references
├── Index files maintained by LLM (brief summaries, categories)
└── Conflict resolution: when new data contradicts existing articles

Phase 3: VERIFY (critical differentiator)
├── Confidence levels: unverified → technician-reviewed → expert-approved
├── Verification queue in dashboard: managers/senior techs review AI-generated knowledge
├── Digital signatures on verified articles (audit trail)
├── Automatic flagging of articles that contradict verified knowledge
└── Stale detection: articles not referenced in N months marked for review

Phase 4: RETRIEVE (during live sessions)
├── Gemini calls searchKnowledgeBase() tool mid-conversation
├── Hybrid search: keyword (BM25) + semantic (vector) + metadata (equipment model)
├── Cross-encoder reranking on top-K results
├── Retrieved articles injected into Gemini context as tool response
└── "Source" attribution: "Based on verified procedure for Daikin VRV IV..."

Phase 5: HEALTH (continuous improvement)
├── LLM audits wiki for inconsistencies, imputes missing data
├── Identifies coverage gaps: "No articles for Mitsubishi PUMY series"
├── Suggests new article candidates from cross-referencing session patterns
├── Tracks article utility: which articles are retrieved most, which lead to positive feedback
└── Output: health report visible in dashboard analytics

Key architectural decision from Claude Code's extractMemories:

Memory extraction runs asynchronously after each session (not during), using a separate LLM call

Extractions are filed into the knowledge base with metadata (source session, confidence, equipment context)

The knowledge base prompt is loaded into system context via loadKnowledgeBasePrompt() — the LLM reads relevant index files and retrieved content without requiring full RAG at query time for small-scale orgs

As the knowledge base grows beyond ~500 articles / ~400K words, full RAG (vector search) takes over from index-file browsing

Verification system (the "verifiable" requirement):

Confidence Level

Source

Badge in Dashboard

Can AI Reference?

unverified

AI-extracted from session

Yellow

Yes, with caveat: "Based on unverified observation..."

technician_reviewed

Experienced tech confirmed

Blue

Yes: "Based on technician-confirmed procedure..."

expert_approved

Manager/senior tech signed off

Green

Yes: "Based on verified procedure..."

manufacturer_sourced

From uploaded manual/manufacturer API

Purple

Yes: "Per manufacturer documentation..."

1d. Multi-Agent Architecture (Phase 2)

Modeled on Claude Code's coordinator/ and AgentTool — specialized sub-agents for complex diagnostics:

DiagnosticAgent: Multi-step troubleshooting following plan-act-observe-reflect loop

SafetyAuditAgent: Reviews session for safety compliance, generates compliance report

SummaryAgent: Post-session, generates structured summary with findings, recommendations, revenue opportunities

KnowledgeAgent: Processes session data into knowledge base articles

2. Updated Tech Stack (All Latest Stable Versions)

Layer

Tool

Version

Change from PRD v2

Runtime

Bun

1.3.x

Updated

Build

Turborepo

2.9.x

Updated

Language

TypeScript

6.0.x

Updated (strict mode)

Mobile framework

Expo SDK

55

Updated from 53+

Mobile navigation

Expo Router

55.x

Updated

Mobile styling

NativeWind v5 + Tailwind CSS v4

NW 5.0.0-preview.3 + TW 4.2.x

Changed from v4+TW3

Mobile components

React Native Reusables

Latest

No change

Dashboard framework

Next.js 16

16.2.x

Upgraded from 15

Dashboard styling

Tailwind CSS v4

4.2.x

Updated

Dashboard components

shadcn/ui

CLI v4

Updated

Client state

Zustand

5.0.x

Updated

Server state

TanStack Query

5.96.x

Updated

Internal API

tRPC

11.16.x

Updated

Validation

Zod

4.3.x

Updated

ORM

Drizzle ORM

0.45.x

Updated

Database

Neon Postgres (EU Frankfurt)

Latest

No change

Cache

Upstash Redis (EU)

Latest

No change

Auth

Better Auth

1.5.x

Updated

AI model

Gemini 2.5 Flash Live

Latest

No change

AI (Gemini SDK)

@google/genai

1.48.x

New: replaces legacy SDK

Background jobs

Inngest

4.1.x

New addition

Vector DB

Qdrant

1.17.x

New addition (knowledge base)

Web payments

Stripe

21.x

Updated

Mobile payments

RevenueCat

9.15.x

Updated

Email

React Email + Resend

RE 5.2.x / Resend 6.10.x

Updated

Analytics

PostHog

Web 1.364.x / RN 4.39.x

Updated

Error tracking

Sentry

Next.js 10.47.x / RN 8.7.x

Updated

Linting

Biome

2.4.x

Updated

Unit tests

Vitest

4.1.x

Updated

Web E2E

Playwright

1.59.x

Updated

Mobile E2E

Maestro

2.4.x

Updated

API mocking

MSW

2.12.x

Updated

OpenAPI generation

zod-to-openapi

Latest

New addition

i18n

react-i18next + expo-localization

Latest

No change

NativeWind v5 compatibility requirements:

React Native: 0.83.x+ (Expo SDK 55 provides this)

Reanimated: v4+ (4.3.x)

New Architecture (Fabric): required — Expo SDK 55 enables by default

Tailwind CSS v4 shared config between mobile and dashboard

3. Updated Monorepo Structure

hvac-copilot/
├── apps/
│ ├── mobile/ # Expo SDK 55 (technician-facing)
│ │ ├── app/ # Expo Router file-based routes
│ │ │ ├── (auth)/
│ │ │ ├── (app)/
│ │ │ │ ├── session/
│ │ │ │ ├── history/
│ │ │ │ └── settings/
│ │ │ └── \_layout.tsx
│ │ ├── components/
│ │ │ ├── session/ # Camera, audio, status (co-located)
│ │ │ ├── auth/
│ │ │ └── common/
│ │ ├── hooks/ # useGeminiSession, useAudioRecorder, etc.
│ │ ├── stores/ # Zustand: session.store.ts, app.store.ts
│ │ ├── lib/
│ │ │ ├── auth-client.ts
│ │ │ ├── api.ts # tRPC client
│ │ │ └── gemini/ # Connection, protocol, audio, constants
│ │ └── package.json
│ │
│ └── dashboard/ # Next.js 16 (owner/manager-facing)
│ ├── app/
│ │ ├── (auth)/
│ │ ├── (dashboard)/
│ │ │ ├── overview/
│ │ │ ├── sessions/
│ │ │ ├── team/
│ │ │ ├── analytics/
│ │ │ ├── knowledge/ # Knowledge base management
│ │ │ └── settings/
│ │ └── api/
│ │ ├── trpc/[trpc]/ # tRPC handler
│ │ ├── auth/[...all]/ # Better Auth handler
│ │ ├── inngest/ # Inngest handler
│ │ └── token/ # Ephemeral token issuer
│ ├── components/
│ └── package.json
│
├── packages/
│ ├── ai/ # ★ AI Pipeline (most critical package)
│ │ └── src/
│ │ ├── tools/ # Tool system (buildTool pattern)
│ │ │ ├── base.ts # Tool factory, types, schemas
│ │ │ ├── registry.ts # assembleToolPool()
│ │ │ ├── lookupErrorCode/
│ │ │ ├── getEquipmentSpecs/
│ │ │ ├── getWiringDiagram/
│ │ │ ├── calculateRefrigerantCharge/
│ │ │ ├── checkSafetyRecall/
│ │ │ ├── getOrgProcedure/
│ │ │ ├── logFinding/
│ │ │ ├── identifyPart/
│ │ │ ├── searchKnowledgeBase/
│ │ │ └── escalateToExpert/
│ │ ├── session/ # Session orchestration engine
│ │ │ ├── orchestrator.ts
│ │ │ ├── connection.ts
│ │ │ ├── systemPrompt.ts
│ │ │ ├── toolDispatcher.ts
│ │ │ ├── audioProcessor.ts
│ │ │ ├── videoProcessor.ts
│ │ │ ├── reconnection.ts
│ │ │ ├── eventLogger.ts
│ │ │ └── types.ts
│ │ ├── knowledge/ # Self-learning knowledge base
│ │ │ ├── core/ # Article CRUD, indexing, types
│ │ │ ├── ingest/ # Session, manual, feedback, web ingestion
│ │ │ ├── compile/ # LLM wiki compilation, linking, categorization
│ │ │ ├── retrieve/ # Search, embeddings, reranking, context building
│ │ │ ├── verify/ # Verification queue, expert review, consistency
│ │ │ ├── storage/ # Qdrant, Postgres, Vercel Blob adapters
│ │ │ └── health/ # LLM audit, coverage analysis, suggestions
│ │ ├── prompts/ # System prompt fragments
│ │ │ ├── core.ts
│ │ │ ├── hvacExpertise.ts
│ │ │ ├── safety.ts
│ │ │ ├── aiActTransparency.ts
│ │ │ └── builder.ts # buildEffectiveSystemPrompt()
│ │ └── agents/ # Specialized sub-agents (Phase 2)
│ │ ├── diagnosticAgent.ts
│ │ ├── safetyAuditAgent.ts
│ │ ├── summaryAgent.ts
│ │ └── knowledgeAgent.ts
│ │
│ ├── api/ # tRPC router definitions
│ │ └── src/
│ │ ├── root.ts
│ │ ├── trpc.ts # Init, context, middleware, rate limiting
│ │ ├── routers/ # auth, org, session, technician, analytics, billing, knowledge
│ │ └── jobs/ # Inngest job definitions
│ │ ├── sessionSummarize.ts
│ │ ├── knowledgeIngest.ts
│ │ ├── analyticsAggregate.ts
│ │ ├── billingMeter.ts
│ │ ├── gdprExport.ts
│ │ ├── gdprDelete.ts
│ │ └── inviteExpire.ts
│ │
│ ├── db/ # Drizzle ORM schema + client
│ │ └── src/
│ │ ├── client.ts
│ │ ├── schema/ # users, orgs, members, sessions, events, invites,
│ │ │ # profiles, audit-log, org-settings,
│ │ │ # knowledge-articles, knowledge-verifications
│ │ ├── relations.ts
│ │ └── types.ts
│ │
│ ├── auth/ # Better Auth shared config
│ ├── shared/ # Cross-app schemas, types, constants, utils
│ ├── ui/ # Web-only shadcn/ui components
│ ├── email/ # React Email templates + Resend
│ ├── i18n/ # Shared translations (en, de, tr, sr, hr, pl, ro)
│ └── config/ # Shared Tailwind v4 preset, tsconfig, biome config
│
├── tooling/
│ ├── scripts/ # setup.sh, db-reset.sh, generate-types.ts
│ └── docker/ # Local Postgres + Redis + Qdrant for offline dev
│
├── docs/
│ ├── TECH-SPEC.md # This document
│ ├── LEGAL-ADMIN.md # Legal/administrative companion
│ ├── ARCHITECTURE.md
│ ├── API.md
│ └── DEPLOYMENT.md
│
├── CLAUDE.md
├── turbo.json
├── package.json
└── bun.lock

4. Database Schema Additions

New tables for the knowledge base system:

-- Knowledge articles (the wiki)
knowledge_articles:
id, org_id (nullable — null = global), slug, title, category,
content_md, summary, equipment_brand, equipment_model,
confidence_level (unverified/technician_reviewed/expert_approved/manufacturer_sourced),
source_type (session/manual/feedback/web/llm_generated),
source_session_id, version, previous_version_id,
embedding_id (Qdrant point ID), word_count,
retrieval_count, last_retrieved_at,
created_by, verified_by, verified_at,
created_at, updated_at

-- Verification queue entries
knowledge_verifications:
id, article_id, org_id, reviewer_id,
status (pending/approved/rejected/needs_revision),
reviewer_notes, reviewed_at, created_at

-- Article backlinks (auto-maintained by LLM compiler)
knowledge_links:
id, source_article_id, target_article_id, link_type (reference/prerequisite/related),
created_at

5. CLI Setup Commands (Complete)

# 1. Monorepo initialization

mkdir hvac-copilot && cd hvac-copilot
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

cd apps/dashboard
bunx create-next-app@latest . --typescript --tailwind --app --src-dir=false --turbopack
cd ../..

# 5. Mobile (Expo SDK 55)

cd apps/mobile
bunx create-expo-app@latest . --template tabs
cd ../..

# 6. Root dev dependencies

bun add -d turbo typescript@6 @biomejs/biome vitest @playwright/test

# 7. Dashboard dependencies

bun add next@16 react@19 react-dom@19 --filter apps/dashboard
bun add @trpc/server @trpc/client @trpc/next @tanstack/react-query zod drizzle-orm @neondatabase/serverless better-auth @upstash/redis @upstash/ratelimit inngest posthog-js @sentry/nextjs stripe --filter apps/dashboard
bun add -d drizzle-kit --filter apps/dashboard
bunx --cwd apps/dashboard shadcn@latest init

# 8. Mobile dependencies

bun add expo-router expo-camera expo-av expo-keep-awake expo-secure-store expo-localization react-i18next @react-native-community/netinfo react-native-mmkv zustand @trpc/client @tanstack/react-query zod @google/genai posthog-react-native @sentry/react-native react-native-purchases --filter apps/mobile
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
neonctl projects create --name hvac-copilot --region-id aws-eu-central-1

# 17. Upstash Redis

brew tap upstash/tap && brew install upstash

# 18. Qdrant (local dev via Docker)

docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant:v1.17.1

# 19. Inngest local dev

bunx inngest-cli dev

# 20. Database migrations

cd packages/db && bunx drizzle-kit generate && bunx drizzle-kit migrate

6. Key Architecture Decisions (Validated)

Keep as-is (confirmed correct):

Bun — stable enough with Metro; pin version, pnpm fallback ready

Better Auth — correct over Clerk for GDPR/data ownership/org plugin

Raw WebSocket to Gemini — AI SDK doesn't cover Live API streaming

Drizzle ORM — 7.4KB vs Prisma 1.6MB; critical for serverless cold starts

Neon + separate auth — better than Supabase for data ownership

Biome — production-ready sole linter/formatter

PostHog feature flags — sufficient for B2B scale

New additions (from gap analysis):

Inngest for background jobs — session summaries, GDPR, billing metering

tRPC subscriptions (SSE) for real-time dashboard live session monitoring

Qdrant (EU-hosted) for knowledge base vector search

@asteasolutions/zod-to-openapi for Phase 2 public API prep

Gemini function calling / tool system — the core AI differentiator

Neon database branching for PR preview environments

7. Gemini Live API Connection Flow (Detailed)

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Mobile App │ │ Dashboard API │ │ Gemini Live │
│ (Expo) │ │ (Next.js 16) │ │ (Google) │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
│ │ │
│ 1. POST session.create │ │
│ ─────────────────────────>│ │
│ │ 2. Auth check + org verify│
│ │ 3. Create ai_sessions row │
│ │ 4. Build system prompt │
│ │ (layered assembly) │
│ │ 5. Register tools │
│ │ (function declarations)│
│ │ │
│ │ 6. POST ephemeral token │
│ │ ─────────────────────────>│
│ │ <─────────────────────────│
│ │ 7. Token + session config │
│ │ │
│ <─────────────────────────│ │
│ 8. { token, sessionId, │ │
│ tools, config } │ │
│ │ │
│ 9. WSS connect with token │ │
│ ──────────────────────────────────────────────────────>│
│ 10. setup { model, voice, │ │
│ systemInstruction, │ │
│ tools: [{ │ │
│ functionDeclarations│ │
│ }] } │ │
│ │ │
│ 11. Stream: JPEG + PCM │ │
│ ──────────────────────────────────────────────────────>│
│ │ │
│ <──────────────────────────────────────────────────────│
│ 12. Stream: PCM audio │ │
│ + text + toolCalls │ │
│ │ │
│ 13. toolCall received: │ │
│ "searchKnowledgeBase" │ │
│ ───────────────────────> tRPC call to API ───────────>│
│ <─────── tool result ────────────────────────────────<│
│ │ │
│ 14. toolResponse sent │ │
│ ──────────────────────────────────────────────────────>│
│ │ │
│ 15. Batched event logs │ │
│ (every 5 seconds) │ │
│ ─────────────────────────>│ 16. Insert session_events │

8. Background Job Definitions (Inngest)

// packages/api/src/jobs/sessionSummarize.ts
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

// packages/api/src/jobs/knowledgeIngest.ts
inngest.createFunction(
{ id: "knowledge-ingest", name: "Ingest Knowledge from Session" },
{ event: "knowledge/session-completed" },
async ({ event, step }) => {
const learnings = await step.run("extract", () =>
extractLearnings(event.data),
);
for (const learning of learnings) {
await step.run(`compile-${learning.id}`, () => compileArticle(learning));
}
await step.run("update-index", () => rebuildIndex(event.data.orgId));
await step.run("check-health", () => runHealthCheck(event.data.orgId));
},
);

9. NativeWind v5 + Tailwind v4 Shared Configuration

packages/config/
├── tailwind.config.ts # Shared Tailwind v4 config
├── tailwind-mobile.config.ts # NativeWind v5 specific overrides
└── design-tokens.ts # Shared design tokens (colors, spacing, typography)

Both apps/dashboard and apps/mobile import from packages/config. NativeWind v5 uses Tailwind v4's CSS-first config, enabling true design token sharing between web and mobile for the first time.

10. Testing Strategy (Updated Tools)

Layer

Tool

Version

What Gets Tested

Unit

Vitest 4.1.x

Latest

Zod schemas, utils, Zustand stores, tRPC procedures, tool implementations, knowledge base logic

Integration

Vitest + MSW 2.12.x

Latest

tRPC -> Drizzle -> test DB, WebSocket protocol, Inngest jobs, knowledge ingestion pipeline

Web E2E

Playwright 1.59.x

Latest

Dashboard auth, org management, session list, analytics, knowledge base verification

Mobile E2E

Maestro 2.4.x

Latest

Onboarding, org join, session start/stop, settings

WebSocket

MSW ws.link()

Latest

Gemini protocol: setup -> audio -> toolCall -> toolResponse -> turnComplete -> interruption -> reconnection

AI Tools

Vitest + mocked Gemini

Latest

Each tool's call(), validateInput(), prompt generation

Knowledge

Vitest + test Qdrant

Latest

Ingestion, compilation, retrieval, verification flow

Document 2: Legal/Administrative Supplement (LEGAL-ADMIN.md)

Audience: Founding team, legal counsel, investors, business development
Purpose: Regulatory compliance, investor pitch optimization, business strategy, risk management

Sections to include:

1. Regulatory Corrections

F-Gas Regulation: Update reference from EU 517/2014 to EU 2024/573 (entered force March 2024). Document new phase-down targets, leak-check thresholds, 7-year certification refresher.

Product Liability Directive 2024/2853: Software and AI are now "products" subject to strict liability (transposition by Dec 9, 2026). Must address: opt-in session logging for liability defense, disclaimers, ToS liability caps.

EU Data Act: Regulatory tailwind — forces HVAC manufacturers to open equipment data to third-party service providers. Frame in investor pitch.

NIS2 (NISG 2026): Not directly applicable at current scale, but enterprise customers may need Aucta's security docs for supply chain assessments.

2. AI Act Compliance Checklist (August 2, 2026 deadline)

Non-dismissible AI indicator at session start

AI-generated labels on session summaries

No emotion recognition in any metric

Formal risk classification rationale document

Penalties: up to EUR 35M or 7% global annual turnover

3. GDPR Enforcement Preparation

Prepare Verzeichnis der Verarbeitungstaetigkeiten (Art. 30)

Document Interessenabwaegung for legitimate interest basis (Art. 6(1)(f))

DSB 2026 Schwerpunktpruefung focuses: Art. 32 (security), Art. 30 (records), Art. 12-14 (transparency)

4. TAM/SAM/SOM

TAM: AI for physical trades in Europe ~EUR 700M+

SAM: 54,413 HVAC companies in DACH, ~EUR 95M ARR potential

SOM: Vienna/Austria focus, 5%-15% penetration = EUR 660K-2M ARR in 3 years

5. Investor Target List

#1: Speedinvest (Vienna, Physical AI thesis, EUR 250K-30M, leads 85% of initial rounds)

Pitch framing: "Physical AI" (Speedinvest's 2026 thesis), regulatory moat, EU Data Act tailwind, capital efficiency (EUR 55-110/month infrastructure)

6. Moat Narrative

Lead with workflow moat + regulatory moat (Tier 1-2, hardest to replicate)

Do NOT oversell data moat (Tier 3, fragile)

Benchmark against Augmentir: 82% onboarding reduction, 37% productivity improvement

7. Comparable Deals

WorkHero: $5M Seed (AI HVAC back-office)

Netic AI: $23M Series B (AI trades, Founders Fund)

BrightAI: $66M total (Physical AI platform)

Over $300M in contractor-focused AI deals in Q1 2026

8. Risk Register

Gemini dependency, GDPR enforcement, product liability, technician adoption resistance, competitor entry, poor connectivity

Each with likelihood, impact, and specific mitigation strategy

9. Open Questions Resolved

Session recording: Implement opt-in with per-session GDPR consent (liability defense)

AI model fallback: Abstract behind LiveSessionProvider interface; Gemma 4 E2B for connectivity loss; defer cloud fallback to post-PMF

Equipment manuals: Phase 1 = text paste in system prompt; Phase 1.5 = ColPali RAG pipeline; Phase 2 = manufacturer API integration
