# Architecture Patterns

**Domain:** Real-time multimodal AI copilot (mobile-first, HVAC vertical)
**Researched:** 2026-04-03
**Overall confidence:** HIGH (architecture decisions already made; research validates and sequences them)

---

## Recommended Architecture

The system is a **client-direct multimodal streaming application** where the mobile device connects directly to the AI model (Gemini Live) via WebSocket, with a thin server layer for auth, token issuance, tool execution, and async knowledge processing. This is NOT a traditional request-response app -- it is an always-on, bidirectional streaming system with hard real-time constraints.

```
                              +-------------------+
                              |   Gemini Live API |
                              |   (Google Cloud)  |
                              +--------+----------+
                                       ^
                                       | WSS (direct)
                                       | JPEG + PCM in
                                       | PCM + toolCalls out
                                       |
+------------------+          +--------+----------+
|   Mobile App     |<-------->|   WebSocket Conn  |
|   (Expo SDK 55)  |  local   |   (on device)     |
+--------+---------+          +-------------------+
         |
         | tRPC (HTTPS)
         | - token issuance
         | - tool execution
         | - event logging
         | - session CRUD
         v
+--------+---------+          +-------------------+
|   API Layer      |--------->|   Background Jobs |
|   (Next.js 16 +  |  events  |   (Inngest)       |
|    tRPC + Auth)  |          +--------+----------+
+--------+---------+                   |
         |                             | async
    +----+----+                   +----+----+
    |         |                   |         |
+---v---+ +---v---+          +---v---+ +---v---+
| Neon  | |Upstash|          |Qdrant | |Vercel |
|Postgres| |Redis |          |Vector | | Blob  |
+-------+ +------+          +------+ +-------+
```

### The Critical Insight: Two Distinct Data Paths

This system has two fundamentally different data paths that must be designed independently:

1. **Hot path (real-time):** Mobile <-> Gemini Live (WebSocket, sub-second latency). Audio/video streaming, spoken responses, inline tool calls. This path must be optimized for latency above all else.

2. **Warm path (request-response):** Mobile <-> API server (tRPC over HTTPS). Token issuance, tool execution for Gemini, session metadata, event logging. This path serves the hot path -- it must be fast but is not streaming.

3. **Cold path (async):** API server -> Inngest background jobs. Post-session summarization, knowledge ingestion/compilation, analytics aggregation. This path has no latency constraint.

Build order and testing strategy differ dramatically across these paths.

---

## Component Boundaries

### Layer 1: Shared Foundation (no runtime dependencies)

| Component | Package | Responsibility | Depends On |
|-----------|---------|---------------|------------|
| Zod schemas | `packages/shared` | Single source of truth for all data shapes, DTOs, constants, error types | Nothing |
| Design tokens | `packages/config` | Tailwind presets, shared tokens | Nothing |
| i18n | `packages/i18n` | Translation strings (en, de, tr, sr, hr, pl, ro) | Nothing |

### Layer 2: Data Access (depends on shared)

| Component | Package | Responsibility | Depends On |
|-----------|---------|---------------|------------|
| DB schema | `packages/db` | Drizzle schema definitions, migrations | `shared` (types) |
| Repositories | `packages/db` | All database access (CRUD). Drizzle never escapes this layer. Returns Zod-validated DTOs. | `shared` (DTOs), Neon Postgres |
| Auth config | `packages/auth` | Better Auth server/client config, org plugin, RBAC permissions | `db` (user/org tables) |

### Layer 3: AI Pipeline (depends on shared + db)

| Component | Package | Responsibility | Depends On |
|-----------|---------|---------------|------------|
| Tool definitions | `packages/ai/tools/` | Each tool: `buildTool()`, Zod schemas, `call()`, prompt for Gemini function declaration | `shared` (schemas), `db` (repositories) |
| Tool registry | `packages/ai/tools/registry.ts` | `assembleToolPool()` -- registers tools, maps names to implementations | Tool definitions |
| Tool dispatcher | `packages/ai/session/toolDispatcher.ts` | Routes `toolCall` events from Gemini to the correct tool, validates input, returns result | Tool registry |
| System prompt builder | `packages/ai/prompts/` | Layered prompt assembly: core + HVAC + safety + org overlay + knowledge context | `shared` (types) |
| Knowledge retrieval | `packages/ai/knowledge/retrieve/` | Hybrid BM25 + vector search, reranking, context building | Qdrant, `db` (article repository) |
| Knowledge ingestion | `packages/ai/knowledge/ingest/` | Extract learnings from sessions, process PDFs, parse feedback | `shared`, `db` |
| Knowledge compilation | `packages/ai/knowledge/compile/` | LLM generates/updates wiki articles from raw ingested data | `shared`, `db`, Qdrant |
| Knowledge verification | `packages/ai/knowledge/verify/` | Confidence scoring, consistency checking, review queue management | `shared`, `db` |

### Layer 4: API (depends on all packages)

| Component | Package | Responsibility | Depends On |
|-----------|---------|---------------|------------|
| tRPC routers | `packages/api/routers/` | HTTP endpoints: session, org, team, knowledge, analytics. Org-scoped middleware. | `ai`, `db`, `auth`, `shared` |
| Inngest jobs | `packages/api/jobs/` | Background functions: summarize, ingest, compile, aggregate, GDPR | `ai`, `db`, `shared` |
| Token endpoint | `apps/web/app/api/token/` | Issues ephemeral Gemini tokens with locked constraints | `auth`, `@google/genai` |

### Layer 5: Applications (depends on packages, never imported by packages)

| Component | App | Responsibility | Depends On |
|-----------|-----|---------------|------------|
| Gemini connection | `apps/mobile/lib/gemini/` | WebSocket lifecycle, audio/video encoding, reconnection | `@google/genai` SDK, Zustand store |
| Audio pipeline | `apps/mobile/lib/gemini/` | PCM capture (16kHz) via expo-av, playback (24kHz) via react-native-audio-api | expo-av, react-native-audio-api |
| Video pipeline | `apps/mobile/lib/gemini/` | JPEG capture (1 FPS, 768px) via expo-camera, base64 encoding | expo-camera |
| Session UI | `apps/mobile/app/(app)/session/` | Camera preview, audio visualizer, tool call indicators, AI status | Zustand session store |
| Session store | `apps/mobile/stores/session.store.ts` | WebSocket state, audio buffers, connection status, tool call queue | Zustand |

### Import Direction (strictly one-way)

```
packages/shared  <-- packages/db  <-- packages/ai  <-- packages/api
                                                            ^
                                                   apps/web/modules/
                                                   apps/mobile/
```

Violations to enforce via linting:
- `packages/ai` must NEVER import from `@trpc/server`
- `packages/db` must NEVER import from `packages/api`
- `packages/shared` must NEVER import from any other package
- `apps/*` must NEVER be imported by `packages/*`
- `packages/ai` must NEVER import from `packages/api`

---

## Data Flow

### Flow 1: Live AI Session (Hot Path)

This is the most architecturally complex flow. Every design decision on the hot path must minimize latency.

```
1. Mobile: User taps "Start Session"
   |
2. Mobile -> API: POST /api/token (via tRPC session.createToken)
   |  API: Verify auth, check rate limit, create ai_sessions row
   |  API: Build system prompt (core + HVAC + safety + org overlay)
   |  API: Assemble tool declarations from registry
   |  API: Call Gemini ephemeral token API with locked constraints:
   |        - model: gemini-2.5-flash-live
   |        - config: { sessionResumption: {}, responseModalities: ["AUDIO"] }
   |        - uses: 1, expire_time: +30min, new_session_expire_time: +1min
   |  API -> Mobile: { token, sessionId, systemPrompt, toolDeclarations, config }
   |
3. Mobile: Open WSS to Gemini Live using ephemeral token
   |  Send setup message: { model, voice, systemInstruction, tools }
   |
4. Mobile: Enter streaming loop
   |  SEND: JPEG frames (1 FPS, 768px, base64) + PCM audio (16kHz/16-bit/mono)
   |  RECEIVE: PCM audio (24kHz) + text transcript + toolCall events
   |
5. On toolCall event from Gemini:
   |  Mobile -> API: tRPC tool.execute({ toolName, args, sessionId })
   |  API: toolDispatcher.dispatch(toolName, args) -> tool.call()
   |  API -> Mobile: { result }
   |  Mobile -> Gemini: toolResponse { id, result }
   |
6. On session end:
   |  Mobile: Close WebSocket
   |  Mobile -> API: tRPC session.end({ sessionId, feedback })
   |  API: Update ai_sessions row
   |  API: Emit Inngest event "session/ended"
```

**Critical architectural decision: Where do tool calls execute?**

Tool calls execute on the API server, NOT on the mobile device. Reasons:
- Tools need database access (lookupErrorCode queries knowledge base)
- Tools need server-side secrets (API keys for external services)
- Tools need org-scoped data (the mobile device should not have broad data access)
- Network round-trip (mobile -> API -> mobile -> Gemini) adds ~100-300ms, which is acceptable because Gemini's async function calling continues audio streaming while tools execute

The mobile device is a pass-through for tool calls: it receives `toolCall` from Gemini, forwards to the API for execution, and sends `toolResponse` back to Gemini.

### Flow 2: Tool Call Execution (Warm Path)

```
Gemini -> Mobile: toolCall { id: "tc_123", name: "searchKnowledgeBase", args: { query, equipment_context } }
  |
Mobile -> API: tRPC tool.execute({ toolCallId: "tc_123", name: "searchKnowledgeBase", args })
  |
API: toolDispatcher resolves "searchKnowledgeBase" from registry
  |  -> tool.validateInput(args) via Zod schema
  |  -> tool.call(validatedArgs, context: { orgId, sessionId, db, vectorStore })
  |     -> Qdrant: hybrid search (sparse BM25 + dense vector)
  |     -> Postgres: fetch full articles by IDs
  |     -> Reranker: cross-encoder reranking on top-K
  |     -> contextBuilder: format articles with confidence tags
  |  <- { articles: [...], sources: [...] }
  |
API -> Mobile: { toolCallId: "tc_123", result: { articles, sources } }
  |
Mobile -> Gemini: toolResponse { id: "tc_123", response: { articles, sources } }
```

**Timeout: 10 seconds per tool call.** On timeout, return an error response to Gemini so it can inform the technician gracefully.

### Flow 3: Post-Session Knowledge Pipeline (Cold Path)

```
session/ended event -> Inngest
  |
Step 1: "fetch-session" -> SessionRepository.findById()
Step 2: "fetch-events" -> SessionEventRepository.findBySessionId()
Step 3: "generate-summary" -> Gemini (non-Live, standard API) summarizes session
Step 4: "save-summary" -> SessionRepository.updateSummary()
Step 5: "extract-knowledge" -> sessionIngester.extract(session, events, summary)
  |  -> Identifies: new error codes seen, procedures discussed, corrections made
  |  -> Creates raw knowledge entries in DB
Step 6: "compile-articles" -> wikiCompiler.compile(rawEntries)
  |  -> LLM generates/updates wiki articles from raw entries
  |  -> Generates embeddings -> Qdrant upsert
  |  -> Links related articles
Step 7: "check-health" -> healthCheck.run(orgId)
  |  -> Identifies coverage gaps, stale articles, inconsistencies
Step 8: "notify-manager" -> Send session summary email (if configured)
```

Each Inngest step is independently retryable. Step 3 (LLM call) is the most likely to fail and will retry with exponential backoff.

### Flow 4: Ephemeral Token Issuance (Security-Critical)

```
Mobile -> API: tRPC session.createToken({ intent: "live_session" })
  |
API middleware: authenticate (Better Auth session token from expo-secure-store)
API middleware: authorize (user has technician/manager/owner role in org)
API middleware: rate limit (sliding window, 5/minute per user via Upstash)
  |
API handler:
  1. Create ai_sessions row (status: "pending", org_id, user_id)
  2. Build system prompt:
     - coreRolePrompt (static)
     - hvacExpertisePrompt (static)
     - safetyRulesPrompt (static)
     - orgOverlayPrompt (from org_settings.custom_system_prompt)
     - knowledgeBasePrompt (pre-fetch top articles for org)
     - sessionHistoryPrompt (technician's aggregated stats)
     - aiActTransparencyPrompt (static)
  3. Assemble tool declarations from registry (name, description, parameters for each tool)
  4. Call Google Gemini API to create ephemeral token:
     client.authTokens.create({
       config: {
         uses: 1,
         expireTime: now + 30min,
         newSessionExpireTime: now + 1min,
         liveConnectConstraints: {
           model: "gemini-2.5-flash-live",
           config: {
             sessionResumption: {},
             responseModalities: ["AUDIO"],
             temperature: 0.7,
           }
         },
         httpOptions: { apiVersion: "v1alpha" }
       }
     })
  5. Cache token metadata in Upstash Redis (TTL: 30min)
  6. Return { token, sessionId, systemPrompt, toolDeclarations, config }
```

**Security invariants:**
- The Gemini API key NEVER leaves the server. Mobile only receives the ephemeral token.
- Ephemeral tokens are single-use (uses: 1) but support session resumption within the 30min window.
- The token is locked to a specific model and response modality via `liveConnectConstraints`.
- The system prompt and tool declarations are locked server-side -- the mobile device cannot alter them.

---

## WebSocket Connection Management

### Connection Lifecycle State Machine

```
                    +----------+
                    |  IDLE    |
                    +----+-----+
                         |
                    createToken()
                         |
                    +----v-----+
                    | CONNECTING|
                    +----+-----+
                         |
                    WSS open + setup sent
                         |
                    +----v-----+
            +------>| ACTIVE   |<------+
            |       +----+-----+       |
            |            |             |
            |       GoAway / error     |
            |            |             |
            |       +----v-----+       |
            |       |RECONNECTING|-----+
            |       +----+-----+  (success)
            |            |
            |       max retries / token expired
            |            |
            |       +----v-----+
            +-------| ENDED    |
                    +----------+
```

### Reconnection Strategy

Based on the verified Gemini session management docs:

1. **Session resumption handles:** The server sends `SessionResumptionUpdate` messages during the session. Store the latest `handle` in the Zustand session store.
2. **On disconnect:** Start exponential backoff (1s -> 2s -> 4s -> 8s -> 16s -> max 30s).
3. **Reconnection attempt:** Open new WSS, pass `sessionResumption.handle` from stored handle.
4. **Handle validity:** Resumption handles are valid for 2 hours after disconnection. Beyond that, create a new session.
5. **GoAway handling:** Gemini sends a `GoAway` message with `timeLeft` before terminating. Use this window to prepare reconnection.

**Confidence: HIGH** -- verified against official Gemini Live API session management documentation.

### Session Duration Limits (Verified)

| Mode | Without Compression | With Compression |
|------|-------------------|-----------------|
| Audio-only | 15 minutes | Effectively unlimited |
| Audio + video | 2 minutes | Effectively unlimited |
| Connection lifetime | ~10 minutes | ~10 minutes (reconnect to continue) |

**Critical implication:** Context window compression MUST be enabled for audio+video sessions. Without it, sessions are limited to 2 minutes -- useless for HVAC field work. Configure `contextWindowCompression` with `SlidingWindow` in the setup message.

### Zustand Store Design for WebSocket State

Zustand is chosen because `getState()` and `setState()` work outside React -- required for WebSocket callbacks and native audio callbacks that fire outside the React render cycle.

```typescript
// apps/mobile/stores/session.store.ts
interface SessionState {
  // Connection state
  status: "idle" | "connecting" | "active" | "reconnecting" | "ended";
  sessionId: string | null;
  resumptionHandle: string | null;
  reconnectAttempts: number;

  // Streaming state
  isAudioStreaming: boolean;
  isVideoStreaming: boolean;
  lastAiResponse: string | null;

  // Tool call tracking
  pendingToolCalls: Map<string, { name: string; startedAt: number }>;

  // Metrics
  latencyMs: number;
  tokenCount: { input: number; output: number };

  // Actions
  connect: (token: string, config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  sendAudio: (pcmBuffer: ArrayBuffer) => void;
  sendImage: (jpegBase64: string) => void;
  handleToolCall: (toolCall: ToolCallEvent) => void;
  handleReconnect: () => Promise<void>;
}
```

**Why a flat state shape:** Deeply nested objects in Zustand cause unnecessary re-renders. Keep top-level primitives for connection status, and use Maps only where truly needed (pending tool calls).

---

## Audio/Video Streaming Architecture

### Audio Pipeline (Input)

```
Microphone -> expo-av (PCM capture)
  |  Config: 16kHz sample rate, 16-bit depth, mono, little-endian
  |  Chunk size: ~4096 samples (~256ms of audio)
  |
  v
Audio processor (apps/mobile/lib/gemini/audioProcessor.ts)
  |  - Validate PCM format
  |  - Base64 encode chunk
  |
  v
WebSocket send -> Gemini Live
  |  Message: { realtimeInput: { mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: base64 }] } }
```

### Audio Pipeline (Output)

```
Gemini Live -> WebSocket receive
  |  Event: serverContent with audio data (PCM 24kHz/16-bit/mono)
  |
  v
Audio processor (decode base64 -> PCM buffer)
  |
  v
react-native-audio-api (AudioBufferQueueSourceNode)
  |  - Queue-based playback (handles variable network latency)
  |  - Supports interruption (user speaks mid-response: flush queue)
  |
  v
Speaker output
```

### Video Pipeline (Input)

```
expo-camera -> Frame capture callback (1 FPS)
  |  Config: 768x768 max resolution, JPEG format
  |  Throttle: requestAnimationFrame-based, skip if previous frame still sending
  |
  v
Video processor (apps/mobile/lib/gemini/videoProcessor.ts)
  |  - Resize if needed (768px max dimension)
  |  - JPEG quality: 0.7 (balance quality vs bandwidth)
  |  - Base64 encode
  |
  v
WebSocket send -> Gemini Live
  |  Message: { realtimeInput: { mediaChunks: [{ mimeType: "image/jpeg", data: base64 }] } }
```

### Interruption Handling (Barge-In)

When the technician speaks while the AI is responding:
1. Gemini sends an interruption event
2. Mobile immediately flushes the audio playback queue (stops AI speech)
3. Mobile continues sending the technician's audio
4. Gemini processes the new input and generates a new response

This is critical for natural conversation flow in the field.

---

## Tool Calling Architecture

### Tool Definition Pattern

Every tool follows the `buildTool()` factory pattern (adapted from Claude Code):

```typescript
// packages/ai/tools/base.ts
interface ToolDef<TInput, TOutput> {
  name: string;
  description: string;       // What Gemini sees in function declaration
  inputSchema: ZodSchema<TInput>;
  outputSchema: ZodSchema<TOutput>;
  isReadOnly: () => boolean;
  call: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

interface ToolContext {
  orgId: string;
  sessionId: string;
  userId: string;
  db: DrizzleClient;
  vectorStore: VectorStore;
  embeddings: EmbeddingsClient;
}
```

### Tool Registry and Dispatch

```typescript
// packages/ai/tools/registry.ts
export function assembleToolPool(): Map<string, ToolDef> {
  const tools = new Map();
  tools.set("lookupErrorCode", lookupErrorCodeTool);
  tools.set("searchKnowledgeBase", searchKnowledgeBaseTool);
  tools.set("logFinding", logFindingTool);
  // Phase 1: start with 2-3 tools
  return tools;
}

// packages/ai/session/toolDispatcher.ts
export class ToolDispatcher {
  constructor(private deps: { toolPool: Map<string, ToolDef>; context: ToolContext }) {}

  async dispatch(toolCallId: string, name: string, args: unknown): Promise<ToolResponse> {
    const tool = this.deps.toolPool.get(name);
    if (!tool) return { id: toolCallId, error: `Unknown tool: ${name}` };

    const parsed = tool.inputSchema.safeParse(args);
    if (!parsed.success) return { id: toolCallId, error: parsed.error.message };

    const result = await Promise.race([
      tool.call(parsed.data, this.deps.context),
      timeout(10_000), // 10s timeout per tool
    ]);

    return { id: toolCallId, result };
  }
}
```

### Gemini Function Declaration Format

Tool declarations are sent in the WebSocket setup message:

```typescript
// Generated from each tool's prompt.ts
{
  tools: [{
    functionDeclarations: [
      {
        name: "lookupErrorCode",
        description: "Look up an HVAC error code...",
        parameters: {
          type: "OBJECT",
          properties: {
            manufacturer: { type: "STRING", description: "..." },
            code: { type: "STRING", description: "..." }
          },
          required: ["manufacturer", "code"]
        }
      },
      // ... more tools
    ]
  }]
}
```

### Async Tool Calling (Gemini-Specific)

Gemini 2.5 Flash Live supports async function calling: the AI continues streaming audio while tools execute in the background. This means:

- The tool call round-trip (mobile -> API -> DB/Qdrant -> API -> mobile -> Gemini) does NOT block audio
- Gemini may say "Let me look that up for you" while the tool executes
- When the tool response arrives, Gemini incorporates it into its next utterance
- Multiple concurrent tool calls are supported; each has a unique `toolCallId`

This is a significant UX advantage -- the technician never waits in silence.

---

## Knowledge Base Architecture

### Hybrid Search (Retrieval Phase)

Qdrant supports native hybrid search via prefetch-based queries, combining sparse (BM25-like) and dense (embedding) retrieval in a single API call.

```
Query: "Daikin VRV IV error code U4"
  |
  +-> Prefetch 1: Sparse vector search (BM25-like)
  |   Using: "sparse" named vector
  |   Limit: 50 candidates
  |   Captures: exact term matches ("U4", "VRV IV", "Daikin")
  |
  +-> Prefetch 2: Dense vector search (semantic)
  |   Using: "dense" named vector
  |   Limit: 50 candidates
  |   Captures: semantic similarity ("outdoor unit thermistor fault")
  |
  +-> Fusion: Reciprocal Rank Fusion (RRF)
  |   k: 60 (tunable)
  |   Weights: [1.0, 1.0] (equal weight to start, tune later)
  |   Result: top 20 candidates
  |
  +-> Metadata filter: org_id = current OR org_id IS NULL (global)
  |
  +-> Cross-encoder reranking (top 20 -> top 5)
  |   Model: lightweight cross-encoder (server-side)
  |
  +-> Context builder: format top 5 articles with confidence tags
      Output: structured tool response for Gemini
```

**Confidence: HIGH** -- Qdrant's hybrid query architecture is verified against their official documentation.

### Collection Configuration

Each Qdrant collection (`knowledge_articles`) stores two named vectors per point:

| Vector | Type | Dimensions | Purpose |
|--------|------|-----------|---------|
| `dense` | Dense float | 768-1536 (model-dependent) | Semantic similarity |
| `sparse` | Sparse (indices + values) | Variable | BM25-style keyword matching |

Plus payload fields: `org_id`, `article_id`, `equipment_brand`, `equipment_model`, `confidence_level`, `category`.

### Knowledge Flywheel Data Model

```
+------------------+     +-----------------+     +------------------+
| Raw Knowledge    |     | Knowledge       |     | Knowledge        |
| (session data,   |---->| Articles        |---->| Verifications    |
|  feedback, PDFs) |     | (wiki entries)  |     | (review queue)   |
+------------------+     +--------+--------+     +------------------+
                                  |
                                  v
                         +--------+--------+
                         | Qdrant Vectors  |
                         | (dense+sparse)  |
                         +-----------------+
```

### Scale Strategy

| Scale | Index Strategy | Retrieval Approach |
|-------|---------------|-------------------|
| < 500 articles (~400K words) | LLM reads index files directly | Direct context injection (no RAG needed) |
| 500 - 10K articles | Full Qdrant hybrid search | Prefetch + fusion + reranking |
| 10K+ articles | Qdrant with quantized first-stage | Two-stage: quantized candidates -> full rerank |

This graduated approach avoids over-engineering at launch while having a clear scaling path.

---

## Patterns to Follow

### Pattern 1: Layered System Prompt Assembly

**What:** Build the system prompt from ordered, composable fragments rather than a monolithic string.
**When:** Always -- every session needs a system prompt, and the composition varies per org/technician.

```typescript
const systemPrompt = buildEffectiveSystemPrompt([
  coreRolePrompt,           // Static: "You are an expert HVAC technician copilot..."
  hvacExpertisePrompt,      // Static: domain knowledge, troubleshooting frameworks
  safetyRulesPrompt,        // Static: F-Gas EU 2024/573, lockout/tagout
  orgOverlayPrompt,         // Dynamic: from org_settings.custom_system_prompt
  knowledgeBasePrompt,      // Dynamic: pre-fetched top articles for this org
  sessionHistoryPrompt,     // Dynamic: "This technician has handled 47 VRV installations"
  aiActTransparencyPrompt,  // Static: EU AI Act Art. 50 disclosure
]);
```

**Why this order matters:** Gemini weights earlier instructions more heavily. Safety rules before org customization ensures safety cannot be overridden by org-specific prompts.

### Pattern 2: Event-Driven Session Logging

**What:** Batch session events and flush periodically rather than logging each event individually.
**When:** During active sessions -- events fire at high frequency (audio chunks, model responses).

```typescript
// apps/mobile/lib/gemini/eventLogger.ts
class EventBatcher {
  private buffer: SessionEvent[] = [];
  private flushInterval = 5_000; // 5 seconds

  log(event: SessionEvent) {
    this.buffer.push(event);
  }

  private async flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    await trpc.session.logEvents.mutate({ events: batch });
  }
}
```

**Why:** Individual event logging during a session would add unacceptable latency and overwhelm the API. Batch at 5-second intervals as a compromise between data freshness and performance.

### Pattern 3: Constructor-Injected Tool Context

**What:** Tools receive their dependencies (DB, vector store, embeddings client) via a context object, not via imports.
**When:** All tool implementations.

```typescript
export const searchKnowledgeBaseTool = buildTool({
  name: "searchKnowledgeBase",
  // ...
  call: async (input, context: ToolContext) => {
    const vector = await context.embeddings.embed(input.query);
    const candidates = await context.vectorStore.hybridSearch(vector, {
      orgId: context.orgId,
      equipmentModel: input.equipment_context?.model,
    });
    const articles = await context.articleRepo.findByIds(candidates.map(c => c.id));
    return { articles, sources: articles.map(a => a.slug) };
  },
});
```

**Why:** Enables testing with mocked dependencies. A test can inject a fake vector store that returns predetermined results, making tool tests fast and deterministic.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: WebSocket Proxy Through Your Server

**What:** Routing all audio/video through your API server to Gemini.
**Why bad:** Doubles latency, creates a bottleneck, increases server costs dramatically (streaming video through your infra), and eliminates the key benefit of ephemeral tokens. A single audio+video session at 1 FPS JPEG + 16kHz PCM generates ~100-200KB/s of traffic -- multiply by concurrent users and your server becomes the bottleneck.
**Instead:** Use the client-direct architecture: mobile connects directly to Gemini via WebSocket using ephemeral tokens. Your server only handles token issuance and tool execution.

### Anti-Pattern 2: Tool Execution on the Mobile Device

**What:** Having the mobile app execute tool calls locally (e.g., querying a local SQLite database).
**Why bad:** Tools need access to the full knowledge base (Qdrant + Postgres), org-scoped data, and server-side secrets. Putting this on the device means syncing data, managing offline state, and exposing credentials.
**Instead:** Mobile forwards tool calls to the API server. The ~100-300ms round-trip is acceptable because Gemini's async function calling continues audio while tools execute.

### Anti-Pattern 3: Storing Raw Audio/Video

**What:** Recording and persisting audio/video from sessions.
**Why bad:** Massive GDPR liability (biometric data), storage costs, and the core privacy promise is stream-and-discard. Audio/video is sent directly to Gemini and never stored on your servers or the device.
**Instead:** Extract structured data during and after the session (equipment identified, procedures discussed, findings logged via tools). Store the structured summary, not the raw media.

### Anti-Pattern 4: Monolithic Session Orchestrator

**What:** A single class that handles WebSocket connection, audio encoding, video encoding, tool dispatch, event logging, and reconnection.
**Why bad:** Impossible to test, impossible to modify one concern without risking others, and violates the vertical slice principle.
**Instead:** Separate concerns into focused modules (connection.ts, audioProcessor.ts, videoProcessor.ts, toolDispatcher.ts, eventLogger.ts, reconnection.ts) that compose into the orchestrator.

### Anti-Pattern 5: Synchronous Knowledge Ingestion

**What:** Extracting knowledge and updating the wiki during or immediately after a session in the request path.
**Why bad:** LLM-driven knowledge compilation takes 5-30 seconds. Blocking the session end response while this runs creates a terrible UX.
**Instead:** Emit an Inngest event on session end. Knowledge ingestion, compilation, and health checks run asynchronously in background jobs with independent step-level retries.

---

## Suggested Build Order

The build order is driven by dependency analysis: what must exist before other components can be built and tested.

### Phase 1: Foundation (Week 1-2)

Build the shared types, database schema, and auth layer first. Everything depends on these.

```
1. packages/shared (Zod schemas, DTOs, constants, ErrorWithCode)
2. packages/config (Tailwind presets, tsconfig, biome config)
3. packages/db (Drizzle schema + migrations + repositories)
4. packages/auth (Better Auth config with org plugin)
5. packages/api (tRPC skeleton with org-scoped middleware, rate limiting)
6. apps/web (Next.js skeleton with tRPC handler, auth handler, Inngest handler)
7. apps/mobile (Expo skeleton with auth, tRPC client)
```

**Why first:** Every feature depends on auth (who is this user?), org scoping (which org?), and typed data contracts (what shape is the data?). Getting these wrong means rewriting everything built on top.

**Exit criteria:** A technician can sign up, join an org via invite code, and hit authenticated tRPC endpoints from both mobile and web.

### Phase 2: AI Pipeline Core (Week 3-4)

Build the tool system and session orchestration. This is the critical path.

```
1. packages/ai/tools/base.ts (buildTool factory, ToolDef types)
2. packages/ai/tools/lookupErrorCode/ (first concrete tool)
3. packages/ai/tools/logFinding/ (second tool, simplest)
4. packages/ai/tools/registry.ts (assembleToolPool)
5. packages/ai/session/toolDispatcher.ts (dispatch tool calls)
6. packages/ai/prompts/ (system prompt fragments + builder)
7. apps/web/app/api/token/ (ephemeral token endpoint)
8. packages/api/routers/session.ts (createToken, end, logEvents)
```

**Why this order:** Tools are self-contained and testable in isolation. The dispatcher depends on the registry. The token endpoint depends on the prompt builder and tool registry (it sends system prompt + tool declarations to Gemini). Start with 2 tools to prove the pattern, then add more incrementally.

**Exit criteria:** API can issue an ephemeral token with a locked system prompt and tool declarations. Tools can be dispatched and tested individually.

### Phase 3: Mobile Streaming (Week 5-6)

Build the real-time streaming pipeline on mobile. This is the highest-risk phase.

```
1. apps/mobile/stores/session.store.ts (Zustand state machine)
2. apps/mobile/lib/gemini/connection.ts (WebSocket lifecycle)
3. apps/mobile/lib/gemini/audioProcessor.ts (PCM capture + encode)
4. apps/mobile/lib/gemini/videoProcessor.ts (JPEG capture + encode)
5. apps/mobile/lib/gemini/reconnection.ts (exponential backoff + session resumption)
6. apps/mobile/app/(app)/session/ (session UI: camera, status, controls)
7. Integration: Mobile <-> Gemini Live <-> API (tool execution round-trip)
```

**Why this is the riskiest phase:**
- Audio/video streaming on React Native has platform-specific gotchas (Android background audio needs foreground service via @notifee, iOS needs audio session category configuration)
- WebSocket reconnection with session resumption has edge cases (handle expiration, context window limits)
- Audio playback queue management (buffering, interruption) requires careful tuning
- The 2-minute audio+video limit without compression means you MUST configure context window compression correctly from day one

**Exit criteria:** A technician can start a session, stream camera + audio to Gemini, receive spoken guidance, see tool calls execute, and survive a disconnection/reconnection.

### Phase 4: Knowledge Base (Week 7-9)

Build the knowledge base backend. This is complex but not on the critical path for the initial demo.

```
1. Qdrant collection setup (dense + sparse vectors, payload indices)
2. packages/ai/knowledge/storage/ (vectorStore, articleStore)
3. packages/ai/knowledge/retrieve/ (hybrid search, reranker, context builder)
4. packages/ai/tools/searchKnowledgeBase/ (the RAG tool)
5. packages/ai/knowledge/ingest/ (session ingester, manual ingester)
6. packages/ai/knowledge/compile/ (wiki compiler, article generator)
7. packages/ai/knowledge/verify/ (confidence scoring, review queue)
8. packages/api/jobs/ (Inngest: session.summarize, knowledge.ingest, knowledge.compile)
9. packages/ai/knowledge/health/ (coverage analyzer, consistency checker)
```

**Why after streaming:** The live session can work without the knowledge base (Gemini's base knowledge is decent for general HVAC). The knowledge base is the differentiator for long-term value, not the MVP demo.

**Exit criteria:** Knowledge articles can be created from session data, searched via hybrid retrieval, and surfaced during live sessions as tool responses with confidence tags.

### Phase 5: Polish and Production Readiness (Week 10-11)

```
1. i18n (react-i18next, 7 languages)
2. Offline reference (MMKV caching of recent summaries and articles)
3. Sentry + PostHog integration (mobile + web)
4. CI pipeline (Biome + typecheck + Vitest + build)
5. EAS Build configuration (preview + production profiles)
6. E2E tests (Maestro for mobile, Playwright for web)
```

### Critical Path Analysis

```
Foundation -> AI Pipeline -> Mobile Streaming -> Integration Testing
                |
                +-> Knowledge Base (parallel with Mobile Streaming)
```

**The critical path runs through Mobile Streaming.** The knowledge base can be built in parallel because the live session works without it (tools return "no results found" gracefully). But the streaming pipeline -- audio/video capture, WebSocket management, reconnection, tool call round-trip -- is the core magic and must work before anything else has value.

---

## Scalability Considerations

| Concern | At 50 users | At 1K users | At 10K users |
|---------|------------|-------------|-------------|
| Gemini connections | 50 concurrent WebSockets (within free tier) | Need to monitor quota; request limit increase | Dedicated capacity reservation |
| Tool execution | Single Vercel function handles all | Monitor cold starts; consider edge functions | Dedicated tool execution endpoints |
| Token issuance | Vercel serverless, no issue | Monitor Upstash rate limiting accuracy | Pre-warm token cache |
| Knowledge base (Qdrant) | Free tier (~1GB), single collection | Paid tier, add payload indices | Shard collection, add replicas |
| Session events (Postgres) | Single table, simple queries | Add indexes on session_id + timestamp | TimescaleDB extension for time-partitioning |
| Background jobs (Inngest) | Free tier (25K runs/month) | Monitor step count per session | Paid tier, concurrency controls |
| Audio bandwidth | Negligible (direct to Gemini) | Negligible (still direct) | Negligible (still direct) |

The client-direct architecture means audio/video bandwidth scales to zero on your infrastructure regardless of user count. Your server only handles metadata (token issuance, tool calls, event logs).

---

## Sources

- Google AI Gemini Live API documentation: https://ai.google.dev/gemini-api/docs/live (MEDIUM confidence -- verified connection architecture, audio formats, tool calling overview)
- Google AI Ephemeral Tokens documentation: https://ai.google.dev/gemini-api/docs/ephemeral-tokens (HIGH confidence -- verified token creation, TTL, constraints, liveConnectConstraints)
- Google AI Session Management documentation: https://ai.google.dev/gemini-api/docs/live-api/session-management (HIGH confidence -- verified session resumption handles, timeouts, GoAway, context window compression)
- Google AI Function Calling documentation: https://ai.google.dev/gemini-api/docs/function-calling (HIGH confidence -- verified parallel/async calling, function declaration format, error handling)
- Qdrant Hybrid Queries documentation: https://qdrant.tech/documentation/concepts/hybrid-queries/ (HIGH confidence -- verified prefetch + fusion architecture, RRF, sparse+dense pattern)
- Inngest Step Functions documentation: https://www.inngest.com/docs/features/inngest-functions/steps-workflows (MEDIUM confidence -- verified step.run retries, checkpointing pattern)
- Better Auth Organization Plugin documentation: https://www.better-auth.com/docs/plugins/organization (HIGH confidence -- verified roles, RBAC, invite flow, hooks)
- TECH-SPEC.md: Internal technical specification (HIGH confidence -- primary source for architecture decisions)
