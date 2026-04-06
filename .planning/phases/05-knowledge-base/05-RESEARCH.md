# Phase 5: Knowledge Base - Research

**Researched:** 2026-04-05
**Domain:** Knowledge base with vector search, embedding pipeline, LLM compilation, and hybrid retrieval
**Confidence:** HIGH

## Summary

Phase 5 builds the self-learning knowledge base -- the system's compounding intelligence layer. It spans five subsystems: (1) Postgres schema for articles, verifications, and links with Drizzle ORM; (2) Qdrant vector DB with hybrid dense+sparse search via Reciprocal Rank Fusion; (3) ingestion pipeline extracting learnings from completed sessions via Inngest; (4) LLM-powered compilation of raw session data into structured wiki articles; and (5) the searchKnowledgeBase tool that serves knowledge back during live sessions with confidence-weighted source attribution.

The architecture follows established project patterns: vertical slices in `packages/ai/src/knowledge/`, repositories in `packages/db/`, Zod DTOs in `packages/shared/`, Inngest jobs in `packages/api/src/jobs/`, and a new tRPC knowledge router in `packages/api/src/routers/`. The key external dependency is `@qdrant/js-client-rest` (1.17.0) for vector operations, with Qdrant's built-in `qdrant/bm25` server-side inference eliminating the need for client-side BM25 tokenization. Gemini embedding model `gemini-embedding-001` handles dense vector generation with taskType support for retrieval optimization.

**Primary recommendation:** Use Qdrant's built-in `qdrant/bm25` model for server-side sparse vector inference (zero client-side BM25 code), `gemini-embedding-001` for dense text embeddings with `RETRIEVAL_DOCUMENT`/`RETRIEVAL_QUERY` task types, and the established Inngest step function pattern for all background pipelines.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Auto-ingest all completed sessions. Every session triggers an Inngest job that extracts learnings and generates candidate knowledge articles. No manual trigger required.
- **D-02:** Always manual review for verification. Articles start as "unverified", require manager/expert to promote through confidence tiers. Verification queue surfaces pending articles. Safest for compliance.
- **D-03:** Auto-merge related sessions into wiki-like articles. When multiple sessions cover the same equipment/procedure, the compilation pipeline (LLM) merges findings into one authoritative article. Reduces duplication, creates comprehensive reference material.
- **D-04:** Manual knowledge input supports full multimodal: text, images, PDFs. Processed via Gemini for text extraction/description, then embedded. Audio/video support deferred.
- **D-05:** Hybrid search combining dense semantic vectors (Gemini embedding) + BM25 sparse vectors via Reciprocal Rank Fusion. Best accuracy for technical HVAC queries.
- **D-06:** Source confidence communicated via system prompt injection. The search tool returns confidence level metadata per result, and Gemini's system prompt instructs natural attribution phrasing: "Based on verified procedure..." vs "Based on a technician observation..."
- **D-07:** Top 3 results per searchKnowledgeBase query. Keeps context window lean for live sessions while providing sufficient coverage.
- **D-08:** Equipment taxonomy: Brand > Model > Procedure type (e.g., Daikin > FTXM25 > Compressor Replacement). Matches how technicians think about equipment.
- **D-09:** Rich structured articles with: title, summary, markdown body, equipment metadata (brand, model, procedure type), confidence level, source session IDs, tags, version history, auto-generated backlinks to related articles.
- **D-10:** Automated health checks via background job. Detects: equipment models with sessions but no articles (coverage gaps), articles not updated in 90+ days (stale), conflicting articles for the same procedure (consistency).
- **D-11:** Use Gemini embedding model (gemini-embedding-exp-03-07 or latest preview) for native multimodal embedding. Supports text, images, PDFs directly -- no ColPali Python sidecar needed. 3072 dimensions.
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

### Deferred Ideas (OUT OF SCOPE)
- Audio/video multimodal knowledge input
- Dashboard UI for KB management (DASH-05)
- Cross-organization anonymized learning (ADV-09)
- ColPali for technical manual processing
- Real-time KB update notifications
- Per-customer model selection for embeddings
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KB-01 | Knowledge article schema with 4-tier confidence levels | Drizzle schema pattern from Phase 4 + TECH-SPEC data model section 4.3 |
| KB-02 | Hybrid search via Qdrant: BM25 sparse + dense semantic + metadata filters + RRF | Qdrant 1.17.0 prefetch + fusion API, built-in qdrant/bm25, named vectors |
| KB-03 | Retrieval weights confidence level: verified articles rank above unverified | Qdrant payload filtering + weighted RRF (v1.17.0) |
| KB-04 | Session ingestion pipeline: extract learnings via Inngest job | Inngest step function pattern from session-summarize.ts |
| KB-05 | Article compilation: LLM generates structured wiki articles | Gemini content generation via @google/genai (already in packages/api) |
| KB-06 | Article categorization by equipment brand/model/procedure with backlinks | Postgres schema + knowledge_links table |
| KB-07 | Verification queue with status transitions | verification table schema, tRPC endpoints with role-based access |
| KB-08 | Health monitoring: coverage gaps, stale articles, consistency | Inngest cron job, SQL aggregation queries |
| KB-09 | Source attribution in AI responses with confidence levels | searchKnowledgeBase tool output includes confidence metadata, prompt layer integration |
| KB-10 | Manual text knowledge input via API | tRPC knowledge router endpoints with orgProcedure middleware |
| TOOL-05 | searchKnowledgeBase tool with hybrid search | buildTool() factory pattern + Qdrant query with prefetch + RRF |
| INFRA-07 | Qdrant vector DB (EU) configured for hybrid search | @qdrant/js-client-rest 1.17.0, collection creation with named dense + sparse vectors |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Import direction:** packages/shared <- packages/db <- packages/ai <- packages/api (one-way only)
- **packages/ai/ restriction:** Must NOT import from @trpc/server. Use ErrorWithCode for all error handling.
- **Data residency:** All data in EU (Neon Frankfurt, Upstash EU, Qdrant EU)
- **Testing:** 80%+ coverage for new code, co-located tests
- **Comments:** Only comment why, never what
- **Drizzle ORM:** Pinned to ^0.45.0, avoid v1.0.0-beta
- **AI model:** @google/genai (not legacy @google/generative-ai)
- **Compliance:** AI-generated content labels on KB articles (COMP-07), no emotion recognition

## Standard Stack

### Core (New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @qdrant/js-client-rest | 1.17.0 | Qdrant vector DB client | Official JS client, matches Qdrant server 1.17.x, full TypeScript support, supports named vectors, sparse vectors, hybrid queries with RRF |
| @google/genai | 1.48.0 | Gemini embedding generation | Already in packages/api; needs adding to packages/ai for embedding in knowledge pipeline. Unified SDK with embedContent() method |

### Already Installed (Used by This Phase)
| Library | Version | Purpose | Where |
|---------|---------|---------|-------|
| drizzle-orm | ^0.45.0 | ORM for KB tables | packages/db |
| zod | ^4.3.0 | DTO validation | packages/shared, packages/ai |
| inngest | ^4.1.2 | Background jobs for ingestion/compilation/health | packages/api |
| @trpc/server | ^11.16.0 | Knowledge router endpoints | packages/api |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Qdrant built-in BM25 | Client-side BM25 (wink-bm25-text-search, etc.) | Built-in eliminates tokenization code, IDF calculation, sparse vector generation. Client-side gives more control over tokenization but adds complexity. Qdrant built-in is the right call. |
| gemini-embedding-001 | gemini-embedding-2-preview | 2-preview supports multimodal (images, PDFs) with 8192 token limit but costs $0.20/1M vs $0.15/1M. For text articles (majority), embedding-001 with taskType is sufficient and cheaper. Use 2-preview only when embedding multimodal content (manual uploads with images/PDFs). |
| Single embedding model | Dual model strategy | Using both models would require separate Qdrant collections (incompatible embedding spaces). Stick with one model for simplicity. |

**Installation (packages/ai):**
```bash
cd packages/ai && bun add @qdrant/js-client-rest@^1.17.0 @google/genai@^1.48.0
```

**Version verification:**
- @qdrant/js-client-rest: 1.17.0 (verified via npm registry)
- @google/genai: 1.48.0 (verified via npm registry, already installed in packages/api)
- inngest: 4.1.2 (verified via npm registry, already installed in packages/api)

## Architecture Patterns

### Recommended Project Structure
```
packages/ai/src/
  knowledge/
    core/
      types.ts            # Article types, confidence levels, enums
      constants.ts        # Confidence attribution strings, health thresholds
    ingest/
      session-ingester.ts # Extract learnings from completed sessions
      manual-ingester.ts  # Process manual text/image/PDF uploads
    compile/
      article-compiler.ts # LLM generates/updates wiki articles
      linker.ts           # Auto-generate backlinks between articles
      deduplicator.ts     # Detect and merge duplicate content
    retrieve/
      search.ts           # Hybrid search orchestration (dense + sparse + RRF)
      embeddings.ts       # Generate Gemini embeddings for articles/queries
      context-builder.ts  # Build prompt context from retrieved articles
    verify/
      verification.ts     # Status transitions, queue logic
    health/
      health-check.ts     # Coverage gaps, stale detection, consistency
  tools/
    searchKnowledgeBase/
      index.ts            # buildTool() implementation
      types.ts            # Zod input/output schemas

packages/db/src/
  schema/
    knowledge-articles.ts     # Drizzle table definition
    knowledge-verifications.ts
    knowledge-links.ts
  repositories/
    knowledge-article.repository.ts
    knowledge-verification.repository.ts
    knowledge-link.repository.ts

packages/shared/src/
  schemas/
    knowledge-article.schema.ts   # Zod DTOs
    knowledge-verification.schema.ts
    knowledge-link.schema.ts

packages/api/src/
  routers/
    knowledge.router.ts    # tRPC endpoints for KB management
  jobs/
    knowledge-ingest.ts    # Inngest: session -> candidate articles
    knowledge-compile.ts   # Inngest: raw data -> wiki articles
    knowledge-health.ts    # Inngest: cron health monitoring
```

### Pattern 1: Qdrant Collection with Named Vectors + BM25
**What:** Single collection supporting hybrid search with dense semantic vectors and sparse BM25 vectors, plus metadata payload filtering.
**When to use:** Collection initialization at app startup or via setup script.
**Example:**
```typescript
// Source: Qdrant official docs (collections + vectors concepts)
import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

await client.createCollection("knowledge_articles", {
  vectors: {
    dense: { size: 3072, distance: "Cosine" },
  },
  sparse_vectors: {
    sparse: { modifier: "idf" },
  },
});

// Create payload indexes for efficient filtering
await client.createPayloadIndex("knowledge_articles", {
  field_name: "org_id",
  field_schema: "keyword",
});
await client.createPayloadIndex("knowledge_articles", {
  field_name: "confidence_level",
  field_schema: "keyword",
});
await client.createPayloadIndex("knowledge_articles", {
  field_name: "equipment_brand",
  field_schema: "keyword",
});
await client.createPayloadIndex("knowledge_articles", {
  field_name: "equipment_model",
  field_schema: "keyword",
});
```

### Pattern 2: Hybrid Search with RRF (searchKnowledgeBase core)
**What:** Combine dense vector search and BM25 sparse search using Reciprocal Rank Fusion.
**When to use:** Every searchKnowledgeBase tool invocation during live sessions.
**Example:**
```typescript
// Source: Qdrant hybrid-queries docs
// Dense embedding generated client-side via Gemini
const denseVector = await generateEmbedding(query, "RETRIEVAL_QUERY");

const results = await client.query("knowledge_articles", {
  prefetch: [
    {
      // BM25 sparse search via Qdrant server-side inference
      query: { text: query, model: "qdrant/bm25" },
      using: "sparse",
      limit: 20,
    },
    {
      // Dense semantic search via Gemini embedding
      query: denseVector,
      using: "dense",
      limit: 20,
    },
  ],
  // Fuse results with weighted RRF (bias toward dense for semantic)
  query: { rrf: { weights: [1.0, 2.0] } },
  filter: {
    must: [{ key: "org_id", match: { value: orgId } }],
  },
  with_payload: true,
  limit: 3, // D-07: Top 3 results
});
```

### Pattern 3: Gemini Embedding Generation
**What:** Generate dense embeddings via Gemini embedding model with taskType optimization.
**When to use:** On article upsert (RETRIEVAL_DOCUMENT) and search query (RETRIEVAL_QUERY).
**Example:**
```typescript
// Source: Gemini embedding API docs
import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 3072;

async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
): Promise<number[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [text],
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  });
  return result.embeddings[0].values;
}
```

### Pattern 4: Inngest Knowledge Pipeline (extends session-summarize pattern)
**What:** Multi-step Inngest function for async knowledge processing.
**When to use:** Triggered by "session/ended" event (same as summary pipeline).
**Example:**
```typescript
// Source: Existing session-summarize.ts pattern
export const knowledgeIngest = inngest.createFunction(
  {
    id: "knowledge-ingest",
    retries: 3,
    triggers: [{ event: "session/ended" }],
  },
  async ({ event, step }) => {
    // Step 1: Fetch completed session with details
    const sessionData = await step.run("fetch-session", async () => {
      const repo = new SessionRepository(db);
      return repo.findWithDetails(event.data.sessionId);
    });

    if (!sessionData) return { status: "not-found" };

    // Step 2: Extract candidate learnings via LLM
    const learnings = await step.run("extract-learnings", async () => {
      return extractLearnings(sessionData);
    });

    // Step 3: Create/update knowledge articles
    await step.run("upsert-articles", async () => {
      return upsertArticles(learnings, event.data.orgId);
    });

    return { status: "completed", articleCount: learnings.length };
  },
);
```

### Pattern 5: searchKnowledgeBase Tool (follows lookupErrorCode pattern)
**What:** buildTool()-based tool with constructor injection for dependencies.
**When to use:** Tool registered in assembleToolPool and dispatched during live sessions.
**Example:**
```typescript
// Source: Existing lookupErrorCode pattern + logFinding pattern
export interface KnowledgeSearchDeps {
  qdrantClient: QdrantClient;
  embeddingService: EmbeddingService;
}

export function createSearchKnowledgeBaseTool(deps: KnowledgeSearchDeps) {
  return buildTool<SearchKBInputType, SearchKBOutputType>({
    name: "searchKnowledgeBase",
    description:
      "Search the organization knowledge base for procedures, equipment info, and verified knowledge",
    inputSchema: SearchKBInput,
    outputSchema: SearchKBOutput,
    isReadOnly: true,
    async call(input, context): Promise<SearchKBOutputType> {
      const results = await hybridSearch(deps, {
        query: input.query,
        orgId: context.orgId,
        equipmentContext: input.equipmentContext,
        limit: 3,
      });

      if (results.length === 0) {
        return { found: false, message: "No relevant knowledge found." };
      }

      return {
        found: true,
        articles: results.map((r) => ({
          title: r.title,
          summary: r.summary,
          content: r.contentMd,
          confidenceLevel: r.confidenceLevel,
          equipmentBrand: r.equipmentBrand,
          equipmentModel: r.equipmentModel,
          attribution: getAttributionPhrase(r.confidenceLevel),
        })),
      };
    },
  });
}
```

### Anti-Patterns to Avoid
- **Drizzle in services:** All DB queries through repositories. Knowledge services must not import from drizzle-orm.
- **Embedding in tRPC routers:** Embedding generation and Qdrant operations belong in packages/ai services, not in router procedures.
- **Synchronous ingestion:** Never run knowledge extraction during a live session. Always async via Inngest.
- **Raw Drizzle types crossing boundaries:** All data must pass through Zod DTOs before leaving a repository.
- **Importing @trpc/server in packages/ai:** Use ErrorWithCode for all error handling in knowledge services.
- **Hardcoded confidence attribution strings:** Use a constant map so attribution phrases can be updated in one place.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BM25 sparse vectors | Custom tokenizer + TF-IDF calculator | Qdrant `qdrant/bm25` server-side inference | Handles tokenization, IDF, and sparse vector generation automatically. Zero client code needed. |
| Vector similarity search | Custom nearest-neighbor implementation | Qdrant query API with HNSW index | HNSW is state-of-the-art ANN, handles billions of vectors. Qdrant handles index management. |
| Reciprocal Rank Fusion | Custom RRF algorithm | Qdrant `query.fusion: "rrf"` or `query.rrf` | Built into Qdrant since v1.14, with weighted RRF since v1.17.0. |
| Embedding generation | Custom embedding model | Gemini `embedContent()` API | Production-quality embeddings with taskType optimization. $0.15/1M tokens. |
| Background job orchestration | Custom queue + retry logic | Inngest step functions | Independent step retries, idempotency, built-in monitoring. |
| Rate limiting on KB endpoints | Custom middleware | Existing @upstash/ratelimit middleware | Already configured in the project middleware chain. |

**Key insight:** Qdrant 1.17.x with built-in BM25 inference eliminates the most complex part of hybrid search -- generating and managing sparse vectors. The client only needs to generate dense embeddings (Gemini) and pass text to Qdrant for BM25. This dramatically simplifies the implementation.

## Common Pitfalls

### Pitfall 1: Embedding Model Mismatch
**What goes wrong:** Using different embedding models or dimensions for indexing vs querying produces meaningless search results.
**Why it happens:** The embedding spaces between models are incompatible. Even dimension differences within the same model produce incorrect similarity scores.
**How to avoid:** Pin the model ID and dimension as constants. Use `RETRIEVAL_DOCUMENT` taskType for indexing and `RETRIEVAL_QUERY` for search queries. Store the model ID in article metadata for migration safety.
**Warning signs:** Search results are random/irrelevant despite having relevant articles.

### Pitfall 2: Missing org_id Filter on Qdrant Queries
**What goes wrong:** Cross-org data leakage -- a technician from org A sees knowledge articles from org B.
**Why it happens:** Qdrant payload filters must be explicitly applied; there is no automatic tenant isolation.
**How to avoid:** Every Qdrant query MUST include `filter.must: [{ key: "org_id", match: { value: orgId } }]`. Abstract this into the search function so individual callers cannot forget it.
**Warning signs:** Search returns articles with unfamiliar equipment or procedures.

### Pitfall 3: Inngest Step Serialization
**What goes wrong:** Date objects, class instances, or complex types lose their type when passed between Inngest steps.
**Why it happens:** Inngest serializes step.run() return values to JSON. Date becomes string, class instances lose methods.
**How to avoid:** Use plain interfaces (not DTO classes) for inter-step data. Parse dates with z.coerce.date() when re-consuming step outputs. This is the established pattern from session-summarize.ts.
**Warning signs:** Runtime type errors like "toISOString is not a function" in step 2+ of a pipeline.

### Pitfall 4: Qdrant Point ID Collisions
**What goes wrong:** Upserting an article with a numeric Qdrant point ID that collides with another article silently overwrites it.
**Why it happens:** Qdrant uses upsert semantics -- same ID replaces the existing point.
**How to avoid:** Use the article's Postgres UUID/ID as the Qdrant point ID (Qdrant supports string UUIDs). Store the mapping in the article's `embedding_id` column.
**Warning signs:** Article count in Qdrant is less than in Postgres.

### Pitfall 5: Gemini Embedding Token Limit
**What goes wrong:** Articles exceeding the token limit get silently truncated, producing embeddings that only represent the beginning of the content.
**Why it happens:** gemini-embedding-001 has a 2048 token limit. Long technical articles can exceed this.
**How to avoid:** Estimate token count before embedding (rough: 1 token per 4 chars for English). For articles exceeding the limit, embed the title + summary as a fallback representation. Log a warning for monitoring.
**Warning signs:** Long articles have poor search relevance despite containing matching content.

### Pitfall 6: Race Condition in Article Compilation
**What goes wrong:** Two sessions ending simultaneously both trigger compilation for the same equipment/procedure, creating duplicate articles.
**Why it happens:** Inngest jobs run concurrently. Two knowledge-ingest jobs may both decide to create a new article for "Daikin FTXM25 compressor replacement."
**How to avoid:** Use Inngest's concurrency control (`concurrency: { key: "event.data.orgId", limit: 1 }`) to serialize ingestion per org. Alternatively, use an idempotency check in the upsert step.
**Warning signs:** Duplicate articles for the same equipment/procedure appearing in the verification queue.

### Pitfall 7: Qdrant Collection Not Found on Cold Start
**What goes wrong:** First API call to searchKnowledgeBase fails because the Qdrant collection doesn't exist yet.
**Why it happens:** Collection creation is a one-time setup, but the code must handle the case where it hasn't happened.
**How to avoid:** Add a collection initialization check that runs on first use (lazy init with a flag). Or create a setup script/Inngest function that ensures the collection exists.
**Warning signs:** "Collection not found" errors in production.

## Embedding Model Decision

**Critical correction to D-11:** The CONTEXT.md references `gemini-embedding-exp-03-07` which does not exist in the current Gemini API. The available models are:

| Model | Type | Dimensions | Token Limit | Price/1M tokens | TaskType Support |
|-------|------|-----------|-------------|-----------------|------------------|
| gemini-embedding-001 | Text only | 3072 (default, configurable 128-3072) | 2,048 | $0.15 | Yes (RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, etc.) |
| gemini-embedding-2-preview | Multimodal (text, image, PDF, audio, video) | 3072 (default, configurable 128-3072) | 8,192 | $0.20 (text) | No (use instruction prefix instead) |

**Recommendation: Use `gemini-embedding-001`** for the following reasons:
1. **TaskType support** -- RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY optimize embeddings for the search use case. This is the biggest advantage.
2. **Lower cost** -- $0.15 vs $0.20 per 1M tokens.
3. **Stable** -- Not a preview model.
4. **Sufficient for v1** -- The vast majority of knowledge articles are text (from session ingestion). Manual uploads of images/PDFs (D-04/D-14) can have their text extracted by Gemini content generation first, then the extracted text gets embedded.

For multimodal content flow: Image/PDF upload -> Gemini content generation extracts text description -> Text description embedded via gemini-embedding-001. This avoids the incompatible embedding space problem.

**2048 token limit consideration (D-13):** Most HVAC knowledge articles will be well under 2048 tokens. For articles that exceed the limit, embed `title + summary` (which together stay under the limit) as a compact representation. The full content is still stored in Postgres and returned to the user.

**Confidence level:** HIGH -- gemini-embedding-001 is stable/GA, well-documented, and the pricing is confirmed.

## BM25 Strategy Decision

**Recommendation: Use Qdrant's built-in `qdrant/bm25` server-side inference.**

This means:
- **On upsert:** Pass `{ text: articleContent, model: "qdrant/bm25" }` as the sparse vector. Qdrant tokenizes and generates the sparse vector automatically.
- **On query:** Pass `{ text: queryText, model: "qdrant/bm25" }` in the prefetch. Qdrant generates the query sparse vector automatically.
- **IDF modifier:** Set `modifier: "idf"` on the sparse vector configuration for proper BM25 weighting.

**Benefits:**
- Zero client-side BM25 implementation code
- Qdrant manages the IDF statistics across the collection
- Tokenization is consistent between indexing and querying
- No npm dependency for BM25

**Confidence level:** MEDIUM -- Qdrant's server-side inference is documented but relatively new (v1.16+). If the Qdrant Cloud instance doesn't support inference, fall back to a simple client-side approach using the `@qdrant/js-client-rest` sparse vector format with manual term frequency calculation.

## Qdrant Collection Design

```
Collection: knowledge_articles
  Named vectors:
    dense: { size: 3072, distance: "Cosine" }
  Sparse vectors:
    sparse: { modifier: "idf" }  // BM25 via qdrant/bm25 inference

  Payload (indexed for filtering):
    org_id: keyword (indexed)           -- tenant isolation
    article_id: keyword (indexed)       -- link back to Postgres
    confidence_level: keyword (indexed)  -- unverified|technician_reviewed|expert_approved|manufacturer_sourced
    equipment_brand: keyword (indexed)
    equipment_model: keyword (indexed)
    category: keyword (indexed)          -- equipment|procedure|safety|regulatory|troubleshooting
    title: text                          -- for display
    summary: text                        -- for display
    tags: keyword[]                      -- flexible tagging
```

## Knowledge Article Data Model (Postgres)

Based on TECH-SPEC section 4.3 with adjustments for decisions:

```sql
-- knowledge_articles
id              VARCHAR(30) PRIMARY KEY   -- art_xxxxx (generateId pattern)
org_id          VARCHAR(36) NOT NULL      -- tenant isolation
slug            VARCHAR(255) NOT NULL     -- URL-friendly identifier
title           VARCHAR(500) NOT NULL
summary         TEXT                      -- brief description for search results
content_md      TEXT NOT NULL             -- full markdown content
category        VARCHAR(50) NOT NULL      -- equipment|procedure|safety|regulatory|troubleshooting
equipment_brand VARCHAR(100)              -- nullable (not all articles are equipment-specific)
equipment_model VARCHAR(100)
procedure_type  VARCHAR(100)              -- e.g., "compressor_replacement", "error_diagnosis"
confidence_level VARCHAR(30) NOT NULL DEFAULT 'unverified'
source_type     VARCHAR(30) NOT NULL      -- session|manual|feedback
source_session_ids JSONB                  -- array of session IDs that contributed
tags            JSONB                     -- string array for flexible tagging
version         INTEGER NOT NULL DEFAULT 1
previous_version_id VARCHAR(30)           -- self-referential for version history
embedding_id    VARCHAR(100)              -- Qdrant point UUID
embedding_model VARCHAR(100)              -- model used for embedding (migration safety)
word_count      INTEGER
retrieval_count INTEGER DEFAULT 0
last_retrieved_at TIMESTAMP WITH TIME ZONE
is_ai_generated BOOLEAN NOT NULL DEFAULT true  -- COMP-07 compliance
created_by      VARCHAR(36)               -- user ID
verified_by     VARCHAR(36)
verified_at     TIMESTAMP WITH TIME ZONE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- knowledge_verifications
id              VARCHAR(30) PRIMARY KEY
article_id      VARCHAR(30) NOT NULL REFERENCES knowledge_articles(id)
org_id          VARCHAR(36) NOT NULL
reviewer_id     VARCHAR(36) NOT NULL      -- Better Auth user ID
status          VARCHAR(20) NOT NULL      -- pending|approved|rejected|needs_revision
reviewer_notes  TEXT
reviewed_at     TIMESTAMP WITH TIME ZONE
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- knowledge_links
id              VARCHAR(30) PRIMARY KEY
source_article_id VARCHAR(30) NOT NULL REFERENCES knowledge_articles(id)
target_article_id VARCHAR(30) NOT NULL REFERENCES knowledge_articles(id)
link_type       VARCHAR(30) NOT NULL      -- reference|prerequisite|related
created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

## Code Examples

Verified patterns from official sources and existing codebase:

### Qdrant Upsert with Dual Vectors (Dense + BM25)
```typescript
// Source: Qdrant vectors docs + hybrid-queries docs
async function upsertArticle(
  client: QdrantClient,
  article: KnowledgeArticleDTO,
  denseVector: number[],
): Promise<void> {
  await client.upsert("knowledge_articles", {
    wait: true,
    points: [
      {
        id: article.id, // Use article ID as point ID (string UUID)
        vectors: {
          dense: denseVector,
          // Qdrant generates BM25 sparse vector from text
          sparse: {
            text: `${article.title} ${article.summary} ${article.contentMd}`,
            model: "qdrant/bm25",
          },
        },
        payload: {
          article_id: article.id,
          org_id: article.orgId,
          confidence_level: article.confidenceLevel,
          equipment_brand: article.equipmentBrand ?? "",
          equipment_model: article.equipmentModel ?? "",
          category: article.category,
          title: article.title,
          summary: article.summary,
          tags: article.tags ?? [],
        },
      },
    ],
  });
}
```

### Gemini Embedding with TaskType
```typescript
// Source: Gemini embedding API docs
import { GoogleGenAI } from "@google/genai";

export class GeminiEmbeddingService {
  private ai: GoogleGenAI;
  private model = "gemini-embedding-001";
  private dimensions = 3072;

  constructor(private deps: { apiKey: string }) {
    this.ai = new GoogleGenAI({ apiKey: deps.apiKey });
  }

  async embedDocument(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: this.model,
      contents: [text],
      config: {
        outputDimensionality: this.dimensions,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    });
    return result.embeddings[0].values;
  }

  async embedQuery(text: string): Promise<number[]> {
    const result = await this.ai.models.embedContent({
      model: this.model,
      contents: [text],
      config: {
        outputDimensionality: this.dimensions,
        taskType: "RETRIEVAL_QUERY",
      },
    });
    return result.embeddings[0].values;
  }
}
```

### Confidence Attribution Map
```typescript
// Source: agents/knowledge-base.md confidence levels table
export const CONFIDENCE_ATTRIBUTION: Record<string, string> = {
  unverified:
    "Based on unverified observation from a field session",
  technician_reviewed:
    "Based on technician-confirmed procedure",
  expert_approved:
    "Based on verified procedure",
  manufacturer_sourced:
    "Per manufacturer documentation",
} as const;

export type ConfidenceLevel = keyof typeof CONFIDENCE_ATTRIBUTION;
```

### Verification Status Transitions
```typescript
// Valid status transitions for the verification queue
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["approved", "rejected", "needs_revision"],
  needs_revision: ["pending"], // author resubmits -> back to pending
  approved: [], // terminal state (version history for changes)
  rejected: [], // terminal state
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ColPali Python sidecar for multimodal RAG | Gemini embedding models (native multimodal) | Late 2025 | Eliminates Python dependency entirely; simpler architecture |
| Client-side BM25 libraries | Qdrant server-side qdrant/bm25 inference | Qdrant v1.16 (early 2026) | Zero client-side BM25 code needed |
| Separate dense + sparse queries with manual fusion | Qdrant prefetch + RRF fusion API | Qdrant v1.14+ (RRF), v1.17 (weighted RRF) | Hybrid search in a single API call |
| Chunking-based RAG | Full-document embedding with high token limits | Gemini embedding-001 (2048 tokens) | Simpler for articles under 2048 tokens; no chunk management |
| @google/generative-ai (legacy) | @google/genai (unified) | 2025 | Single SDK for all Gemini operations including embeddings |

**Deprecated/outdated:**
- **ColPali for this project:** Replaced by Gemini embedding model per D-11. ColPali is still valid for Python projects but unnecessary here.
- **@google/generative-ai:** Legacy SDK. The project already uses @google/genai.
- **Manual BM25 tokenization:** Qdrant's server-side inference handles this.

## Open Questions

1. **Qdrant Cloud BM25 Inference Support**
   - What we know: Qdrant server-side inference with `qdrant/bm25` is documented for Qdrant v1.16+. Qdrant Cloud runs 1.17.x.
   - What's unclear: Whether Qdrant Cloud EU instances have server-side inference enabled by default, or if it requires a specific plan/configuration.
   - Recommendation: Plan for built-in BM25 as primary path. If Cloud doesn't support it, implement a lightweight fallback: generate sparse vectors client-side using simple term frequency (TF) with the IDF modifier on Qdrant handling the rest.

2. **Gemini Embedding Rate Limits**
   - What we know: Free tier is available. Batch API offers 50% savings for high-throughput embedding.
   - What's unclear: Exact rate limits per minute for embedContent calls.
   - Recommendation: Add rate limiting/batching in the embedding service. Use Inngest step retries to handle transient rate limit errors.

3. **Article Compilation Quality**
   - What we know: LLM (Gemini 2.5 Flash or Pro) generates wiki articles from session data.
   - What's unclear: How well the compilation handles merging multiple sessions about the same topic without losing context.
   - Recommendation: Start simple (one article per session, merge later). Use a structured prompt with explicit merge instructions. Test with representative session data.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon Postgres (EU) | KB tables | Already configured | -- | -- |
| Qdrant Cloud (EU) | Vector search | Needs setup | 1.17.x | Local Qdrant Docker for dev |
| Gemini API (@google/genai) | Embeddings + compilation | Already configured | 1.48.0 | -- |
| Inngest | Background pipelines | Already configured | 4.1.2 | -- |
| Bun | Package management + runtime | Already installed | 1.3.x | -- |

**Missing dependencies with no fallback:**
- Qdrant Cloud EU instance: Must be provisioned. This is INFRA-07. The plan should include collection creation as Wave 0 infrastructure setup.

**Missing dependencies with fallback:**
- None -- all other dependencies are already configured in the project.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `packages/ai/vitest.config.ts` (exists), `packages/db/vitest.config.ts` (exists), `packages/api/vitest.config.ts` (exists) |
| Quick run command | `bun run test --filter=@aucta/ai` |
| Full suite command | `bun run test` (turbo test across all packages) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KB-01 | 4-tier confidence level schema + DTOs | unit | `bunx vitest run --project shared -- knowledge-article.schema.test.ts` | Wave 0 |
| KB-02 | Hybrid search returns results via dense+sparse+RRF | unit | `bunx vitest run --project ai -- search.test.ts` | Wave 0 |
| KB-03 | Verified articles rank above unverified | unit | `bunx vitest run --project ai -- search.test.ts` | Wave 0 |
| KB-04 | Session ingestion extracts learnings | unit | `bunx vitest run --project api -- knowledge-ingest.test.ts` | Wave 0 |
| KB-05 | Article compilation produces structured markdown | unit | `bunx vitest run --project ai -- article-compiler.test.ts` | Wave 0 |
| KB-06 | Categorization by brand/model/procedure | unit | `bunx vitest run --project ai -- linker.test.ts` | Wave 0 |
| KB-07 | Verification queue status transitions | unit | `bunx vitest run --project ai -- verification.test.ts` | Wave 0 |
| KB-08 | Health check detects gaps and stale articles | unit | `bunx vitest run --project api -- knowledge-health.test.ts` | Wave 0 |
| KB-09 | Source attribution includes correct confidence phrase | unit | `bunx vitest run --project ai -- context-builder.test.ts` | Wave 0 |
| KB-10 | Manual input creates article via API | unit | `bunx vitest run --project api -- knowledge.router.test.ts` | Wave 0 |
| TOOL-05 | searchKnowledgeBase tool returns hybrid results | unit | `bunx vitest run --project ai -- searchKnowledgeBase` | Wave 0 |
| INFRA-07 | Qdrant collection created with correct config | unit | `bunx vitest run --project ai -- embeddings.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test --filter=@aucta/ai && bun run test --filter=@aucta/shared`
- **Per wave merge:** `bun run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/shared/src/schemas/knowledge-article.schema.test.ts` -- covers KB-01
- [ ] `packages/shared/src/schemas/knowledge-verification.schema.test.ts` -- covers KB-07 DTOs
- [ ] `packages/db/src/repositories/knowledge-article.repository.test.ts` -- covers KB-01, KB-06
- [ ] `packages/ai/src/knowledge/retrieve/search.test.ts` -- covers KB-02, KB-03, TOOL-05
- [ ] `packages/ai/src/knowledge/retrieve/embeddings.test.ts` -- covers INFRA-07
- [ ] `packages/ai/src/knowledge/retrieve/context-builder.test.ts` -- covers KB-09
- [ ] `packages/ai/src/knowledge/compile/article-compiler.test.ts` -- covers KB-05
- [ ] `packages/ai/src/knowledge/verify/verification.test.ts` -- covers KB-07
- [ ] `packages/ai/src/knowledge/health/health-check.test.ts` -- covers KB-08
- [ ] `packages/ai/src/tools/searchKnowledgeBase/searchKnowledgeBase.test.ts` -- covers TOOL-05
- [ ] `packages/api/src/jobs/knowledge-ingest.test.ts` -- covers KB-04
- [ ] `packages/api/src/jobs/knowledge-compile.test.ts` -- covers KB-05
- [ ] `packages/api/src/jobs/knowledge-health.test.ts` -- covers KB-08
- [ ] `packages/api/src/routers/knowledge.router.test.ts` -- covers KB-10

## Sources

### Primary (HIGH confidence)
- Qdrant hybrid-queries docs: https://qdrant.tech/documentation/concepts/hybrid-queries/ -- prefetch + RRF fusion API, weighted RRF (v1.17.0), JS examples
- Qdrant vectors docs: https://qdrant.tech/documentation/concepts/vectors/ -- sparse vectors, server-side inference, qdrant/bm25 model, modifier: "idf"
- Qdrant collections docs: https://qdrant.tech/documentation/concepts/collections/ -- named vectors config, sparse_vectors config, payload indexes
- Gemini embedding docs: https://ai.google.dev/gemini-api/docs/embeddings -- model IDs (gemini-embedding-001, gemini-embedding-2-preview), dimensions, taskType, token limits, JS API
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing -- embedding-001 $0.15/1M, embedding-2-preview $0.20/1M
- npm registry: @qdrant/js-client-rest 1.17.0, @google/genai 1.48.0, inngest 4.1.2 -- version verification
- Existing codebase: session-summarize.ts (Inngest pattern), lookupErrorCode (tool pattern), session.repository.ts (repository pattern)

### Secondary (MEDIUM confidence)
- Qdrant indexing docs: https://qdrant.tech/documentation/concepts/indexing/ -- payload index configuration, sparse index params
- Qdrant server-side inference: documented in vectors docs for qdrant/bm25 model -- may have Cloud-specific availability constraints

### Tertiary (LOW confidence)
- Qdrant Cloud EU inference availability -- not explicitly documented for hosted/cloud instances; needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified, versions confirmed, APIs documented
- Architecture: HIGH -- follows established codebase patterns (vertical slices, constructor injection, repository pattern)
- Pitfalls: HIGH -- identified from real project patterns (Inngest serialization, org_id filtering, embedding limits)
- Qdrant BM25 inference: MEDIUM -- documented but Cloud availability unconfirmed
- Embedding model selection: HIGH -- verified via official Gemini docs, pricing confirmed

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days -- stable technologies)
