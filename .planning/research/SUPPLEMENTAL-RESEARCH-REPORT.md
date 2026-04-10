# Supplemental Research Report: Findings Beyond Existing Research

**Date:** 2026-04-10
**Scope:** Supplements existing research in `REALTIME-AI-INFERENCE.md`, `DASHBOARD-AND-DX-RESEARCH.md`, and `SELF-LEARNING-KB-RESEARCH.md`
**Status:** Research only -- no implementation code

---

## Table of Contents

1. [Gemini Inference Tiers (NEW)](#1-gemini-inference-tiers)
2. [Virtual Filesystem Pattern: just-bash and ChromaFs (NEW)](#2-virtual-filesystem-pattern)
3. [expo-two-way-audio for Bidirectional Audio Streaming (NEW)](#3-expo-two-way-audio)
4. [Qdrant 1.16 Tiered Multitenancy (NEW)](#4-qdrant-116-tiered-multitenancy)
5. [Karpathy's LLM Wiki / Compiled Knowledge Base Pattern (NEW)](#5-karpathys-llm-wiki)
6. [Best-in-Class Real-Time AI Mobile Apps (NEW)](#6-best-in-class-mobile-apps)
7. [Open-Source Tools Worth Adopting (NEW)](#7-open-source-tools)
8. [Cross-Cutting Recommendations for Aucta](#8-cross-cutting-recommendations)

---

## 1. Gemini Inference Tiers

**Gap filled:** The existing `REALTIME-AI-INFERENCE.md` covers Gemini Live API optimization, but does not mention the inference tier system (Standard / Priority / Flex) or implicit caching on 2.5+ models.

### 1.1 Three-Tier Inference System

Google now offers three distinct inference tiers for Gemini API:

| Feature | Priority | Standard | Flex | Batch |
|---------|----------|----------|------|-------|
| **Pricing** | 75-100% more than Standard | Full price | 50% discount | 50% discount |
| **Latency** | Seconds | Seconds to minutes | Minutes (1-15 min target) | Up to 24 hours |
| **Reliability** | High (non-sheddable) | High / medium-high | Best-effort (sheddable) | High (for throughput) |
| **Interface** | Synchronous | Synchronous | Synchronous | Asynchronous |

**Source:** https://ai.google.dev/gemini-api/docs/flex-inference, https://ai.google.dev/gemini-api/docs/priority-inference (updated 2026-04-08)

### 1.2 Priority Tier -- For Live Sessions

Priority inference is a premium tier designed for business-critical, user-facing workloads. Key properties:

- **Non-sheddable capacity:** Priority traffic is never preempted.
- **Graceful downgrade:** If Priority limits are exceeded, overflow requests are automatically downgraded to Standard tier (not rejected). Downgraded requests are billed at Standard rate.
- **Rate limits:** Default is 0.3x the standard rate limit per model/tier.
- **Availability:** Tier 2 and Tier 3 billing accounts only.
- **Detection:** Check `x-gemini-service-tier` response header to detect downgrades.

```typescript
// TypeScript usage with @google/genai
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

const result = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Diagnose this HVAC compressor issue...",
  config: { serviceTier: "priority" },
});

// Detect graceful downgrade
if (result.sdkHttpResponse.headers.get("x-gemini-service-tier") === "standard") {
  console.warn("Priority limit exceeded, processed at Standard tier.");
}
```

**Aucta relevance:** Priority tier should be evaluated for the standard Gemini 2.5 Flash calls used during tool invocations (error code lookup, KB search). The Live API uses a different connection model (WebSocket), so it is unclear whether `service_tier` applies to Live sessions. This needs verification with the Live API team or through testing.

### 1.3 Flex Tier -- For Background Knowledge Processing

Flex inference offers 50% cost savings for latency-tolerant workloads:

- **Sheddable capacity:** Flex requests may be preempted during traffic spikes.
- **No automatic fallback:** The system will NOT upgrade Flex to Standard automatically. Client must implement retry logic.
- **Error codes:** 503 (Service Unavailable) or 429 (Too Many Requests) during congestion.
- **Timeout recommendation:** Set client-side timeouts to 10 minutes or more.

```typescript
// Flex usage for background KB compilation
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Extract structured knowledge from this HVAC manual...",
  config: {
    serviceTier: "flex",
    httpOptions: { timeout: 600000 }, // 10 min timeout
  },
});
```

**Aucta relevance:** Flex tier is ideal for:
- Knowledge base article compilation (Karpathy Wiki pattern, see Section 5)
- Session transcript processing and knowledge extraction (PIPA pipeline)
- Batch embedding generation
- Quality scoring and conflict resolution in the KB pipeline

At 50% discount, a 15-minute session's post-processing cost drops from ~$0.15 to ~$0.075.

### 1.4 Implicit Caching on Gemini 2.5+

Gemini 2.5 and later models support **implicit caching** -- the API automatically caches common prompt prefixes across requests. This means:

- System instructions that are repeated across sessions are cached automatically.
- No explicit `CachedContent` object creation needed.
- Cached tokens are billed at a reduced rate (typically 75% off).
- Works alongside explicit context caching (manual `CachedContent` with TTL).

**Aucta relevance:** The system instruction for the HVAC copilot is identical across all sessions for a given company. Implicit caching means the ~2K-5K tokens of system instruction + tool definitions will be cached automatically after the first session, reducing per-session input costs by up to 75% for that prefix.

### 1.5 Explicit Context Caching

For recurring queries over the same large document (e.g., a specific HVAC equipment manual):

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

// Create a cached content object for a frequently referenced manual
const cache = await ai.caches.create({
  model: "gemini-2.5-flash",
  config: {
    contents: [{ role: "user", parts: [{ text: hvacManualContent }] }],
    systemInstruction: "You are an HVAC expert...",
    ttl: "3600s", // 1-hour TTL
  },
});

// Use cached content in subsequent requests
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "What is the error code E3 on this unit?",
  config: { cachedContent: cache.name },
});
```

**Source:** https://ai.google.dev/gemini-api/docs/caching

---

## 2. Virtual Filesystem Pattern

**Gap filled:** This is an entirely new topic not covered in any existing research file.

### 2.1 Vercel's just-bash: Filesystem-as-Context for Agents

Vercel Labs open-sourced `bash-tool` (npm: `bash-tool`), a TypeScript reimplementation of bash that supports `grep`, `cat`, `ls`, `find`, `cd`, and piping. The core insight: LLMs have been trained on massive amounts of code navigation, so filesystem operations are "native" model capabilities.

**Key results from Vercel's sales call summarization agent:**
- Cost reduction: ~$1.00 to ~$0.25 per call on Claude Opus 4.5
- Output quality improved (model explores context on-demand instead of being force-fed)
- Same pattern powers `d0`, Vercel's text-to-SQL agent

**Architecture pattern:**
```
Agent receives task
    |
Explores filesystem (ls, find)
    |
Searches for relevant content (grep, cat)
    |
Sends context + request to LLM
    |
Returns structured output
```

**Why filesystems beat RAG for structured data:**
- `grep -r "pricing objection" transcripts/` returns exact matches (vector search returns fuzzy approximations)
- Agent loads files on demand -- context stays minimal
- Hierarchical structure maps naturally to domains (customers/tickets/conversations)
- Debuggability: you can see exactly which files the agent read and which commands it ran

**Source:** https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash (2026-01-09)
**Package:** https://www.npmjs.com/package/bash-tool

### 2.2 Mintlify's ChromaFs: Virtual Filesystem over Vector DB

Mintlify built ChromaFs, a virtual filesystem backed by their existing Chroma vector database. It powers their documentation assistant serving 30,000+ conversations/day.

**Architecture:**

| Component | Role |
|-----------|------|
| just-bash | Parses commands, handles piping and flags |
| ChromaFs (IFileSystem impl) | Translates filesystem calls into Chroma queries |
| Chroma DB | Stores chunked documentation, path tree metadata |
| Redis | Bulk prefetch cache for grep optimization |

**Performance comparison:**

| Metric | Real Sandbox | ChromaFs |
|--------|-------------|----------|
| P90 Boot Time | ~46 seconds | ~100 milliseconds |
| Marginal Compute Cost | ~$0.0137/conversation | ~$0 (reuses existing DB) |
| Search Mechanism | Linear disk scan | DB metadata query |

**How ChromaFs works:**

1. **Path tree bootstrapping:** A gzipped JSON document (`__path_tree__`) in Chroma stores all file paths with access control metadata. On init, decompressed into `Set<string>` of paths and `Map<string, string[]>` of directory-to-children mappings. `ls`, `cd`, `find` resolve in local memory with no network calls.

2. **Access control:** Each path entry has `isPublic` and `groups` fields. Before building the file tree, ChromaFs prunes paths based on the user's session token. Pruned paths are invisible to the agent -- it cannot access or reference them.

3. **Page reassembly:** When the agent runs `cat /auth/oauth.mdx`, ChromaFs fetches all chunks with matching `page` slug, sorts by `chunk_index`, and joins into full page. Results are cached.

4. **Grep optimization (critical for performance):**
   - Chroma acts as **coarse filter** (identifies which files might contain the match via `$contains` or `$regex`)
   - Matching chunks are `bulkPrefetch`-ed into Redis
   - The grep command is rewritten to target only matched files
   - Handed back to just-bash for **fine filter** in-memory execution
   - Large recursive queries complete in milliseconds

5. **Read-only enforcement:** All write operations throw `EROFS`. The system is stateless -- no session cleanup, no risk of corruption.

**Source:** https://www.mintlify.com/blog/how-we-built-a-virtual-filesystem-for-our-assistant (2026-03-24)

### 2.3 Applicability for Aucta's Per-Company Knowledge Base

The ChromaFs pattern maps directly to Aucta's per-company KB architecture:

| ChromaFs Concept | Aucta KB Equivalent |
|------------------|---------------------|
| Chroma collection | Qdrant collection with `company_id` payload filter |
| `__path_tree__` | KB article hierarchy (categories/articles) |
| `isPublic` / `groups` | Company-level + role-level access control |
| `page` slug | Article ID / knowledge atom ID |
| `chunk_index` | Qdrant point ordering within article |

**Proposed Aucta implementation:**

```
/kb/
  /company-{id}/
    /manuals/
      carrier-infinity-24ANB1.md
      trane-xr15-installation.md
    /error-codes/
      e1-low-refrigerant.md
      e3-compressor-overheat.md
    /procedures/
      annual-maintenance-checklist.md
      refrigerant-recovery-procedure.md
    /session-learnings/
      2024-01-15-compressor-replacement-trick.md
```

The Gemini Live API agent would have a `search_knowledge_base` tool that:
1. Maps the query to filesystem commands internally
2. Uses Qdrant as the backing store (like ChromaFs uses Chroma)
3. Returns precise, full-page results instead of chunk snippets
4. Respects company-level isolation via payload filtering

**Key advantage over pure RAG:** When a technician asks "what's the exact torque spec for the TXV on the Carrier Infinity?", the filesystem pattern lets the agent `grep -r "torque" /kb/company-123/manuals/carrier-infinity*` for an exact match, rather than relying on semantic similarity which might return related-but-wrong specs from a different model.

---

## 3. expo-two-way-audio

**Gap filled:** The existing `REALTIME-AI-INFERENCE.md` mentions audio pipeline challenges and `react-native-audio-api` but does not cover `expo-two-way-audio`.

### 3.1 Overview

`@speechmatics/expo-two-way-audio` is an Expo native module for bidirectional PCM audio streaming on iOS and Android.

**Repository:** https://github.com/speechmatics/expo-two-way-audio
**npm:** `@speechmatics/expo-two-way-audio`
**License:** MIT
**Last updated:** January 2025
**Stars:** 24 | **Forks:** 29
**Languages:** Swift (47.5%), Kotlin (41.4%), TypeScript (8.9%)

### 3.2 Features

- Request audio recording permissions
- Capture microphone audio with **Acoustic Echo Cancellation (AEC)** in PCM format: 1 channel, 16-bit, 16kHz
- Play audio in PCM format: 1 channel, 16-bit, 16kHz
- Volume level monitoring for both input and output (float 0-1)
- iOS: Microphone mode selection
- Playback through main speaker unless external audio connected

### 3.3 Usage Pattern

```typescript
import {
  initialize,
  playPCMData,
  toggleRecording,
  useExpoTwoWayAudioEventListener,
  useMicrophonePermissions,
} from "@speechmatics/expo-two-way-audio";
import { Buffer } from "buffer";

// 1. Request permissions
const [micPermission, requestMicPermission] = useMicrophonePermissions();

// 2. Initialize
useEffect(() => {
  initialize();
}, []);

// 3. Receive microphone data
useExpoTwoWayAudioEventListener(
  "onMicrophoneData",
  useCallback((event) => {
    // event.data is base64-encoded PCM 16kHz 16-bit mono
    // Send to Gemini Live API WebSocket
    websocket.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: "audio/pcm;rate=16000",
          data: event.data,
        }],
      },
    }));
  }, []),
);

// 4. Play received audio
function onGeminiAudioResponse(base64Audio: string) {
  // Gemini outputs 24kHz -- need to resample to 16kHz for playback
  const resampled = resample24kTo16k(base64Audio);
  const buffer = Buffer.from(resampled, "base64");
  playPCMData(new Uint8Array(buffer));
}

// 5. Start recording
toggleRecording(true);
```

### 3.4 Critical Gaps and Gotchas

1. **Sample rate mismatch:** expo-two-way-audio operates at 16kHz for both input and output. Gemini Live API outputs at 24kHz. A resampling step is required for playback. Options:
   - Client-side resampling in JS (adds latency)
   - Fork the module and add 24kHz playback support natively (better performance)
   - Use a Web Audio API resampler via `react-native-audio-api`

2. **AEC only works on real devices:** Acoustic Echo Cancellation, noise reduction, and microphone modes do not work on simulators. Must use `npx expo run:ios --device` or `npx expo run:android --device`.

3. **Low activity:** Only 1 contributor, 16 commits, no releases published, last commit January 2025. This is a risk factor. Plan to fork and maintain internally.

4. **No Expo SDK 55 verification:** The module was built for an earlier Expo SDK. Compatibility with SDK 55 (React Native 0.83, New Architecture default) needs testing.

5. **Android permissions required:** `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS` in `app.json`.

### 3.5 Comparison with Alternatives

| Feature | expo-two-way-audio | react-native-audio-api | expo-audio (new) |
|---------|-------------------|----------------------|-----------------|
| PCM streaming | Native (16kHz) | Via Web Audio nodes | Unknown |
| AEC | Built-in | Manual setup | Unknown |
| Bidirectional | Yes | Play only (no mic) | Record only |
| Expo native module | Yes | No (bare RN) | Yes |
| Maturity | Pre-release | Pre-1.0 (v0.11.7) | Brand new in SDK 55 |
| 24kHz support | No (16kHz only) | Yes (configurable) | Unknown |

**Recommendation for Aucta:** Fork `expo-two-way-audio` and extend it:
- Add configurable sample rates (16kHz input, 24kHz output) to eliminate JS resampling
- Test against Expo SDK 55 / RN 0.83 New Architecture
- Add Android foreground service integration for background recording (currently needs `@notifee/react-native` separately)

**Source:** Google AI Forum discussion confirms this is the community's go-to solution for Gemini Live + Expo: https://discuss.ai.google.dev/t/best-practices-for-playing-gemini-live-apis-24khz-pcm-audio-stream-in-expo-react-native/95569

---

## 4. Qdrant 1.16 Tiered Multitenancy

**Gap filled:** The existing `SELF-LEARNING-KB-RESEARCH.md` covers Pool Model vs Silo Model multitenancy, but does not mention Qdrant 1.16's tiered multitenancy with tenant promotion, ACORN search, or inline storage.

### 4.1 Tiered Multitenancy with Tenant Promotion

Qdrant 1.16 (released November 2025) introduces a hybrid approach that combines payload-based and shard-based multitenancy in a single collection:

**Core concepts:**

- **User-defined sharding:** Named shards within a collection. Large tenants get dedicated shards; small tenants share a "fallback" shard.
- **Fallback shards:** Special routing mechanism. Requests go to a dedicated shard if it exists, or fall back to the shared shard. Unified query interface -- the application does not need to know whether a tenant is dedicated or shared.
- **Tenant promotion:** Mechanism to "promote" tenants from the shared fallback shard to their own dedicated shard. Based on Qdrant's internal shard transfer mechanism -- completely transparent. Both read and write requests continue during promotion.

**Why this matters for Aucta:**

The existing research recommends starting with Pool Model (single collection, `company_id` filter) and migrating to Silo Model for enterprise tenants. Qdrant 1.16 eliminates the need for this migration -- tiered multitenancy handles both cases in one collection:

```
Collection: "knowledge_base"
  |
  +-- Shard: "__fallback__" (shared)
  |     Company A (50 articles)
  |     Company B (30 articles)
  |     Company C (100 articles)
  |
  +-- Shard: "company_D" (dedicated)
  |     Company D (15,000 articles)
  |
  +-- Shard: "company_E" (dedicated)
        Company E (25,000 articles)
```

When Company C grows past a threshold (e.g., 10,000 articles), promote it:

```typescript
// Tenant promotion -- transparent, zero downtime
await qdrantClient.replicatePoints("knowledge_base", {
  shard_key: "__fallback__",
  to_shard_key: "company_C",
  filter: {
    must: [{ key: "company_id", match: { value: "company_C" } }],
  },
});
```

### 4.2 ACORN Search Algorithm

Qdrant 1.16 introduces ACORN (Approximate Closest Neighbor with Refined Navigation) for improved filtered vector search when using multiple filters with weak selectivity.

**How it works:** When direct HNSW neighbors are filtered out, ACORN examines neighbors-of-neighbors (second hop). This dramatically improves accuracy for multi-filter queries.

**Benchmark (5M vectors, 96d, two filters at ~4% selectivity):**

| Search Parameters | Accuracy | Latency |
|-------------------|----------|---------|
| ef=64 + ACORN | **97.20%** | 13.86 ms |
| ef=64 (no ACORN) | 53.34% | 1.25 ms |
| ef=512 (no ACORN) | 71.13% | 3.89 ms |

**Aucta relevance:** When searching the KB with multiple filters (e.g., `company_id` + `equipment_type` + `knowledge_scope`), ACORN prevents accuracy degradation. Enable per-query when using 2+ filters:

```typescript
const results = await qdrantClient.search("knowledge_base", {
  vector: queryEmbedding,
  filter: {
    must: [
      { key: "company_id", match: { value: "company_123" } },
      { key: "equipment_type", match: { value: "heat_pump" } },
    ],
  },
  params: { acorn: true },
  limit: 10,
});
```

### 4.3 Inline Storage for Disk-Efficient Search

Stores quantized vector data directly inside HNSW nodes. This enables efficient disk-based search without loading vectors into RAM.

**Benchmark (1M vectors, 512d CLIP, 2-bit quantization):**

| Setup | RAM | QPS | Accuracy |
|-------|-----|-----|----------|
| Inline storage, low RAM | 430 MiB | **211** | **86.92%** |
| No inline, low RAM | 430 MiB | 20 | 53.32% |
| No inline, index+quant in RAM | 530 MiB | 334 | 53.32% |

**Aucta relevance:** If deploying Qdrant on cost-constrained infrastructure (EU Frankfurt), inline storage allows serving the KB from disk with acceptable performance, reducing memory requirements by ~20%.

### 4.4 Other Notable 1.16 Features

- **Configurable RRF constant `k`:** The existing research recommends RRF for hybrid search (dense + BM25). The `k` parameter is now tunable per query.
- **Conditional updates:** Optimistic concurrency control via `update_filter`. Useful for preventing race conditions during concurrent KB article updates.
- **`text_any` condition:** OR-based full-text matching. Useful for keyword fallback when vector search returns too few results.
- **ASCII folding:** Critical for multilingual text search (German umlauts, Turkish characters, Romanian diacritics). Normalizes "cafe" and "cafe" to match.

**Source:** https://qdrant.tech/blog/qdrant-1.16.x/ (2025-11-19)

---

## 5. Karpathy's LLM Wiki

**Gap filled:** The existing `SELF-LEARNING-KB-RESEARCH.md` covers PIPA, knowledge atomization, and quality scoring, but does not mention Karpathy's compiled knowledge base pattern.

### 5.1 The Compiler Analogy

Andrej Karpathy proposed treating knowledge base construction like compilation:

| Compiler Stage | Knowledge Pipeline Stage |
|----------------|-------------------------|
| Source code | Raw articles, PDFs, session transcripts |
| Compilation | LLM processing and structuring |
| Compiled binary | Structured wiki / knowledge atoms |
| Runtime execution | Querying the knowledge base |
| Compiler errors | LLM flagging gaps or contradictions |

**Core insight:** Most documents are written for humans, not machines. They contain redundancy, implicit context, and narrative structure. "Compiling" them through an LLM produces denser, more structured artifacts optimized for retrieval.

### 5.2 Architecture Layers

**Layer 1: Source Layer** -- Raw inputs (HVAC manuals, session transcripts, technician notes). Quality control here: not every document is worth compiling.

**Layer 2: Compilation Layer** -- LLM processes each document into structured artifacts:
- Atomic fact extraction
- Entity and relationship mapping
- Multi-granularity summarization
- Question-answer pair generation
- Contradiction and gap flagging

**Layer 3: Knowledge Store ("Wiki")** -- Stored artifacts have consistent structure, defined relationships, and clear boundaries. Not chunked raw text -- semantically structured entries authored by the LLM. Think: Wikipedia for your domain, written by an LLM that read your corpus.

**Layer 4: Query Layer** -- At query time, the model reasons over pre-structured knowledge. Less work at runtime because the heavy processing already happened.

### 5.3 Why This Differs from Standard RAG

| Standard RAG | Compiled KB (Karpathy) |
|-------------|------------------------|
| Chunk raw documents | Process documents through LLM |
| Embed chunks | Store structured artifacts |
| Retrieve by similarity | Retrieve structured entries |
| LLM interprets raw text | LLM synthesizes from pre-processed knowledge |

**Advantages:**
- Higher retrieval precision (structured artifacts embed more predictably)
- Lower hallucination risk (model isn't interpreting ambiguous raw text)
- Better multi-document reasoning (facts are already cross-referenced)
- More stable answers (compiled knowledge doesn't change unless recompiled)

**Tradeoff:** Compilation costs compute upfront. But you pay once (or on update), not per query. This is where Gemini Flex tier (50% discount) is ideal.

### 5.4 Incremental Compilation

Like software build systems, you need incremental compilation:
1. Compile only new/changed documents
2. Identify which existing artifacts are affected
3. Update or regenerate those artifacts
4. Propagate changes to dependent entries

This requires a dependency graph tracking which compiled entries draw from which source documents.

### 5.5 Application to Aucta's Self-Learning KB

The Karpathy Wiki pattern complements the PIPA extraction framework already researched:

```
Session transcript (raw)
    |
    v
PIPA extraction (compile step 1) -- identify knowledge candidates
    |
    v
LLM compilation (compile step 2) -- structure into wiki entries
    |
    v
Quality scoring + human review
    |
    v
Knowledge store (Qdrant + structured wiki)
    |
    v
Gemini Live queries at runtime (Layer 4)
```

**Compilation prompt engineering is critical.** The most important prompts are at compile time, not query time:
- What facts should be extracted, at what granularity?
- How should entities be named consistently across documents?
- How should conflicts between sources be represented?
- What metadata should be attached?
- How should relationships be encoded?

**Source:** https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f, https://www.mindstudio.ai/blog/karpathy-llm-knowledge-base-architecture-compiler-analogy/

---

## 6. Best-in-Class Real-Time AI Mobile Apps

**Gap filled:** Patterns and lessons from production real-time AI mobile apps.

### 6.1 Google Lens

- **Pattern:** Camera frame capture at variable rates (1-5 FPS depending on motion detection)
- **Architecture:** On-device preprocessing (OCR, object detection) + cloud API for complex reasoning
- **Lesson for Aucta:** Reduce unnecessary frame sends by detecting scene changes client-side before sending to Gemini. A simple frame differencing algorithm can cut bandwidth 60-80% when the technician holds the camera steady on equipment.

### 6.2 ChatGPT Voice Mode

- **Pattern:** Push-to-talk OR voice activity detection (VAD) with barge-in
- **Audio pipeline:** Native audio capture -> WebSocket -> server-side processing -> WebSocket -> native playback
- **Key UX pattern:** Visual feedback during processing (pulsing orb animation). Critical for user confidence that the system is working.
- **Lesson for Aucta:** The "orb" pattern (visual audio waveform / processing indicator) is now expected by users for voice AI. Implement an animated indicator that shows: (a) listening state, (b) processing state, (c) speaking state.

### 6.3 Perplexity Mobile

- **Pattern:** Streaming text responses with source citations inline
- **Architecture:** Search -> retrieve -> generate with streaming
- **Lesson for Aucta:** When Gemini provides spoken guidance based on KB articles, surface the source article ID/title as a tappable reference in the UI. This builds trust and enables the technician to read the full article if needed.

### 6.4 Common Patterns Across All Three

1. **Aggressive connection management:** Pre-connect WebSocket during app launch, not when session starts. Keep-alive pings during idle periods.
2. **Graceful degradation:** If network drops, buffer recent audio/video and replay on reconnect. Never show a hard error -- always show "reconnecting..." with a countdown.
3. **Audio ducking:** When the AI speaks, reduce microphone sensitivity to prevent echo loops. expo-two-way-audio's AEC handles this, but additional ducking improves quality.
4. **Haptic feedback:** Subtle haptic on state transitions (listening -> processing -> speaking) reinforces the interaction model without requiring visual attention -- critical for hands-busy technicians.

---

## 7. Open-Source Tools Worth Adopting

**Gap filled:** Consolidated evaluation of tools that complement Aucta's stack.

### 7.1 Docling (IBM) -- Document Processing

- **Repository:** https://github.com/DS4SD/docling
- **Stars:** 37,000+
- **Purpose:** PDF/document parsing with 97.9% table accuracy
- **Uses:** GraniteDocling-258M VLM for layout understanding
- **Aucta relevance:** HVAC manuals are predominantly PDFs with complex tables (wiring diagrams, spec sheets, error code tables). Docling's table extraction accuracy is critical for the KB ingestion pipeline.
- **Integration:** Python sidecar service (same as ColPali) -- can share the same sidecar

### 7.2 bash-tool (Vercel Labs) -- Agent Context Retrieval

- **Package:** https://www.npmjs.com/package/bash-tool
- **Purpose:** TypeScript bash reimplementation with pluggable filesystem
- **Aucta relevance:** Foundation for implementing the virtual filesystem KB pattern (Section 2). Can be integrated as a Gemini function calling tool.

### 7.3 Silero VAD -- Voice Activity Detection

- **Already mentioned in existing research** but worth emphasizing: critical for determining when the technician is speaking vs ambient HVAC noise. The existing research recommends it; this confirms it as the standard choice.

### 7.4 Inngest -- Background Job Processing

- **Already in the stack** (v4.1.x). Key supplemental finding: use Inngest step functions for the knowledge compilation pipeline (Karpathy Wiki pattern). Each step (extract -> compile -> score -> store) can retry independently.

### 7.5 Tools Evaluated but NOT Recommended

| Tool | Reason for Rejection |
|------|---------------------|
| LangChain / LlamaIndex | Unnecessary abstraction layer when using Gemini SDK directly. Adds dependency weight without proportional value for Aucta's specific pipeline. |
| Chroma (vector DB) | Qdrant already chosen with multivector support. Chroma lacks native ColBERT/MaxSim. |
| OpenAI Realtime API | No video input, no ephemeral tokens, higher latency for tool calls. Gemini Live is strictly superior for Aucta's multimodal use case. |

---

## 8. Cross-Cutting Recommendations for Aucta

### 8.1 Immediate Actions (v1.0)

1. **Fork expo-two-way-audio** and add 24kHz playback support. This is the fastest path to bidirectional audio with AEC on Expo.

2. **Implement implicit caching** by ensuring system instructions are identical across sessions. No code change needed -- Gemini 2.5 does this automatically. Just ensure the system instruction string is deterministic (no timestamps or random IDs in it).

3. **Use Flex tier** for all background processing (KB compilation, session transcript extraction, embedding generation). 50% cost savings.

### 8.2 Near-Term Actions (v1.1)

4. **Adopt Qdrant tiered multitenancy** (requires Qdrant 1.16+). Start all tenants in the fallback shard. Promote tenants with >10K articles to dedicated shards. Enable ACORN for multi-filter queries.

5. **Implement the Karpathy Wiki compilation pipeline:**
   - Raw documents -> Gemini Flex compilation -> structured wiki entries -> Qdrant
   - Track source-to-artifact dependencies for incremental recompilation
   - Use Inngest step functions for the pipeline orchestration

6. **Build the virtual filesystem KB interface** using bash-tool. Expose as a Gemini function calling tool so the Live API agent can `grep`, `cat`, and `find` across the company's KB.

### 8.3 Cost Optimization Summary

| Optimization | Savings Estimate | Effort |
|-------------|-----------------|--------|
| Implicit caching (system instructions) | ~75% reduction on repeated prefix tokens | Zero (automatic) |
| Flex tier for background processing | 50% reduction on KB pipeline costs | Low (add `serviceTier: "flex"`) |
| Virtual filesystem (precise retrieval) | Fewer LLM calls due to better context | Medium |
| Compiled KB (Karpathy pattern) | Lower per-query cost (pre-processed knowledge) | High (but amortized) |

---

## Sources

- Gemini Flex inference: https://ai.google.dev/gemini-api/docs/flex-inference (2026-04-08)
- Gemini Priority inference: https://ai.google.dev/gemini-api/docs/priority-inference (2026-04-08)
- Gemini context caching: https://ai.google.dev/gemini-api/docs/caching
- just-bash / bash-tool: https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash (2026-01-09)
- ChromaFs (Mintlify): https://www.mintlify.com/blog/how-we-built-a-virtual-filesystem-for-our-assistant (2026-03-24)
- expo-two-way-audio: https://github.com/speechmatics/expo-two-way-audio
- Qdrant 1.16 blog: https://qdrant.tech/blog/qdrant-1.16.x/ (2025-11-19)
- Qdrant multitenancy docs: https://qdrant.tech/documentation/manage-data/multitenancy/
- Karpathy LLM Wiki gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Karpathy compiler analogy breakdown: https://www.mindstudio.ai/blog/karpathy-llm-knowledge-base-architecture-compiler-analogy/
- Gemini Live + Expo RN discussion: https://discuss.ai.google.dev/t/best-practices-for-playing-gemini-live-apis-24khz-pcm-audio-stream-in-expo-react-native/95569
- Docling (IBM): https://github.com/DS4SD/docling
