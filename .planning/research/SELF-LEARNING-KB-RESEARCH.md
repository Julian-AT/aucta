# Self-Learning Knowledge Base: Deep Research

> **Scope:** v1.1+ research for Aucta's HVAC technician AI copilot.
> Complements the existing v1.0 implementation research in `.planning/milestones/v1.0-phases/05-knowledge-base/05-RESEARCH.md`.
> **Date:** 2026-04-10 | **Status:** Research only -- no code.

---

## Table of Contents

1. [Knowledge Base Architecture Patterns](#1-knowledge-base-architecture-patterns)
2. [Self-Learning Mechanisms](#2-self-learning-mechanisms)
3. [Document Processing Pipeline](#3-document-processing-pipeline)
4. [Real-Time Retrieval Optimization](#4-real-time-retrieval-optimization)
5. [Knowledge Base Management Dashboard](#5-knowledge-base-management-dashboard)
6. [Open-Source Tools Landscape](#6-open-source-tools-landscape)
7. [Recommendations for Aucta](#7-recommendations-for-aucta)
8. [Sources](#8-sources)

---

## 1. Knowledge Base Architecture Patterns

### 1.1 Multi-Tenant RAG Isolation Models

Three dominant patterns exist for multi-tenant retrieval-augmented generation systems:

**Silo Model (Separate Index per Tenant)**
- Each company gets its own Qdrant collection (or namespace).
- Strongest isolation: zero risk of cross-tenant data leakage.
- Simplest query logic -- no filter predicates needed.
- Downside: resource overhead scales linearly with tenant count. Empty collections still consume HNSW graph memory. Collection creation/deletion adds operational complexity.
- Best when: tenant count is low-to-moderate (< 500), data sensitivity is high, or per-tenant SLAs differ significantly.

**Pool Model (Shared Index with Metadata Filtering)**
- All tenants share a single Qdrant collection. Every point carries a `tenant_id` payload field. Queries always include a `must` filter on `tenant_id`.
- Most resource-efficient: single HNSW graph, shared quantization tables.
- Qdrant payload indexing makes tenant filtering near-zero cost when the `tenant_id` field has a keyword index.
- Downside: requires disciplined query construction -- a missing filter leaks data. Noisy-neighbor risk if one tenant dominates the collection.
- Best when: tenant count is high, data sizes per tenant are similar, and operational simplicity is paramount.

**Bridge Model (Hybrid)**
- Shared infrastructure with logical isolation boundaries. Example: one Qdrant cluster, but separate collections for tenants above a size threshold and a shared pool for small tenants.
- Balances isolation with resource efficiency.
- Used by: AWS multi-tenant RAG reference architecture, Microsoft Azure AI Search, Milvus partition keys.

**Recommendation for Aucta:** The v1.0 research already decided on a single Qdrant collection with `company_id` payload filtering (Pool Model). This is correct for the early stage. Plan a migration path to Silo Model (per-company collections) for enterprise tenants with > 10K articles or strict data isolation requirements. Use Qdrant's `payload_index` on `company_id` (keyword type) to keep filter overhead negligible.

### 1.2 Per-Company Knowledge Base Isolation Layers

A production multi-tenant KB typically operates across four scopes:

| Layer | Scope | Content | Mutability |
|-------|-------|---------|------------|
| **Master KB** | Global, all tenants | HVAC fundamentals, manufacturer specs, safety codes, regulatory standards | Read-only for tenants; admin-curated |
| **Company KB** | Per-tenant | Company-specific procedures, equipment inventory, past session learnings, tribal knowledge | Read-write per org admins |
| **Agent KB** | Per-session | Ephemeral context: current equipment, active error codes, conversation history | Session-scoped, discarded after |
| **Personal KB** | Per-technician | Individual notes, bookmarked procedures, learning history | User-scoped |

**Industry Template Cold-Start Pattern:** When a new company onboards, clone from an industry-specific template (e.g., "Commercial HVAC" or "Residential Heat Pump") to provide immediate value. SolidNumber's approach uses 52 industry templates. For Aucta, 5--8 HVAC sub-domain templates (residential, commercial, industrial refrigeration, heat pumps, VRF systems, chillers, boilers, air handling units) would cover the majority of use cases.

### 1.3 Virtual Filesystem Pattern (Mintlify-Style)

Mintlify and similar documentation platforms organize knowledge using a virtual filesystem metaphor:

- Content is organized in a tree structure: `/{company}/{category}/{subcategory}/{article}`.
- Navigation is generated from the tree structure, not from explicit link management.
- Versioning is built into the tree: `/v2/compressor-replacement` vs `/v1/compressor-replacement`.
- Cross-references use relative paths, enabling bulk moves without broken links.
- Metadata (frontmatter) lives alongside content, not in a separate database.

**Applicability to Aucta:** The virtual filesystem pattern is useful for the dashboard's document management UI, but the underlying storage should remain vector-first (Qdrant) with relational metadata (Neon). The tree structure can be represented as a `parent_id` hierarchy in the `knowledge_articles` table with a `path` computed column for navigation.

### 1.4 Graph-Based vs Vector-Only vs Hybrid

| Approach | Strengths | Weaknesses | HVAC Fit |
|----------|-----------|------------|----------|
| **Vector-only** | Fast similarity search, handles semantic queries well, simple architecture | Misses structural relationships (part-of, causes, requires-tool), poor at multi-hop reasoning | Good for "find similar problems" |
| **Knowledge Graph** | Explicit relationships, multi-hop reasoning ("what causes X which affects Y"), structured domain modeling | Expensive to build/maintain, requires entity extraction, brittle with noisy input | Good for troubleshooting chains, equipment hierarchies |
| **Hybrid (Vector + Graph)** | Best of both: semantic similarity for discovery, graph traversal for reasoning chains | Architectural complexity, dual storage, query routing logic | Ideal for HVAC: semantic search for symptoms, graph traversal for diagnostic chains |

**HVAC-Specific Knowledge Structures:**

- **Equipment Hierarchy:** Building > System > Unit > Component > Part. A graph naturally represents "Carrier 50XC chiller > compressor > scroll compressor > suction valve."
- **Troubleshooting Chains:** Symptom > Possible Cause > Diagnostic Step > Repair Action. Graph edges carry probability weights from historical session data.
- **Error Code Ontology:** Manufacturer > Model Series > Error Code > Meaning > Common Causes > Repair Steps. Naturally a tree/graph structure.
- **Tool/Part Requirements:** Repair Action > Required Tools + Required Parts. Graph enables "what do I need for this job?" queries.

**Recommendation for Aucta:** Start with vector-only (v1.0 plan is correct). Introduce a lightweight property graph layer in v1.1+ using Qdrant's payload relationships (store `related_article_ids`, `parent_equipment_id`, `error_code_refs` as payload arrays). Full knowledge graph (Neo4j/NetworkX) is a v2.0+ consideration when the dataset justifies the complexity.

---

## 2. Self-Learning Mechanisms

### 2.1 Knowledge Extraction from AI Session Transcripts

Three academic frameworks are directly relevant:

**PIPA Framework (arxiv 2602.15859 -- "From Transcripts to AI Agents")**
- Pipeline: Raw transcript > Topic annotation > QA pair extraction > Quality filtering (0.8 threshold) > Maximum coverage selection.
- Key insight: Not all transcript content is worth extracting. The "maximum coverage problem" selects the minimal set of QA pairs that covers the maximum topic space.
- Quality filtering at 0.8 threshold eliminates hallucinated, redundant, or low-confidence extractions.
- Directly applicable to Aucta: session transcripts between technician and Gemini can be processed through this pipeline.

**AI Knowledge Assist (arxiv 2510.08149)**
- Three-stage pipeline: (1) QA extraction from transcripts, (2) Clustering of similar QA pairs, (3) LLM selection of representative pairs per cluster.
- Critical finding: Fine-tuned LLaMA-3.1-8B outperforms larger models at extraction quality. This suggests that a smaller, specialized extraction model can be more effective than using the primary large model.
- Clustering eliminates redundancy across sessions -- important when multiple technicians encounter the same issue.

**DySECT (arxiv 2603.06915 -- Dynamic Self-Evolving Extraction & Curation Toolkit)**
- Closed-loop system: extraction populates KB, KB improves future extraction.
- Key innovation: the extraction pipeline itself improves over time as the KB grows, because the KB provides better context for disambiguation.
- Self-correcting: when extraction errors are identified (via human review or downstream failure), the corrections propagate back to improve extraction heuristics.

### 2.2 Knowledge Atomization

Breaking session transcripts into the smallest meaningful semantic units:

**Five Decomposition Strategies:**
1. **Fact extraction:** "The 410A charge for a Carrier 50XC is 42 lbs." -- atomic declarative facts.
2. **Procedure extraction:** Step-by-step sequences identified by temporal markers ("first," "then," "after").
3. **Causal extraction:** "Low superheat because the TXV is stuck open" -- cause-effect pairs.
4. **Conditional extraction:** "If suction pressure is below 60 PSI on a 410A system, check for restriction" -- if-then rules.
5. **Definition extraction:** "Subcooling is the temperature difference between the liquid line and the saturation temperature" -- terminology.

Each atom gets:
- A confidence score (from the extraction model).
- A provenance chain (which session, which technician, what context).
- A freshness timestamp.
- A validation status (auto-extracted, human-verified, expert-confirmed).

### 2.3 Quality Scoring and Validation Pipeline

**Automated Quality Signals:**
- **Extraction confidence:** LLM-assigned confidence score (0.0--1.0) at extraction time.
- **Consistency check:** Does the new knowledge contradict existing KB content? Flag for review if similarity > 0.85 but semantic polarity differs.
- **Technician authority:** Weight by technician experience level, certification status, session success rate.
- **Recurrence frequency:** Knowledge confirmed across N independent sessions gets promoted.
- **Downstream success:** If knowledge retrieved during a session correlates with successful resolution, boost its quality score.

**Human-in-the-Loop Tiers:**
| Tier | Trigger | Reviewer | SLA |
|------|---------|----------|-----|
| **Auto-approve** | Confidence > 0.9, consistent with existing KB, from certified tech | None | Immediate |
| **Light review** | Confidence 0.7--0.9, or from junior tech | Team lead | 24h |
| **Expert review** | Confidence < 0.7, contradicts existing KB, safety-critical | Senior tech or admin | 48h |
| **Reject + flag** | Confidence < 0.5, or contains safety hazard | Auto-reject, notify admin | Immediate |

### 2.4 Handling Conflicting Information

HVAC knowledge conflicts are common (different manufacturers, regional codes, experience-based disagreements):

- **Version-based resolution:** Newer information from official sources supersedes older.
- **Authority-based resolution:** Manufacturer spec > expert technician > junior technician.
- **Context-based coexistence:** "For Carrier units, use method A. For Trane units, use method B." -- both are correct in their context.
- **Confidence-weighted merging:** When two facts partially overlap, merge with weighted confidence.
- **Conflict flagging:** Surface unresolved conflicts in the dashboard for admin resolution.

### 2.5 Knowledge Decay and Freshness

- **Time-based decay:** Knowledge older than N months gets a freshness penalty in retrieval scoring. Configurable per category (safety procedures decay slower than troubleshooting tips).
- **Usage-based refresh:** Every successful retrieval resets the freshness clock.
- **Supersession:** When new knowledge explicitly replaces old, the old version is archived (not deleted) and marked superseded.
- **Regulatory triggers:** When building codes or refrigerant regulations change, flag all affected articles for review.
- **Manufacturer bulletin integration:** Equipment manufacturer service bulletins trigger automatic review of related KB content.

---

## 3. Document Processing Pipeline

### 3.1 Docling (IBM, MIT License)

Docling is the standout tool for document processing in this domain:

- **37K+ GitHub stars**, actively maintained by IBM Research.
- **Formats:** PDF, DOCX, PPTX, XLSX, HTML, images, audio.
- **Advanced PDF parsing:** Layout analysis, table structure recognition (97.9% cell accuracy on complex tables), OCR, reading order detection.
- **GraniteDocling-258M:** A dedicated VLM for document understanding, up to 30x faster than traditional OCR pipelines.
- **Output formats:** Markdown, JSON, structured document model.

**Docling Ecosystem (8+ repositories):**
| Repo | Purpose |
|------|---------|
| `docling` | Core library |
| `docling-core` | Data model and schemas |
| `docling-parse` | Low-level PDF parsing |
| `docling-serve` | REST API server |
| `docling-ibm-models` | IBM AI models for layout/table recognition |
| `docling-sdg` | Synthetic data generation from documents |
| `docling-mcp` | MCP server integration |
| `docling-graph` | Document-to-knowledge-graph conversion |

**Docling-graph** is particularly relevant: transforms parsed documents into validated Pydantic objects, then builds directed knowledge graphs with semantic relationships via NetworkX. This could feed both the vector store and a future graph layer.

**Integration architecture for Aucta:**
- Deploy `docling-serve` as a sidecar service (Python).
- Inngest job triggers on document upload.
- `docling-serve` parses the document, returns structured Markdown + table data + image regions.
- Downstream pipeline: chunk structured output > embed > store in Qdrant.
- Tables are preserved as structured data (not flattened to text).
- Diagrams/schematics are extracted as image regions for ColPali embedding.

**Framework integrations:** LangChain, LlamaIndex, CrewAI, Haystack all have Docling connectors.

### 3.2 ColPali for Multimodal Document Understanding

ColPali represents a paradigm shift in document retrieval:

**How it works:**
- Treats entire document pages as images (no OCR pipeline needed).
- Uses PaliGemma-3B (or ColQwen 2.5 with Qwen2.5-VL backbone) to generate multi-vector embeddings per page.
- Each patch of the image gets its own embedding vector.
- Retrieval uses ColBERT-style late interaction (MaxSim): the query embedding is compared against all patch embeddings, taking the maximum similarity per query token.
- Captures both textual AND visual information: wiring diagrams, refrigerant flow charts, P&ID drawings, unit schematics.

**Why this matters for HVAC:**
- HVAC manuals are full of diagrams, wiring schematics, piping diagrams, and tables that traditional text-based RAG completely misses.
- A technician asking "show me the wiring diagram for the Carrier 50XC compressor contactor" requires visual understanding.
- ColPali can match the query against the visual content of the wiring diagram, not just surrounding text.

**Architecture consideration (Python-only):**
- ColPali is a Python library (`colpali-engine`). No JavaScript SDK exists.
- Requires a Python sidecar service for embedding generation.
- This aligns with the Docling sidecar -- a single Python service can handle both document parsing (Docling) and multimodal embedding (ColPali).
- Qdrant natively supports multi-vector storage with `multivector_config` and `MAX_SIM` comparator, making ColPali embeddings a first-class citizen.

**ColQwen 2.5 variant:** Uses Qwen2.5-VL backbone instead of PaliGemma. Better multilingual support -- important for Aucta's 7-language requirement (EN, DE, TR, SR, HR, PL, RO).

### 3.3 HVAC Equipment Manual Processing

HVAC manuals present specific challenges:

| Challenge | Solution |
|-----------|----------|
| Multi-column layouts | Docling layout analysis handles multi-column detection |
| Wiring diagrams | ColPali visual embeddings; also extract as separate image regions |
| Refrigerant tables | Docling table extraction (97.9% accuracy); store as structured data |
| Parts lists with part numbers | Named entity extraction for part numbers, cross-reference with equipment hierarchy |
| Installation/service procedures | Procedure extraction with step sequencing |
| Error code tables | Structured extraction into error_code > description > causes > remedies schema |
| Multilingual manuals | Docling + ColQwen 2.5 for multilingual visual understanding; language detection on extracted text |

### 3.4 Incremental Indexing Strategy

Documents should not be re-processed unnecessarily:

- **Content hashing:** SHA-256 of document content. Skip processing if hash matches existing record.
- **Partial update:** If a manual is updated (new revision), diff the extracted content against the previous version. Only re-embed changed sections.
- **Metadata-only update:** If only metadata changes (category, tags), update Qdrant payloads without re-embedding.
- **Tombstoning:** Deleted documents are soft-deleted (payload flag), then purged in a background job.
- **Batch scheduling:** Large bulk uploads are processed in Inngest step functions with concurrency limits to avoid overwhelming the embedding service.

---

## 4. Real-Time Retrieval Optimization

### 4.1 Qdrant HNSW Parameter Tuning

The v1.0 research covers basic Qdrant setup. Here is deeper optimization guidance:

**HNSW Parameters:**
| Parameter | Default | Effect | Recommendation |
|-----------|---------|--------|----------------|
| `m` | 16 | Edges per node. Higher = more accurate, more memory | 16--32 for < 1M points; 32--48 for > 1M |
| `ef_construct` | 100 | Neighbors evaluated during index build. Higher = better index, slower build | 200 for production; 400 for highest quality |
| `full_scan_threshold` | 20000 | Collection size below which brute-force is used instead of HNSW | Keep default unless collection is very small |
| `on_disk` | false | Store HNSW graph on disk instead of RAM | true for large collections with SSD storage |
| `payload_m` | (auto) | Separate `m` for payload-filtered subgraphs | Set to `m * 2` when filtering is primary access pattern |

**Key insight for Aucta:** Since every query filters on `company_id`, the `payload_m` parameter is critical. Setting `payload_m` higher than `m` improves filtered search quality because the HNSW graph maintains better connectivity within each tenant's subgraph.

### 4.2 Qdrant Quantization Strategies

Three quantization methods, each with different tradeoffs:

| Method | Accuracy | Speed | Compression | When to Use |
|--------|----------|-------|-------------|-------------|
| **Scalar (int8)** | 0.99 | 2x | 4x | Default choice. Near-lossless. |
| **Binary** | 0.95 | up to 40x | 32x | Large collections where speed is critical and slight accuracy loss is acceptable. Use with oversampling + rescoring. |
| **Product (PQ)** | 0.70 | 0.5x (slower!) | up to 64x | Extreme memory constraints only. Speed actually decreases. Rarely appropriate. |

**Asymmetric quantization (v1.15.0+):** Queries use full-precision vectors; only stored vectors are quantized. Improves accuracy at no speed cost. Always enable this.

**Recommended configuration for Aucta:**
```
Scalar quantization (int8) + always_ram: true + asymmetric rescoring
```
This gives 4x memory reduction while maintaining 0.99 accuracy. The `always_ram` flag keeps quantized vectors in memory while full-precision vectors can live on disk for rescoring.

### 4.3 Three Optimization Strategies

Qdrant documentation identifies three primary optimization profiles:

**Strategy 1: High Precision + Low Memory**
- On-disk vectors with on-disk HNSW graph.
- Full precision maintained, but slower due to disk I/O.
- Use for: archival collections, infrequently accessed tenants.

**Strategy 2: Low Memory + High Speed (Recommended for Aucta)**
- Scalar quantization in RAM + full-precision vectors on disk.
- Queries hit the fast quantized index first, then rescore top candidates against full-precision vectors from disk.
- `oversampling: 2.0` -- retrieve 2x candidates from quantized search, then rescore to final top-K.
- Best balance of cost, speed, and accuracy for a startup-scale deployment.

**Strategy 3: High Precision + High Speed**
- Full vectors in RAM + quantization for pre-filtering.
- Fastest and most accurate, but highest memory cost.
- Use for: hot/active tenants with SLA requirements.

### 4.4 Multi-Vector / ColBERT Support in Qdrant

Qdrant has first-class support for ColBERT-style multi-vector embeddings:

- `multivector_config` with `MAX_SIM` comparator on the collection.
- Each point stores a variable-length list of vectors (one per token/patch).
- MaxSim computes the maximum similarity between each query vector and all stored vectors, then sums.
- **HNSW is disabled for MaxSim** (Qdrant sets `m=0` internally) because the distance metric doesn't satisfy triangle inequality. Searches use filtered scan + quantization instead.
- For ColPali integration: store page-level multi-vectors directly. Qdrant handles the MaxSim computation natively.

**Performance implication:** Without HNSW, MaxSim search is slower than standard vector search. Mitigation strategies:
- Use payload filters aggressively (company_id, document_type, equipment_model) to reduce scan scope.
- Enable scalar quantization on multi-vectors for faster distance computation.
- Consider a two-stage pipeline: standard vector search for candidate retrieval, MaxSim reranking on a small candidate set.

### 4.5 Hybrid Search Architecture

The v1.0 research decided on dense + BM25 + RRF. Here is deeper optimization:

**Reciprocal Rank Fusion (RRF) tuning:**
- Formula: `RRF_score = sum(1 / (k + rank_i))` where `k` is a constant (default 60).
- Lower `k` values (20--40) amplify the influence of top-ranked results.
- Higher `k` values (60--100) give more weight to consistency across retrieval methods.
- For HVAC queries: `k=40` is a good starting point because exact terminology matches (BM25) should be heavily weighted.

**Oversampling for recall:**
- Retrieve 3--5x the final top-K from each retrieval method before fusion.
- Example: for top-5 final results, retrieve top-15 from dense search and top-15 from BM25, then fuse.

**Cross-encoder reranking (optional, v1.1+):**
- After RRF fusion, run top-N candidates through a cross-encoder for final reranking.
- Significant accuracy improvement (10--15% on retrieval benchmarks) at the cost of latency.
- Use a small cross-encoder model (e.g., cross-encoder/ms-marco-MiniLM-L-6-v2) to keep latency under 50ms for N=20 candidates.
- Can run client-side or as a serverless function.

### 4.6 Pre-Fetching and Caching

**Session-aware pre-fetching:**
- When a session starts, pre-fetch top articles for the identified equipment model/type.
- Cache the pre-fetched embeddings in Upstash Redis with a session-scoped TTL.
- During the session, query the cache first, fall back to Qdrant.

**Semantic cache (query-level):**
- Cache query embedding > result mapping in Redis.
- On new query, compute embedding similarity against cached query embeddings.
- If similarity > 0.95, return cached results (avoid Qdrant round-trip entirely).
- TTL: 1 hour for session-scoped cache, 24 hours for global cache.

**Equipment-model indexes:**
- Create Qdrant payload indexes on `equipment_manufacturer` and `equipment_model`.
- Queries that include equipment context use these filters to narrow the search space before vector similarity.

### 4.7 Latency Budget Breakdown

Target: Sub-100ms total retrieval time.

| Stage | Budget | Optimization |
|-------|--------|-------------|
| Query embedding | 15--25ms | Gemini embedding API; batch if possible |
| Qdrant search (quantized) | 10--20ms | Scalar quantization in RAM, payload pre-filtering |
| BM25 search | 5--10ms | Qdrant sparse vectors or external BM25 index |
| RRF fusion | 1--2ms | In-memory computation |
| Reranking (optional) | 20--40ms | Small cross-encoder, only top-20 candidates |
| Network overhead | 10--15ms | Qdrant in same region (EU Frankfurt) |
| **Total** | **61--112ms** | Without reranking: 41--72ms |

---

## 5. Knowledge Base Management Dashboard

### 5.1 Core Dashboard Features

Based on analysis of Document360, SearchUnify, Guru, Atlas.so, and Tettra:

**Content Management:**
- Article CRUD with rich text editor (Markdown + embedded media).
- Bulk upload (drag-and-drop folder of PDFs/manuals).
- Version history with diff view per article.
- Category/tag management with hierarchical taxonomy.
- Article status workflow: Draft > Review > Published > Archived.
- Duplicate detection (flag articles with > 0.9 semantic similarity).

**Search Analytics:**
- Top queries (what are technicians searching for?).
- Zero-result queries (what's missing from the KB?).
- Click-through rates (which results are actually useful?).
- Query-to-resolution time (how quickly does the KB answer questions?).
- Search funnel: query > results shown > result clicked > problem resolved.

**Knowledge Health Metrics:**
- **Coverage score:** Percentage of known equipment models/error codes that have KB articles.
- **Freshness score:** Percentage of articles updated within their expected freshness window.
- **Quality score:** Average validation status across all articles (auto-extracted vs verified vs expert-confirmed).
- **Gap score:** Number of unanswered questions / total queries.
- **Conflict count:** Number of unresolved knowledge conflicts awaiting admin review.

### 5.2 Coverage and Gap Visualization

**Gap Detection Methods:**
- **Zero-result tracking:** Every query that returns no results is logged with context (equipment type, error code, symptom description).
- **Low-confidence tracking:** Queries where the top result similarity is below a threshold (e.g., 0.7) indicate weak coverage.
- **Session failure correlation:** If a session ends without resolution (technician escalates to human expert), analyze the queries made during that session to identify KB gaps.
- **Equipment coverage matrix:** Cross-reference the company's equipment inventory against KB articles. Highlight equipment with no associated knowledge.

**Visualization Patterns:**
- **Heat map:** Equipment model x Knowledge category matrix, colored by coverage (green/yellow/red).
- **Trend line:** Gap count over time (should decrease as KB grows).
- **Sunburst chart:** Hierarchical view of knowledge categories with coverage percentage at each level.
- **Unanswered questions queue:** Sorted by frequency and recency, with one-click "create article from question" action.

### 5.3 Analytics Dashboard Components

**For Business Owners / Admins:**
- Total KB articles, growth rate, articles added per week.
- Knowledge utilization: % of sessions that used KB, avg articles retrieved per session.
- Top contributing technicians (gamification potential).
- Cost metrics: estimated time saved per session due to KB (based on resolution time reduction).
- Compliance status: % of safety-critical articles reviewed within required window.

**For Team Leads:**
- Team-level metrics: which technicians use KB most/least, which equipment types generate most queries.
- Pending review queue: articles awaiting validation, sorted by priority.
- Knowledge freshness alerts: articles past their review-by date.
- Session-to-knowledge pipeline: recent sessions with extractable knowledge, awaiting processing.

**For Technicians (Mobile):**
- Personal bookmarks and recently accessed articles.
- "Did this help?" feedback on retrieved articles (thumbs up/down).
- Contribution history: articles they've contributed to or verified.
- Offline cache status: which articles are available offline.

### 5.4 Bulk Upload and Document Processing

- Drag-and-drop interface for single files or entire folders.
- Supported formats: PDF, DOCX, XLSX, images (JPEG, PNG), plain text.
- Upload progress with per-document status: Queued > Processing > Indexed > Failed.
- Preview: after processing, show extracted content for review before publishing.
- Metadata auto-detection: attempt to extract equipment model, manufacturer, document type from content.
- Batch operations: select multiple documents for category assignment, tagging, deletion.

### 5.5 Version Control and Audit Trail

- Every article change creates a new version with timestamp, author, and change summary.
- Diff view between any two versions (text diff + metadata diff).
- Rollback to any previous version with one click.
- Audit log: who accessed what, when, from which session.
- Change notifications: subscribe to article changes, get notified when related articles are updated.
- EU compliance: full data lineage from source (session transcript / manual upload) through extraction to published article.

### 5.6 Role-Based Access Control

Leveraging Better Auth's organization plugin:

| Role | KB Permissions |
|------|---------------|
| **Owner** | Full access, billing, delete company KB |
| **Admin** | Manage all articles, approve/reject, bulk operations, view analytics |
| **Team Lead** | Manage team articles, approve light-review items, view team analytics |
| **Technician** | Read articles, submit feedback, contribute via sessions |
| **Viewer** | Read-only access to published articles |

---

## 6. Open-Source Tools Landscape

### 6.1 Document Processing

| Tool | Stars | License | Strengths | Weaknesses | HVAC Fit |
|------|-------|---------|-----------|------------|----------|
| **Docling (IBM)** | 37K+ | MIT | Best-in-class PDF parsing, table extraction (97.9%), GraniteDocling-258M VLM, graph extraction | Python-only | Excellent -- handles HVAC manuals with diagrams and tables |
| **Unstructured** | 9K+ | Apache 2.0 | Wide format support, production API available, LangChain integration | Heavier, commercial pressure | Good -- solid alternative if Docling doesn't fit |
| **marker** | 18K+ | GPL-3.0 | Fastest PDF-to-Markdown, 10x faster than nougat | GPL license, less structured output | Good for text-heavy manuals, not for tables |
| **surya** | 15K+ | GPL-3.0 | OCR + layout detection, 90+ languages | GPL license | Good multilingual OCR fallback |
| **Zerox** | 7K+ | MIT | Simple API, uses vision models for parsing | Less accurate on complex layouts | Lightweight option for simple docs |

### 6.2 Embedding and Retrieval

| Tool | Purpose | Fit |
|------|---------|-----|
| **ColPali / ColQwen** | Multimodal document embeddings (image-level, multi-vector) | Essential for HVAC diagrams |
| **Qdrant** | Vector database with multi-vector, hybrid search, payload filtering | Already selected; excellent fit |
| **fastembed** | Lightweight embedding library (Qdrant team) | Local embedding option for offline/edge scenarios |
| **BGE-M3** | Multilingual dense + sparse + ColBERT embeddings in one model | Alternative to separate dense + BM25; handles 100+ languages |

### 6.3 Knowledge Graph Tools

| Tool | Stars | License | Purpose |
|------|-------|---------|---------|
| **docling-graph** | 700+ | MIT | Document-to-knowledge-graph via Docling output |
| **NetworkX** | 15K+ | BSD | Python graph library, used by docling-graph |
| **LlamaIndex KnowledgeGraph** | -- | MIT | LLM-powered knowledge graph construction from text |
| **Neo4j Community** | 14K+ | GPL-3.0 | Full graph database (overkill for v1, consider for v2+) |

### 6.4 KB Frameworks and Platforms

| Tool | Type | Fit for Aucta |
|------|------|---------------|
| **Mintlify** | Docs-as-code platform | Virtual filesystem pattern applicable, not the tool itself |
| **Docusaurus** | Static docs generator | Pattern reference for KB navigation, not for dynamic KB |
| **Outline** | Open-source wiki (Node.js) | Architecture reference for collaborative KB editing UI |
| **BookStack** | Open-source wiki (PHP) | Reference for hierarchical knowledge organization |

### 6.5 Search and Retrieval Frameworks

| Framework | Purpose | Integration |
|-----------|---------|-------------|
| **LlamaIndex** | RAG framework with ingestion + retrieval pipelines | Python; Docling integration available |
| **LangChain** | LLM application framework with RAG support | Python + JS; Docling/Qdrant integrations |
| **Haystack** | End-to-end NLP/RAG framework (deepset) | Python; strong document processing pipeline |
| **Verba** | RAG application with Weaviate (Golden Retriever) | Reference architecture, not directly usable with Qdrant |

---

## 7. Recommendations for Aucta

### 7.1 Architecture Decisions (v1.1+)

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| **Multi-tenant model** | Pool (v1.0) > Bridge (v1.1+) > Silo (enterprise) | Start simple, migrate large tenants to dedicated collections as needed |
| **Knowledge layers** | Master KB + Company KB + Session-scoped | Master KB provides cold-start value; Company KB is the self-learning layer |
| **Graph layer** | Payload-based relationships first, full graph in v2+ | Qdrant payload arrays (`related_ids`, `equipment_hierarchy`) cover 80% of graph needs without new infrastructure |
| **Document processing** | Docling (Python sidecar) + ColPali | Single Python service handles both parsing and multimodal embedding |
| **Retrieval strategy** | Dense + BM25 + RRF + optional cross-encoder reranking | Cross-encoder adds 20-40ms but improves accuracy 10-15% |
| **Quantization** | Scalar (int8) + asymmetric rescoring | 4x memory reduction, 0.99 accuracy, 2x speed |
| **Self-learning pipeline** | PIPA-style extraction > quality scoring > tiered review | Automatic extraction with human-in-the-loop for low-confidence items |
| **Dashboard** | Next.js dashboard with search analytics, coverage gaps, health scoring | tRPC SSE for real-time metrics updates |

### 7.2 Implementation Priority (Phased)

**Phase 1 (v1.0 -- already planned):**
- Single Qdrant collection with `company_id` filtering.
- Dense + BM25 hybrid search with RRF.
- Manual document upload with basic processing.
- Article CRUD in dashboard.
- Session auto-ingest pipeline (Inngest).

**Phase 2 (v1.1 -- Market-Ready):**
- Docling integration for advanced PDF/manual processing.
- ColPali multimodal embeddings for diagrams and schematics.
- Quality scoring pipeline for auto-extracted knowledge.
- Human-in-the-loop review workflow in dashboard.
- Search analytics (top queries, zero-result tracking).
- Knowledge health dashboard (coverage, freshness, gaps).
- Equipment coverage matrix.

**Phase 3 (v1.2+):**
- Cross-encoder reranking for improved retrieval accuracy.
- Semantic query caching (Upstash Redis).
- Session-aware pre-fetching.
- Knowledge conflict detection and resolution workflow.
- Industry template library for cold-start.
- Bridge model for large tenants (separate Qdrant collections).

**Phase 4 (v2.0+):**
- Full knowledge graph (docling-graph + NetworkX or Neo4j).
- Troubleshooting chain reasoning via graph traversal.
- Equipment hierarchy graph with part-of/requires relationships.
- Personalized knowledge recommendations per technician.
- Knowledge decay and automated freshness enforcement.

### 7.3 Python Sidecar Architecture

Both Docling and ColPali require Python. A single sidecar service handles both:

```
[Document Upload] --> [Inngest Job] --> [Python Sidecar API]
                                              |
                                    +---------+---------+
                                    |                   |
                              [Docling Parse]    [ColPali Embed]
                                    |                   |
                                    v                   v
                            [Structured Text]   [Multi-vectors]
                                    |                   |
                                    +------> [Qdrant] <-+
```

- Deploy as a lightweight FastAPI service.
- Health check endpoint for monitoring.
- Async processing: Inngest sends work, polls for completion.
- Horizontal scaling: multiple sidecar replicas for bulk upload bursts.
- Resource isolation: CPU/memory limits per container to prevent runaway document processing.

### 7.4 Key Metrics to Track

| Metric | Definition | Target |
|--------|-----------|--------|
| **Retrieval latency (P95)** | Time from query to results returned | < 100ms |
| **KB utilization rate** | % of sessions that retrieve at least one KB article | > 60% |
| **Resolution rate** | % of sessions resolved without human escalation | > 80% |
| **Knowledge growth rate** | New verified articles per week per company | > 5 |
| **Gap closure rate** | Unanswered questions resolved per week | > 50% |
| **Freshness compliance** | % of articles within freshness window | > 90% |
| **Extraction precision** | % of auto-extracted knowledge confirmed correct | > 85% |

---

## 8. Sources

### Academic Papers
- "From Transcripts to AI Agents" (PIPA framework) -- arxiv 2602.15859
- "AI Knowledge Assist" (QA extraction + clustering) -- arxiv 2510.08149
- "DySECT: Dynamic Self-Evolving Extraction & Curation Toolkit" -- arxiv 2603.06915

### Multi-Tenant RAG
- AWS multi-tenant RAG reference architecture
- Microsoft Azure AI Search multi-tenancy patterns
- Mavik Labs: multi-tenant RAG isolation models (Silo/Pool/Bridge)
- Milvus partition key documentation

### Document Processing
- Docling (IBM): https://github.com/DS4SD/docling -- MIT license, 37K+ stars
- Docling ecosystem: docling-core, docling-parse, docling-serve, docling-ibm-models, docling-sdg, docling-mcp, docling-graph
- GraniteDocling-258M: IBM's document understanding VLM

### Multimodal Retrieval
- ColPali: https://github.com/illuin-tech/colpali -- vision-language document retrieval
- ColQwen 2.5: Qwen2.5-VL backbone variant with better multilingual support
- ColBERT late interaction / MaxSim scoring

### Vector Database Optimization
- Qdrant HNSW optimization guide: https://qdrant.tech/documentation/guides/optimize/
- Qdrant quantization documentation: scalar, product, binary quantization
- Qdrant multi-vector configuration: multivector_config with MAX_SIM
- Qdrant hybrid search: dense + sparse + RRF fusion
- Asymmetric quantization (v1.15.0+)

### Knowledge Base Platforms (Pattern References)
- Document360: search analytics, gap detection, coverage scoring
- SearchUnify: cognitive search analytics, intent detection
- Atlas.so: AI-powered KB with auto-categorization
- Guru: team knowledge management, verification workflows
- Tettra: internal KB with Slack integration

### Self-Learning / Knowledge Extraction
- Memori: semantic triple extraction from AI conversations
- Knowledge atomization patterns (5 decomposition strategies)
- SolidNumber: industry template cold-start (52 templates)
