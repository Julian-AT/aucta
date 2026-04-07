# Phase 5: Knowledge Base - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 05-knowledge-base
**Areas discussed:** Article lifecycle, Search & retrieval, Content structure, Embedding strategy

---

## Article Lifecycle

### Ingestion Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-ingest all sessions | Every completed session auto-generates candidate articles via Inngest | ✓ |
| Filtered sessions only | Only sessions rated 3+ stars or with 2+ findings | |
| Manual trigger only | Technician taps 'save to KB' button | |

**User's choice:** Auto-ingest all sessions
**Notes:** None

### Verification Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Always manual review | Articles start as 'unverified', require manager/expert to promote | ✓ |
| Auto-promote high-confidence | High-confidence articles auto-promote to 'technician_reviewed' | |
| Publish-then-review | All articles auto-publish as 'unverified', usable immediately | |

**User's choice:** Always manual review
**Notes:** None

### Compilation Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-merge related sessions | LLM merges findings into one authoritative article | ✓ |
| One article per session | Each session produces its own article | |

**User's choice:** Auto-merge related sessions
**Notes:** None

### Manual Knowledge Input

| Option | Description | Selected |
|--------|-------------|----------|
| Structured text input via API | Plain text + metadata, system structures into article format | |
| Document upload (PDF/images) | ColPali processes into articles | |
| Full multimodal via Gemini | Use Gemini embedding for text, documents, video, audio | ✓ |

**User's choice:** Other — "We can use Gemini's Embedding 2 and allow for multimodal knowledge (text, documents, video, audio)"
**Notes:** User pivoted from ColPali to Gemini embedding model for multimodal support. This eliminates the Python sidecar requirement entirely.

### Multimodal Processing

| Option | Description | Selected |
|--------|-------------|----------|
| Text extraction first, then embed | Extract text from non-text content via Gemini, then embed text | |
| Full multimodal pipeline | Accept all formats, extract transcripts/descriptions via Gemini | ✓ |

**User's choice:** Full multimodal pipeline
**Notes:** None

### Embedding Model

| Option | Description | Selected |
|--------|-------------|----------|
| Gemini embeddings + Qdrant BM25 | Gemini text-embedding-004 for dense, Qdrant BM25 for sparse | |
| ColPali (Python sidecar) | Vision-language embeddings for technical manuals | |
| Gemini embedding 2 preview | gemini-embedding-exp-03-07, native multimodal, 3072 dimensions | ✓ |

**User's choice:** Other — "No lets use gemini-embedding-2-preview, it supports all those modalities and has an SDK"
**Notes:** User specifically requested gemini-embedding-2-preview for native multimodal embedding. 3072 dimensions. Eliminates ColPali entirely.

---

## Search & Retrieval

### Search Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: dense + BM25 | Dense semantic + BM25 sparse via Reciprocal Rank Fusion | ✓ |
| Dense only | Dense semantic search only | |

**User's choice:** Hybrid: dense + BM25
**Notes:** None

### Source Attribution

| Option | Description | Selected |
|--------|-------------|----------|
| System prompt injection | Confidence level in system prompt, Gemini phrases naturally | ✓ |
| Forced prefix in tool response | Mandatory attribution prefix string | |

**User's choice:** System prompt injection
**Notes:** None

### Result Count

| Option | Description | Selected |
|--------|-------------|----------|
| Top 3 | Keeps context window lean | ✓ |
| Top 5 | More context but more tokens | |

**User's choice:** Top 3
**Notes:** None

---

## Content Structure

### Equipment Taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Brand > Model > Procedure | Matches how technicians think | ✓ |
| System > Procedure > Brand | Cross-brand knowledge surfaces easier | |

**User's choice:** Brand > Model > Procedure
**Notes:** None

### Article Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Rich structured articles | Title, summary, body, metadata, confidence, sources, tags, version history | ✓ |
| Lightweight entries | Title, body, equipment, confidence only | |

**User's choice:** Rich structured articles
**Notes:** None

### Health Monitoring

| Option | Description | Selected |
|--------|-------------|----------|
| Automated health checks | Background job detects coverage gaps, stale articles, conflicts | ✓ |
| On-demand health queries | Stats available via API but no proactive detection | |

**User's choice:** Automated health checks
**Notes:** None

---

## Embedding Strategy

### Qdrant Collections

| Option | Description | Selected |
|--------|-------------|----------|
| Single collection, named vectors | One collection with "dense" + "sparse" named vectors | ✓ |
| Per-org collections | Separate collections per org | |

**User's choice:** Single collection, named vectors
**Notes:** None

### Chunking Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Full article embedding | Embed full article as one vector, Gemini supports up to 2048 tokens | ✓ |
| Section-level chunking | Split into sections, embed each | |

**User's choice:** Full article embedding
**Notes:** User noted "the gemini embeddings 2 support 3072 dimensions"

### Launch Multimodal Support

| Option | Description | Selected |
|--------|-------------|----------|
| Text + images + PDF | Accept at launch, audio/video deferred | ✓ |
| Text-only first | Add multimodal later | |

**User's choice:** Text + images + PDF
**Notes:** None

---

## Claude's Discretion

- Inngest job configuration and retry strategies
- Qdrant collection schema details
- BM25 tokenization and sparse vector generation
- Article deduplication heuristics
- Verification queue data model
- Health monitoring thresholds
- Gemini embedding model preview fallback strategy

## Deferred Ideas

- Audio/video multimodal knowledge input
- Dashboard UI for KB management (DASH-05)
- Cross-organization anonymized learning (ADV-09)
- ColPali fallback if Gemini embeddings insufficient
- Real-time KB update notifications
- Per-customer embedding model selection
