# Phase 5: Knowledge Base - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a self-learning knowledge base that accumulates HVAC expertise from completed sessions, organizes it into structured wiki-like articles with 4-tier confidence levels, serves it back to technicians via hybrid search (dense + BM25) during live sessions with confidence-weighted attribution, and provides automated health monitoring. Org owners can manually add multimodal knowledge (text, images, PDFs). No dashboard UI — all management via API.

</domain>

<decisions>
## Implementation Decisions

### Article Lifecycle
- **D-01:** Auto-ingest all completed sessions. Every session triggers an Inngest job that extracts learnings and generates candidate knowledge articles. No manual trigger required.
- **D-02:** Always manual review for verification. Articles start as "unverified", require manager/expert to promote through confidence tiers. Verification queue surfaces pending articles. Safest for compliance.
- **D-03:** Auto-merge related sessions into wiki-like articles. When multiple sessions cover the same equipment/procedure, the compilation pipeline (LLM) merges findings into one authoritative article. Reduces duplication, creates comprehensive reference material.
- **D-04:** Manual knowledge input supports full multimodal: text, images, PDFs. Processed via Gemini for text extraction/description, then embedded. Audio/video support deferred.

### Search & Retrieval
- **D-05:** Hybrid search combining dense semantic vectors (Gemini embedding) + BM25 sparse vectors via Reciprocal Rank Fusion. Best accuracy for technical HVAC queries.
- **D-06:** Source confidence communicated via system prompt injection. The search tool returns confidence level metadata per result, and Gemini's system prompt instructs natural attribution phrasing: "Based on verified procedure..." vs "Based on a technician observation..."
- **D-07:** Top 3 results per searchKnowledgeBase query. Keeps context window lean for live sessions while providing sufficient coverage.

### Content Structure
- **D-08:** Equipment taxonomy: Brand > Model > Procedure type (e.g., Daikin > FTXM25 > Compressor Replacement). Matches how technicians think about equipment.
- **D-09:** Rich structured articles with: title, summary, markdown body, equipment metadata (brand, model, procedure type), confidence level, source session IDs, tags, version history, auto-generated backlinks to related articles.
- **D-10:** Automated health checks via background job. Detects: equipment models with sessions but no articles (coverage gaps), articles not updated in 90+ days (stale), conflicting articles for the same procedure (consistency).

### Embedding Strategy
- **D-11:** Use Gemini embedding model (gemini-embedding-exp-03-07 or latest preview) for native multimodal embedding. Supports text, images, PDFs directly — no ColPali Python sidecar needed. 3072 dimensions.
- **D-12:** Single Qdrant collection with named vectors: "dense" (Gemini embedding, 3072d) + "sparse" (BM25). Metadata filters on org_id, equipment_model, confidence_level, category.
- **D-13:** Full article embedding (no chunking). Gemini embedding model handles up to 2048 tokens per input. Most articles will fit. For multimodal content, embed the extracted text representation.
- **D-14:** Accept text, images, and PDFs at launch. Audio/video multimodal support deferred to future milestone.

### Claude's Discretion
- Inngest job configuration and retry strategies for ingestion, compilation, and health check pipelines
- Qdrant collection schema details (payload fields, index configuration)
- BM25 tokenization approach and sparse vector generation
- Article deduplication heuristics during compilation
- Verification queue data model and status transitions
- Health monitoring thresholds (stale = 90 days is a guideline, adjust based on domain)
- How to handle the Gemini embedding model being in preview (fallback strategy)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specification
- `TECH-SPEC.md` -- Full product spec: knowledge base architecture, Qdrant configuration, ColPali references (now replaced by Gemini embeddings), embedding pipeline
- `LEGAL-ADMIN.md` -- EU AI Act content labeling for KB articles, GDPR data handling for session-derived knowledge

### Architecture Rules
- `agents/rules/architecture-feature-boundaries.md` -- Knowledge base logic in packages/ai/src/knowledge/; no tRPC in packages/ai/
- `agents/rules/architecture-vertical-slices.md` -- Vertical slice: knowledge/core, knowledge/ingest, knowledge/compile, knowledge/retrieve, knowledge/verify, knowledge/health
- `agents/rules/data-repository-pattern.md` -- Repository for knowledge_articles, verification_queue tables
- `agents/rules/data-dto-boundaries.md` -- Zod DTOs for article data at every boundary
- `agents/rules/data-drizzle-migrations.md` -- Schema changes for new KB tables
- `agents/rules/patterns-dependency-injection.md` -- Constructor injection for KB services
- `agents/rules/quality-error-handling.md` -- ErrorWithCode in KB services
- `agents/rules/testing-coverage-requirements.md` -- 80%+ test coverage for KB logic

### Domain Knowledge
- `agents/knowledge-base.md` -- AI tool system architecture, searchKnowledgeBase tool spec

### Phase Dependencies
- `.planning/phases/02-ai-pipeline-and-tool-system/02-CONTEXT.md` -- Tool architecture: buildTool() factory, tool registry, tool dispatcher
- `.planning/phases/04-session-lifecycle/04-CONTEXT.md` -- Session data model, Inngest summary pipeline (ingestion pipeline extends this)
- `.planning/phases/04-session-lifecycle/04-01-SUMMARY.md` -- Session repository, DTOs, schema (ingestion reads from these)

### Embedding Model
- Gemini embedding model docs: https://ai.google.dev/gemini-api/docs/embeddings (verify latest model ID and capabilities at research time)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ai/src/tools/base.ts` -- buildTool() factory for searchKnowledgeBase tool
- `packages/ai/src/tools/registry.ts` -- assembleToolPool() to register searchKnowledgeBase
- `packages/ai/src/tools/dispatcher.ts` -- Tool dispatcher resolves toolCall events
- `packages/ai/src/tools/lookupErrorCode/` -- Reference implementation for a complete tool
- `packages/api/src/jobs/inngest-client.ts` -- Inngest client (id: "aucta") for KB background jobs
- `packages/api/src/jobs/session-summarize.ts` -- Reference for Inngest step function pattern (3-step pipeline)
- `packages/db/src/repositories/session.repository.ts` -- Repository pattern reference for KB repositories
- `packages/db/src/schema/ai-sessions.ts` -- Session schema (ingestion reads completed sessions)
- `packages/shared/src/schemas/` -- Zod DTO pattern for KB article schemas

### Established Patterns
- Inngest step functions with independent retries (session-summarize pattern)
- Repository with constructor-injected DrizzleClient returning Zod-validated DTOs
- buildTool() with call(), prompt(), validateInput(), Zod schemas
- @google/genai SDK for Gemini API calls (used in session-summarize for content generation)
- tRPC orgProcedure for org-scoped endpoints

### Integration Points
- searchKnowledgeBase tool registered in tool registry, dispatched during live sessions
- Ingestion pipeline triggered by "session/ended" Inngest event (same as summary pipeline)
- Manual KB input via new tRPC endpoints on a knowledge router
- Qdrant client connects to EU-hosted Qdrant Cloud instance
- Knowledge context injected into system prompt via prompt layer system (Phase 2)
- Health monitoring results available via tRPC query endpoints

</code_context>

<specifics>
## Specific Ideas

- Gemini embedding model (gemini-embedding-exp-03-07 or latest) replaces ColPali entirely. No Python sidecar needed. Verify model ID and capabilities during research phase.
- 3072-dimension dense vectors from Gemini embedding model.
- The compilation pipeline is the differentiator — turning raw session observations into structured wiki articles is what makes the KB compound over time.
- Source attribution during live sessions must feel natural, not robotic. System prompt injection lets Gemini phrase it naturally.
- Health monitoring is proactive — the system tells you what's missing, not just what's there.

</specifics>

<deferred>
## Deferred Ideas

- **Audio/video multimodal knowledge input** — Gemini embeddings may support this later, but text + images + PDF sufficient for launch.
- **Dashboard UI for KB management** — Article browser, verification queue UI, manual upload form. All deferred to dashboard milestone (DASH-05).
- **Cross-organization anonymized learning** — ADV-09 in requirements. Future milestone.
- **ColPali for technical manual processing** — Replaced by Gemini embedding model. If Gemini embeddings prove insufficient for diagram-heavy manuals, reconsider.
- **Real-time KB update notifications** — tRPC SSE for "new article available" during live session. Overkill for v1.
- **Per-customer model selection for embeddings** — Future tier feature.

</deferred>

---

*Phase: 05-knowledge-base*
*Context gathered: 2026-04-05*
