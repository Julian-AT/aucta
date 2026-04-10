# Real-Time AI Inference Optimization for Gemini 2.5 Flash Live API

**Research Date:** April 2026
**Scope:** Mobile HVAC copilot streaming camera video + microphone audio to Gemini Live API
**Status:** Pure research -- no implementation code

---

## Table of Contents

1. [Gemini Live API Optimization](#1-gemini-live-api-optimization)
2. [Inference Speed Optimization](#2-inference-speed-optimization)
3. [RAG Optimization for Real-Time](#3-rag-optimization-for-real-time)
4. [Alternative & Complementary AI Approaches](#4-alternative--complementary-ai-approaches)
5. [Audio Pipeline Optimization](#5-audio-pipeline-optimization)
6. [Consolidated Recommendations](#6-consolidated-recommendations)

---

## 1. Gemini Live API Optimization

### 1.1 Architecture Overview

The Gemini Live API provides a **stateful bidirectional WebSocket** connection that processes audio, video, and text in a single multimodal model. Unlike traditional voice pipelines (STT -> LLM -> TTS), the Live API handles everything natively, eliminating inter-service latency.

**Key specifications:**
- Protocol: WSS (WebSocket Secure)
- Model IDs: `gemini-live-2.5-flash-native-audio` (GA), `gemini-3.1-flash-live-preview` (newer)
- Context window: 128K tokens
- Connection lifetime: ~10 minutes per WebSocket session

**Source:** Google AI Live API documentation (ai.google.dev/gemini-api/docs/live, updated 2026-03-31)

### 1.2 WebSocket Latency Minimization

#### Connection Architecture Choices

Two primary patterns exist:

1. **Direct client-to-Gemini** (lowest latency): The mobile app connects directly to the Gemini WebSocket endpoint using ephemeral tokens. This eliminates server hop latency entirely. Best for real-time voice/video where every millisecond matters.

2. **Client-to-backend proxy-to-Gemini** (more secure): The backend maintains the WebSocket to Gemini. Adds 20-50ms round-trip per hop but provides full server-side control over sessions, logging, and API key management.

**Recommendation for Aucta:** Use direct client-to-Gemini with ephemeral tokens. The HVAC copilot's real-time voice/video use case demands the lowest possible latency. Ephemeral tokens provide sufficient security (single-use, 1-minute validity, model-locked).

#### WebSocket Best Practices

- **Keep-alive pings:** The Gemini server expects activity. Send lightweight keepalive frames during silence to prevent premature disconnection.
- **Connection pooling:** Not applicable since each session is a single stateful WebSocket. Focus on fast connection establishment instead.
- **TLS session resumption:** On reconnect, TLS session tickets reduce handshake from 2-RTT to 1-RTT.
- **Regional endpoint selection:** Connect to the geographically closest Gemini endpoint to minimize base RTT.

### 1.3 Video Streaming Optimization

#### Frame Rate and Resolution

The Live API accepts video frames as inline images:

| Parameter | Specification |
|-----------|---------------|
| Max frame rate | 1 FPS |
| Native resolution | 768x768 pixels |
| Format | JPEG |
| Token cost | ~258 tokens/image |

**`media_resolution` configuration options:**
- `low` -- smallest resolution, fewest tokens, fastest processing
- `medium` -- balanced (default)
- `high` -- full resolution, most tokens, richest detail

**Source:** Google AI Live API docs, media resolution configuration

#### Optimization Strategies

1. **Use `media_resolution: "medium"` as default.** For HVAC equipment identification, `medium` provides sufficient detail for model nameplates, wiring diagrams, and error codes while consuming fewer tokens than `high`.

2. **Dynamic resolution switching.** When the technician says "look at this closer" or the model requests detail, temporarily switch to `high`. Revert to `medium` or `low` for ambient monitoring.

3. **Client-side JPEG compression.** Compress frames to quality 70-80 before sending. The model tolerates JPEG artifacts well, and smaller payloads reduce upload latency on cellular networks.

4. **Skip duplicate frames.** Compare consecutive frames using a simple pixel-difference threshold. If the camera is stationary (common when a technician sets down their phone), skip sending identical frames. This directly reduces token accumulation.

5. **Capture at native resolution, downscale to 768x768.** Sending larger images wastes bandwidth -- the API resizes internally anyway.

#### Token Budget Impact

At 1 FPS with `medium` resolution:
- ~258 tokens per frame
- ~15,480 tokens per minute for video alone
- Combined with audio (~25 tokens/sec = 1,500/min), that is ~17,000 tokens/min
- 128K context fills in ~7.5 minutes without compression

**This makes context window compression mandatory for sessions over 2 minutes with audio+video.**

### 1.4 Audio Streaming Optimization

#### Input Specifications

| Parameter | Value |
|-----------|-------|
| Format | Raw 16-bit PCM |
| Sample rate | 16,000 Hz |
| Byte order | Little-endian |
| Channels | Mono |
| Token rate | ~25 tokens/sec |

#### Output Specifications

| Parameter | Value |
|-----------|-------|
| Format | Raw 16-bit PCM |
| Sample rate | 24,000 Hz |
| Byte order | Little-endian |
| Channels | Mono |

#### Chunking Strategy

- **Send 20ms-40ms audio chunks.** This is the sweet spot between latency and network efficiency.
  - 20ms at 16kHz mono = 640 bytes
  - 40ms at 16kHz mono = 1,280 bytes
- **Never buffer more than 100ms before sending.** Buffering beyond this introduces perceptible delay in the conversation.
- **Resample from device native rate.** Most mobile devices capture at 44.1kHz or 48kHz. Resample to 16kHz before sending. Do this on-device to reduce bandwidth.

#### Bandwidth Calculation

- Input: 16kHz x 16-bit = 32 KB/sec (256 kbps)
- Output: 24kHz x 16-bit = 48 KB/sec (384 kbps)
- Total bidirectional: ~80 KB/sec (~640 kbps)
- With video (1 FPS, ~50KB JPEG): ~130 KB/sec (~1 Mbps)

This is well within 4G/LTE capabilities but may be tight on poor cellular. Consider adaptive quality.

### 1.5 Session Management and Reconnection

#### Session Lifetime Constraints

| Scenario | Duration Limit |
|----------|---------------|
| Without compression, audio only | ~15 minutes |
| Without compression, audio + video | ~2 minutes |
| With ContextWindowCompressionConfig | Unlimited (rolling window) |

#### Context Window Compression

```
ContextWindowCompressionConfig:
  trigger_tokens: <threshold to trigger compression>
  SlidingWindow:
    target_tokens: <tokens to retain after compression>
```

**Recommended configuration for HVAC copilot:**
- `trigger_tokens`: 100,000 (trigger at ~78% of 128K window)
- `target_tokens`: 50,000 (retain recent context, compress older)

This allows effectively unlimited sessions while preserving the most recent conversation context. Older audio/video context gets summarized by the model.

**Source:** Google AI Live API documentation, session management section

#### Session Resumption Protocol

1. Configure `SessionResumptionConfig(transparent=True)` at session start
2. Store the `new_handle` from every `SessionResumptionUpdate` event
3. Listen for `GoAway` signal (sent ~60 seconds before server-initiated disconnect)
4. On disconnect, reconnect using the stored handle
5. Resume tokens are valid for approximately 24 hours

**Critical implementation detail:** The `GoAway` signal gives a ~60-second window. Pre-create the new WebSocket connection during this window so the switchover is seamless to the technician.

**Reconnection after unexpected disconnect:**
- Store the latest resume handle in MMKV (synchronous, survives app backgrounding)
- On reconnect, pass the handle to resume conversation state
- If the handle is expired (>24h), start a new session with cached context

### 1.6 Ephemeral Token Management

#### Token Characteristics

| Property | Value |
|----------|-------|
| Default uses | 1 (single-use) |
| Validity window | 1 minute to start session |
| Message window | 30 minutes after session start |
| Config locking | `live_connect_constraints` locks model + generation config |

#### Rotation Strategy

1. **Pre-fetch the next token.** Request a new ephemeral token 30-45 seconds before the current session's expected end. This ensures zero-downtime token rotation.
2. **Backend token endpoint.** The mobile app calls your backend's `/api/ai/ephemeral-token` endpoint. The backend generates the token using the server API key and returns only the ephemeral token to the client.
3. **Constraint locking.** Always use `live_connect_constraints` to lock the model and generation config. This prevents a compromised token from being used with a different, more expensive model.
4. **Cache in MMKV.** Store the token locally for fast access on reconnection. Tokens are single-use, so clear after use.

**Source:** Google AI ephemeral tokens documentation (ai.google.dev/gemini-api/docs/ephemeral-tokens)

### 1.7 Tool Declaration Optimization

#### Best Practices for Function Calling Speed

1. **Include invocation conditions in tool descriptions.** Tell the model exactly when to call each tool:
   ```
   GOOD: "Look up HVAC error codes. Call this when the user mentions an error code, fault code, or when you see an error code displayed on equipment."
   BAD: "Error code lookup tool."
   ```

2. **Use precise parameter definitions.** Strong typing and clear descriptions reduce the model's decision-making overhead:
   ```
   GOOD: parameter "error_code" with description "The alphanumeric error code (e.g., 'E4', 'F28', 'H01'). Extract from user speech or visible display."
   BAD: parameter "code" with description "The code to look up."
   ```

3. **Limit tool count.** Each declared tool increases system prompt token count and decision complexity. For the HVAC copilot, keep to 3-5 core tools:
   - `lookup_error_code` -- error/fault code database lookup
   - `search_knowledge_base` -- RAG search over organizational knowledge
   - `get_equipment_specs` -- manufacturer specifications lookup
   - `create_session_note` -- save observations during the session
   - `escalate_to_expert` -- flag for human expert review

4. **Order tools by frequency.** Place the most commonly called tools first in the declaration. Some evidence suggests the model has a slight bias toward earlier-declared tools.

5. **Async function calling (Gemini 3.1 Flash Live only).** The `NON_BLOCKING` behavior mode allows the model to continue generating while waiting for tool results. Available scheduling modes: `INTERRUPT`, `WHEN_IDLE`, `SILENT`. Note: this is NOT available on 2.5 Flash Live -- only on 3.1 Flash Live Preview.

**Source:** Google Cloud function calling best practices, Google AI cookbook examples, gemilab.net guides

---

## 2. Inference Speed Optimization

### 2.1 Output Token Minimization

The single most impactful latency optimization: **reduce output tokens.**

Output tokens are approximately 4x more expensive in latency than input tokens because they are generated sequentially (autoregressive), while input tokens are processed in parallel.

**Case study -- incident.io:** Reduced LLM response latency from 11 seconds to 2.3 seconds (4.8x improvement) primarily by restructuring prompts to produce shorter outputs.

**Source:** incident.io engineering blog on LLM latency optimization

#### Strategies

1. **Instruct for brevity.** In the system prompt: "Respond in 1-3 short spoken sentences. Be direct and actionable. Omit pleasantries."

2. **Avoid JSON output for voice.** JSON formatting adds structural tokens. For the Live API's voice output, the model generates speech tokens directly -- keep instructions focused on natural, concise speech.

3. **Use output length limits.** Set `max_output_tokens` to constrain response length. For real-time voice guidance, 100-200 tokens per response turn is a reasonable ceiling.

4. **Structured brevity patterns.** Instead of "explain what the error code means and how to fix it," use "State the error cause in one sentence, then the fix in one sentence."

### 2.2 System Instruction Optimization

#### Token Budget for System Prompts

**Keep system instructions under 200 tokens for latency-sensitive applications.** Every token in the system prompt is processed on every turn, creating a multiplicative latency cost.

#### Compression Techniques

1. **SimpleTool structural compression.** Research shows 4-6x structural token compression is achievable, with 9.6x end-to-end speedup in some cases. Use abbreviated notation instead of verbose natural language.

2. **Semantic summarization.** Replace detailed explanations with compressed references:
   ```
   BEFORE (45 tokens): "You are an AI assistant that helps HVAC technicians diagnose and repair heating, ventilation, and air conditioning equipment. You should provide step-by-step guidance based on what you observe through the camera."
   AFTER (18 tokens): "HVAC repair copilot. Guide technician using camera view. Step-by-step. Brief spoken answers."
   ```

3. **Instruction referencing.** Instead of repeating context every turn, embed key context in the system instruction and reference it: "Follow the HVAC safety protocol (as defined in system context)."

4. **Template abstraction.** Define response templates in the system prompt that the model fills in, rather than generating freeform:
   ```
   "Response pattern: [Diagnosis] then [Action]. Max 2 sentences."
   ```

**Achievable compression:** 50-70% token reduction is realistic for well-structured system prompts without meaningful quality loss.

**Source:** machinelearningmastery.com, rephrase-it.com prompt compression research, incident.io engineering blog

### 2.3 Context Structuring

#### Token Processing Hierarchy

Structure context to put the most relevant information where the model processes it most effectively:

1. **System instruction** -- Always processed first. Keep minimal and role-defining.
2. **Recent conversation turns** -- The model weights recent context heavily. Ensure the last 2-3 turns are always present.
3. **Tool results** -- Place immediately after the tool call for strongest association.
4. **Background context** -- Organizational knowledge, equipment manuals. This can be compressed more aggressively.

#### Progressive Context Loading

Rather than front-loading all possible context:

1. Start sessions with minimal context (system prompt + user's current task)
2. Load equipment-specific context only when equipment is identified
3. Load error code databases only when error codes are mentioned
4. Use tool calls to fetch context on-demand rather than pre-loading

This approach keeps the active context small, reducing per-turn processing time.

### 2.4 Streaming Response Patterns

#### Sub-Second Perceived Latency

The Live API streams audio output in real-time. The key metric is **time to first audio byte** -- how quickly the technician hears the start of the response.

1. **Streaming is default.** The Live API natively streams audio responses. No special configuration needed.

2. **Front-load actionable content.** Structure tool results so the most important information comes first:
   ```
   GOOD tool result: "E4 = Low refrigerant. Check for leaks at service valves and coil connections."
   BAD tool result: "Error code E4 has been found in the database. According to manufacturer documentation revision 3.2, this error code typically indicates..."
   ```

3. **Barge-in support.** The model supports interruption -- if the technician speaks while the model is responding, the server sends `server_content` with `"interrupted": true`. The client must immediately flush the playback buffer. This creates a natural conversational flow.

### 2.5 Tool Result Caching and Prefetching

#### Prefetch Strategies

1. **Common error codes.** Pre-cache the top 50 most common HVAC error codes per equipment manufacturer in MMKV. When the model calls `lookup_error_code`, check local cache before hitting the backend.

2. **Equipment identification cache.** Once the model identifies equipment (e.g., "Carrier 24ACC636"), cache the equipment spec sheet for the duration of the session. Subsequent questions about that equipment resolve locally.

3. **Session-scoped context.** Maintain a session-local context store with equipment identified, error codes looked up, and actions recommended. This avoids redundant tool calls.

#### Latency Targets for Tool Results

| Tool Call | Target Latency | Strategy |
|-----------|---------------|----------|
| Error code lookup | <50ms | Local cache + Upstash Redis fallback |
| Knowledge base search | <200ms | Qdrant with optimized HNSW (see Section 3) |
| Equipment specs | <100ms | MMKV cache + backend fallback |
| Session note creation | <50ms | Async write, return immediately |

---

## 3. RAG Optimization for Real-Time

### 3.1 Qdrant Configuration for Sub-100ms Queries

#### HNSW Index Tuning

HNSW (Hierarchical Navigable Small World) is Qdrant's primary index type. Tuning parameters directly impact query latency.

| Parameter | Default | Recommended | Impact |
|-----------|---------|-------------|--------|
| `m` | 16 | 16 | Number of edges per node. Higher = better recall, more memory |
| `ef_construction` | 100 | 128 | Build-time quality. Higher = better index, slower build |
| `hnsw_ef` | - | 64-128 | Query-time beam width. Higher = better recall, slower query |
| `on_disk` | false | true (for HNSW) | Keep HNSW index on disk, data in RAM. Saves memory significantly |

**Benchmark results from production deployments:**
- Default config: ~420ms average query
- Tuned HNSW (m=16, ef=128): ~185ms average (56% improvement)
- Full optimization (quantization + payload indexes + gRPC): 2-3 seconds down from 22 seconds for complex queries (85% improvement on large datasets)

**Source:** Qdrant official documentation, scalewithchintan.com benchmark, blogdeveloperspot optimization guides

#### Quantization for Speed

1. **Scalar quantization (int8).** Reduces vector memory by 4x with minimal recall loss (<2%):
   ```
   quantization_config:
     scalar:
       type: int8
       quantile: 0.99
       always_ram: true   # Keep quantized vectors in RAM
   ```

2. **Binary quantization.** Even faster but with more recall loss. Best for over-fetch + rescore patterns:
   ```
   quantization_config:
     binary:
       always_ram: true
   ```

3. **Rescore strategy.** Use quantized vectors for initial candidate retrieval (fast), then rescore top-K with full-precision vectors (accurate):
   ```
   search_params:
     quantization:
       rescore: true   # Re-rank with original vectors
   ```

#### Payload Indexes

Create payload indexes on frequently filtered fields to avoid full scans:

- `equipment_manufacturer` (keyword index)
- `equipment_model` (keyword index)
- `error_code_prefix` (keyword index)
- `document_type` (keyword index) -- e.g., "manual", "troubleshooting", "safety"
- `language` (keyword index)
- `organization_id` (keyword index) -- multi-tenant filtering

#### gRPC vs REST

Use gRPC for all Qdrant communications. Benchmarks show **2-3x faster** than REST for the same queries due to:
- Binary serialization (Protocol Buffers vs JSON)
- HTTP/2 multiplexing
- Connection reuse

**Source:** Qdrant performance documentation, youngju.dev benchmarks

#### Collection Configuration Summary

```
Collection: hvac_knowledge
  vectors:
    dense:
      size: 768        # or 1024 depending on embedding model
      distance: Cosine
      on_disk: false    # keep vectors in RAM
      quantization:
        scalar: { type: int8, quantile: 0.99, always_ram: true }

  hnsw_config:
    m: 16
    ef_construct: 128
    on_disk: true       # HNSW graph on disk, vectors in RAM

  optimizers_config:
    memmap_threshold: 20000  # Use mmap for segments > 20K vectors
```

### 3.2 ColBERT/ColPali Late Interaction

#### ColBERT Architecture

ColBERT (Contextualized Late Interaction over BERT) provides **token-level multi-vector representations** instead of single dense vectors. Each document token gets its own embedding, and similarity is computed via the **MaxSim** operator -- for each query token, find the maximum similarity to any document token, then sum.

**Why this matters for HVAC knowledge retrieval:**
- HVAC documents contain precise technical terminology where token-level matching outperforms dense vector averaging
- Error codes, part numbers, and specifications need exact matching combined with semantic understanding
- ColBERT typically achieves 5-15% higher recall than dense retrieval on technical domains

#### ColBERTv2 and PLAID Engine

ColBERTv2 improved on the original with:
- Residual compression of token embeddings
- PLAID (Performance-optimized Late Interaction Driver) engine
- **7x GPU speedup and 45x CPU speedup** over original ColBERT

**Source:** Stanford FutureData ColBERT GitHub, ColBERTv2 paper (NAACL 2022), PLAID paper

#### Qdrant Native Multivector Support

Since Qdrant v1.10, native multivector support exists with the `max_sim` comparator:

```
vectors:
  multivec:
    size: 128          # ColBERT token embedding dimension
    multivector_config:
      comparator: max_sim
```

**Recommended two-stage retrieval architecture:**

1. **Stage 1 -- Dense retrieval (fast).** Use a standard dense vector (e.g., `text-embedding-3-small` or `mxbai-embed-large`) to retrieve top-100 candidates. Target: <50ms.

2. **Stage 2 -- ColBERT reranking (precise).** Rerank the top-100 using ColBERT multivectors with MaxSim. Target: <100ms additional.

**Total target: <150ms end-to-end for hybrid retrieval.**

To optimize the reranking stage, disable HNSW on the multivector field (it is only used for reranking, not initial retrieval):
```
vectors:
  multivec:
    size: 128
    multivector_config:
      comparator: max_sim
    hnsw_config:
      on_disk: true    # Not used for primary search
```

#### Production Benchmarks

**Mixedbread production deployment:** Achieved ~50ms end-to-end at billion-document scale using late interaction models with optimized indexing.

**Source:** mixedbread.com (billion-scale late interaction retrieval blog post)

#### ColPali for Visual Documents

ColPali extends the late interaction paradigm to **visual documents** -- PDFs, wiring diagrams, installation manuals with images and tables.

**Critical limitation: ColPali is Python-only.** There is no JavaScript/TypeScript SDK. This requires a Python sidecar service for embedding generation.

**Architecture for Aucta:**
- **Indexing pipeline (offline):** Python service processes uploaded PDFs/manuals through ColPali to generate multi-vector embeddings. Store in Qdrant.
- **Query pipeline (online):** For text queries, use the ColBERT model directly. For image queries (e.g., technician photographs a wiring diagram), route through the Python sidecar.

**Source:** ColPali GitHub (illuin-tech/colpali)

### 3.3 Hybrid Search Strategy

#### Combining Semantic + Keyword Search

For HVAC technical content, pure semantic search misses exact matches on:
- Error codes (E4, F28, H01)
- Part numbers (024-26085-000)
- Model numbers (24ACC636A003)

**Recommended hybrid approach:**

1. **Sparse vectors for keyword matching.** Use BM25 or SPLADE to generate sparse vectors. Qdrant supports named vectors, so store both dense and sparse in the same collection.

2. **Reciprocal Rank Fusion (RRF).** Combine dense and sparse retrieval results:
   ```
   score = sum(1 / (k + rank_dense), 1 / (k + rank_sparse))
   ```
   Where k is typically 60.

3. **Pre-filter on payload.** Before running vector search, filter by `organization_id` and optionally `equipment_manufacturer`. This dramatically reduces the search space.

### 3.4 Caching Strategies

#### Multi-Layer Cache Architecture

| Layer | Technology | TTL | Purpose |
|-------|-----------|-----|---------|
| L1: On-device | MMKV | Session duration | Error codes, equipment specs looked up this session |
| L2: Edge | Upstash Redis (EU) | 1 hour | Frequently accessed knowledge articles, popular error codes |
| L3: Backend | Qdrant query cache | 15 minutes | Recent identical or near-identical queries |

#### Semantic Cache

For the knowledge base, implement a **semantic cache** using embedding similarity:
1. Embed the incoming query
2. Check Upstash Redis for cached results from queries with >0.95 cosine similarity
3. If hit, return cached results immediately (<10ms)
4. If miss, execute full Qdrant search and cache the results

This is particularly effective for HVAC support where technicians frequently ask variations of the same questions ("What does E4 mean?" / "Error E4" / "I see an E4 code").

---

## 4. Alternative & Complementary AI Approaches

### 4.1 Edge AI for Equipment Identification

#### On-Device Object Detection

Use a lightweight on-device model for initial equipment identification before sending to Gemini:

**Recommended approach: YOLO-based equipment classifier**
- **Model:** YOLOv8-nano or YOLOv10-nano (< 5MB)
- **Runtime:** ONNX Runtime Mobile or TensorFlow Lite
- **Latency:** 15-30ms per frame on modern mobile devices
- **Purpose:** Detect and classify HVAC equipment type (condenser, furnace, thermostat, air handler) from camera frames

**Benefits:**
1. Instant equipment identification without waiting for Gemini
2. Pre-populate equipment context before the technician speaks
3. Reduce Gemini processing by sending structured metadata instead of raw frames
4. Works offline -- equipment identification doesn't require connectivity

**Source:** Edge Impulse documentation on VLM cascading patterns, HuggingFace edge models collection

#### Equipment Nameplate OCR

Run on-device OCR (e.g., ML Kit Text Recognition) to extract:
- Model numbers
- Serial numbers
- Error codes from digital displays
- Refrigerant type labels

Send extracted text to Gemini as structured metadata alongside the video frame, reducing the model's visual reasoning burden.

### 4.2 Model Cascading Patterns

#### Architecture: Lightweight Model -> Heavy Model

Model cascading uses a fast, inexpensive model to handle simple cases and routes only complex cases to the expensive model.

**ICLR 2022 research:** EfficientNet cascade achieved 5.4x inference speedup by routing 70-80% of inputs through a lightweight model.

**Source:** ICLR 2022 cascade paper, MultiTASC++ research, Elektor Magazine model cascading article

#### Cascading Strategy for Aucta

```
Input (camera frame + audio)
  |
  v
[On-Device Triage] -- Equipment ID, OCR, basic classification
  |
  |--> Simple case (known error code, common question)
  |     --> Local lookup + cached response template
  |     --> Latency: <100ms
  |
  |--> Complex case (unknown equipment, nuanced diagnosis)
        --> Gemini Live API (full multimodal reasoning)
        --> Latency: 500ms-2s
```

**Estimated API cost reduction:** 40-60% if common error code lookups and basic equipment identification can be handled locally without engaging Gemini.

### 4.3 Voice Activity Detection (VAD)

#### On-Device VAD with Silero

**Silero-VAD** is a lightweight voice activity detection model that runs via ONNX:
- Model size: ~1.5MB
- Latency: <5ms per frame
- Accuracy: >95% on conversational speech

**Benefits for Aucta:**
1. **Bandwidth reduction.** Only stream audio when speech is detected. In a typical HVAC session, 60-70% of time may be ambient noise (compressor running, tools operating).
2. **Instant barge-in detection.** Detect speech onset locally before the audio reaches Gemini, enabling the client to immediately flush the playback buffer.
3. **Reduced token consumption.** Silence sent to Gemini still consumes ~25 tokens/sec. With VAD, this drops to near zero during non-speech segments.

**Implementation:** Run Silero-VAD via `react-native-onnxruntime` or integrate through `loqa-audio-bridge` which includes VAD support.

### 4.4 Supplementary Open-Source Models

#### Whisper for Offline Transcription

When connectivity is poor, use Whisper (via `whisper.cpp` or `whisper-rn`) for local speech-to-text. This enables:
- Offline session notes
- Local query formation for when connectivity returns
- Searchable session transcripts without API costs

#### Equipment-Specific Fine-Tuned Models

Consider fine-tuning a small model (Phi-3-mini, Gemma-2 2B) on HVAC-specific Q&A for:
- Offline fallback when Gemini is unreachable
- Fast responses to common questions without API round-trip
- On-device privacy for sensitive organizational knowledge

**Trade-off:** Significant engineering effort for fine-tuning and deployment. Recommended only after validating demand through Gemini session analytics.

---

## 5. Audio Pipeline Optimization

### 5.1 React Native Audio Libraries

#### Available Options for Bidirectional Audio Streaming

| Library | PCM Support | Bidirectional | Expo Compatible | Maturity |
|---------|-------------|---------------|-----------------|----------|
| `expo-realtime-audio` | Yes (raw PCM) | Yes | Native | New, purpose-built |
| `react-native-audio-api` | Yes | Playback only | Via config plugin | Pre-1.0 (v0.11.7) |
| `react-native-pcm-player-lite` | Yes (24kHz) | Playback only | Via native module | Specialized |
| `react-native-voice-processor` | Yes (16kHz PCM) | Capture only | Via native module | Stable |
| `expo-audio` | TBD | TBD | Native (SDK 55) | New replacement for expo-av |

**Recommended primary choice: `expo-realtime-audio`**

This library was built specifically for bidirectional real-time audio streaming with AI APIs. It uses AVAudioEngine on iOS and AudioTrack on Android, providing:
- Raw PCM capture at configurable sample rates
- Raw PCM playback at configurable sample rates
- Duplex operation (simultaneous record + play)
- Low-latency buffer configuration

**Fallback plan:** If `expo-realtime-audio` has compatibility issues with Expo SDK 55, combine `react-native-voice-processor` (capture) with `react-native-pcm-player-lite` (playback).

**Critical note from CLAUDE.md:** `expo-av` has been removed from Expo Go in SDK 55. All audio development requires development builds.

### 5.2 Minimizing Audio Latency

#### iOS Audio Session Configuration

```
Category: .playAndRecord
Mode: .voiceChat
Options: [.defaultToSpeaker, .allowBluetooth]
```

The `.voiceChat` mode enables:
- Acoustic echo cancellation (AEC) -- prevents the microphone from picking up the AI's spoken responses
- Automatic gain control (AGC)
- Low-latency I/O buffer sizing

#### Buffer Sizing

| Sample Rate | Buffer Duration | Buffer Size (bytes) |
|-------------|----------------|---------------------|
| 16kHz (input) | 10ms | 320 |
| 16kHz (input) | 20ms | 640 |
| 16kHz (input) | 40ms | 1,280 |
| 24kHz (output) | 10ms | 480 |
| 24kHz (output) | 20ms | 960 |
| 24kHz (output) | 40ms | 1,920 |

**Recommended:** Use 20ms buffers for both input and output. This provides:
- Input: 640 bytes per chunk, sent to Gemini
- Output: 960 bytes per chunk, fed to playback
- Total glass-to-glass latency contribution from buffering: ~40ms (one input buffer + one output buffer)

#### Android-Specific Considerations

Android audio latency varies significantly by device. Key mitigations:

1. **Use AAudio / Oboe under the hood.** Libraries that wrap AAudio (Android 8.1+) achieve much lower latency than the older AudioTrack API.
2. **Foreground service with notification.** Required on Android for sustained audio recording in the background. Use `@notifee/react-native` to maintain a foreground service notification.
3. **Request exclusive audio mode** when available. Prevents other apps from competing for the audio hardware.

### 5.3 Audio Buffer Management for Streamed Responses

#### Playback Buffer Architecture

```
WebSocket receive --> Decode PCM --> Ring Buffer --> Audio Output
                                         ^
                                         |
                                   Barge-in detection
                                   (flush on interrupt)
```

1. **Ring buffer for playback.** Maintain a ring buffer of 200-500ms of audio. This smooths network jitter without adding perceptible delay.
   - At 24kHz, 200ms = 9,600 bytes
   - At 24kHz, 500ms = 24,000 bytes

2. **Adaptive buffering.** Start with a larger buffer (500ms) on session start to prevent underrun, then reduce to 200ms once the stream stabilizes.

3. **Underrun handling.** If the buffer empties (network stall), insert silence rather than looping. Track underrun events for quality monitoring.

### 5.4 Barge-In Implementation

#### Server-Side Signal

When the user speaks while the model is generating audio, the Gemini server sends:
```json
{
  "serverContent": {
    "interrupted": true
  }
}
```

#### Client-Side Response

On receiving the interrupt signal:

1. **Immediately flush the playback buffer.** Stop all queued audio playback within 1 frame (20ms).
2. **Cancel any in-flight audio chunks.** Discard buffered audio data that hasn't been played yet.
3. **Resume microphone input priority.** Ensure the user's speech is being captured and sent.
4. **Update UI.** Switch from "AI speaking" state to "AI listening" state.

#### Enhanced Barge-In with Local VAD

Using on-device Silero-VAD, detect speech onset **before** the interrupt signal arrives from the server:

1. VAD detects user speech onset (latency: <5ms)
2. Client immediately reduces playback volume or pauses (latency: <20ms)
3. Client continues sending audio to Gemini
4. Server confirms with `interrupted: true` (latency: 50-200ms depending on network)
5. Client fully flushes buffer on server confirmation

This provides a **perceived barge-in latency of <25ms** instead of waiting 50-200ms for the server signal.

### 5.5 Resampling Strategy

Most mobile devices capture at 44.1kHz or 48kHz. The Gemini API requires 16kHz input.

**Recommended approach:**
1. Configure the audio capture to request 16kHz directly if the library supports it (some native audio APIs support this natively)
2. If 16kHz capture is not available, capture at 48kHz (cleanest 3:1 downsample ratio) and resample on-device
3. Use a simple windowed sinc filter for resampling -- avoid unnecessary quality overhead since this is speech, not music
4. Perform resampling in a native module or audio worklet to avoid JavaScript thread blocking

For output playback at 24kHz, most devices can play this natively. If not, upsample to 48kHz (clean 2:1 ratio).

---

## 6. Consolidated Recommendations

### Priority Matrix

| Optimization | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Context window compression | Critical | Low | P0 |
| Session resumption | Critical | Medium | P0 |
| Ephemeral token rotation | Critical | Medium | P0 |
| Audio chunking (20ms) | High | Low | P0 |
| System prompt compression (<200 tokens) | High | Low | P1 |
| Qdrant HNSW tuning | High | Medium | P1 |
| On-device VAD (Silero) | High | Medium | P1 |
| Local error code cache (MMKV) | High | Low | P1 |
| gRPC for Qdrant | Medium | Low | P1 |
| Dynamic video resolution | Medium | Medium | P2 |
| Two-stage retrieval (dense + ColBERT) | Medium | High | P2 |
| Semantic query cache | Medium | Medium | P2 |
| On-device equipment YOLO | Medium | High | P2 |
| ColPali for visual documents | Low | Very High | P3 |
| Offline Whisper fallback | Low | High | P3 |
| Fine-tuned local HVAC model | Low | Very High | P3 |

### Architecture Summary

```
Mobile Device                          Backend                         External Services
+-------------------+                 +------------------+            +------------------+
| Camera (1 FPS)    |                 | Token endpoint   |            | Gemini Live API  |
| Microphone (16kHz)|---WebSocket---->| (ephemeral gen)  |            | (WSS)            |
| Silero VAD        |                 |                  |            |                  |
| YOLO Equipment ID |                 | tRPC API         |            | Qdrant (EU)      |
| MMKV Cache        |---tRPC-------->| Knowledge search |----------->| (gRPC)           |
| Ring Buffer (24k) |                 | Error code cache |            |                  |
| Audio Output      |                 | Session manager  |            | Upstash Redis    |
+-------------------+                 +------------------+            | (EU)             |
       |                                                              +------------------+
       |                                                              |                  |
       +--Direct WebSocket (ephemeral token)------------------------->| Gemini Live API  |
                                                                      +------------------+
```

### Key Latency Budget

| Component | Target | Notes |
|-----------|--------|-------|
| Audio capture + resample | <20ms | 20ms buffer at 16kHz |
| Network to Gemini | 30-80ms | Depends on region |
| Gemini time-to-first-audio | 200-500ms | Model inference |
| Network from Gemini | 30-80ms | Return path |
| Audio buffer + playback | <40ms | 20ms buffer at 24kHz |
| **Total glass-to-glass** | **320-720ms** | **Speech-in to speech-out** |
| Tool call (error code, cached) | <50ms | MMKV or Redis |
| Tool call (knowledge base) | <200ms | Qdrant optimized |
| Tool call + response | +300-600ms | Added to base latency |

### Cost Optimization Estimates

| Strategy | Monthly Savings (1000 sessions x 15min) |
|----------|----------------------------------------|
| VAD (skip 60% silence) | ~40% audio input cost reduction |
| Local error code cache | ~20% reduction in tool call volume |
| Context compression | Enables longer sessions without new connections |
| Model cascading (future) | ~40-60% total API cost reduction |
| Frame skipping (static camera) | ~30% video token reduction |

---

## Sources

### Primary Documentation
- Google AI Live API: https://ai.google.dev/gemini-api/docs/live (updated 2026-03-31)
- Google AI Ephemeral Tokens: https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- Google AI Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Google Cloud Function Calling Best Practices: https://cloud.google.com/vertex-ai/docs/generative-ai/function-calling
- Google AI Cookbook: https://github.com/google-gemini/cookbook

### Qdrant
- Qdrant Performance Optimization: https://qdrant.tech/documentation/guides/optimize/
- Qdrant Multivector Documentation: https://qdrant.tech/documentation/concepts/vectors/
- Qdrant Quantization Guide: https://qdrant.tech/documentation/guides/quantization/
- Qdrant Production Benchmarks: scalewithchintan.com, youngju.dev

### ColBERT / Late Interaction
- ColBERTv2 Paper: https://arxiv.org/abs/2112.01488 (NAACL 2022)
- PLAID Engine: Stanford FutureData, https://github.com/stanford-futuredata/ColBERT
- Mixedbread Billion-Scale Late Interaction: https://mixedbread.com/blog
- Qdrant Multivector Tutorial: https://qdrant.tech/documentation/tutorials/

### Audio Pipeline
- expo-realtime-audio: Expo ecosystem library for bidirectional PCM streaming
- react-native-audio-api: https://github.com/software-mansion/react-native-audio-api (v0.11.7)
- Silero-VAD: https://github.com/snakers4/silero-vad
- loqa-audio-bridge: VAD integration for React Native

### Inference Optimization
- incident.io Latency Optimization: incident.io engineering blog (11s to 2.3s reduction)
- SimpleTool Token Compression: Research on structural prompt compression (4-6x reduction)
- Prompt Compression Techniques: machinelearningmastery.com, rephrase-it.com
- AWS Bedrock Optimization Guide: AWS documentation on inference latency
- MorphLLM Inference Optimization: morphllm.com

### Edge AI / Model Cascading
- Edge Impulse VLM Cascading: https://docs.edgeimpulse.com/
- EfficientNet Cascade (ICLR 2022): 5.4x inference speedup
- HuggingFace Edge Models: https://huggingface.co/collections/edge-models
- MultiTASC++ Research: Multi-model cascading patterns
- ColPali: https://github.com/illuin-tech/colpali

### SDK and Tools
- @google/genai SDK: https://github.com/googleapis/js-genai (v1.48.0)
- google-gemini/genai-processors: https://github.com/google-gemini/genai-processors
- gemilab.net Gemini Guides: https://gemilab.net
