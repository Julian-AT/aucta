# Phase 10: Gemini Migration & Session Hardening - Research

**Researched:** 2026-04-10
**Domain:** Gemini Live API migration, server migration (Bun -> Next.js), session reliability, cost optimization, pricing enforcement
**Confidence:** HIGH

## Summary

Phase 10 addresses 11 requirements spanning model migration (AI-01..03), session reliability (SESS-01..04), cost optimization (COST-01..02), and pricing enforcement (PRICE-01..02). The phase also deletes `apps/server` and migrates all backend functionality to `apps/web` Next.js API routes.

The existing codebase is well-structured for these changes. The service layer pattern with constructor injection is already established (STANDARDS.md), the tool system (`buildTool()` factory, `dispatchToolCalls()`, `assembleToolPool()`) is solid, and the DB client already uses `@neondatabase/serverless` HTTP driver which is Edge-compatible. The primary technical risks are: (1) the Edge vs Node.js runtime decision for `dispatchToolCalls` given Vercel's recent recommendation to migrate from Edge to Node.js, (2) Silero VAD integration on React Native requiring ONNX Runtime for React Native, and (3) the structured logger needing a mobile-compatible variant since `process.stdout.write` does not exist in React Native.

**Primary recommendation:** Execute the server migration first (it unblocks all other work), then model migration + singleton fix + logging + keepalive (all low-effort reliability fixes), then pricing enforcement (new DB schema), and finally Layer 2 items (VAD, scene detection, concise prompting).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Mobile-direct + Edge relay -- Mobile keeps its direct Gemini WebSocket connection via ephemeral tokens. Tool calls relay through Vercel Edge Functions (dispatchToolCalls). ~100-200ms latency. Pure serverless, no persistent server process.
- **D-02:** All `apps/server` functionality migrates into `apps/web` -- Token endpoint, tool dispatch, session CRUD, Inngest handlers all become Next.js API routes. `apps/server` directory gets deleted.
- **D-03:** `dispatchToolCalls` runs as a Vercel Edge Function (~0ms cold start). Other tRPC routes stay as standard Node.js serverless functions.
- **D-04:** Ephemeral tokens stay -- required for the mobile-direct Gemini connection. Token generation moves from `apps/server` to a Next.js API route in `apps/web`.
- **D-05:** Migration targets: `apps/web/app/api/trpc/[trpc]/route.ts` (tRPC handler), `apps/web/app/api/auth/[...all]/route.ts` (Better Auth), `apps/web/app/api/inngest/route.ts` (Inngest handler).
- **D-06:** Block new sessions only -- when org reaches session cap, new sessions are blocked (API returns 429). In-progress sessions are NEVER interrupted.
- **D-07:** Validation plan -- free/validation period has unlimited sessions (no cap). Used for onboarding and testing.
- **D-08:** Four pricing tiers: Validation (unlimited/free), Starter (EUR 29/30 sessions), Professional (EUR 49/60 sessions), Enterprise (EUR 79/unlimited).
- **D-09:** Count on start -- session counts increment when the session begins, not when it ends.
- **D-10:** Conservative VAD -- Silero WASM with 0.3 speech probability threshold, 500ms silence duration before cutting, 300ms padding on speech boundaries.
- **D-11:** Pixel diff scene-change detection -- downscale frames to 128x128 grayscale, compute mean absolute pixel difference, 15% threshold.
- **D-12:** Context-adaptive response length -- 1-2 sentences for simple, 3-4 for complex. Hard cap of 4 sentences max.
- **D-13:** Auto-detect language -- keep current behavior where Gemini auto-detects the technician's language.

### Claude's Discretion
- Exact wording for concise output additions (D-12) -- as long as it achieves the sentence limits
- Pixel diff implementation details beyond the specified parameters (D-11)
- VAD integration approach with expo-audio / audio capture pipeline (D-10)
- Edge Function configuration details for dispatchToolCalls (D-03)
- Order of migration tasks for apps/server -> apps/web (D-02, D-05)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | Update model to `gemini-3.1-flash-live-preview` | Single constant change in `session.service.ts:32`. WebSocket URL in `protocol.ts` remains the same (v1alpha endpoint). |
| AI-02 | Tool calls relay through Vercel Edge Functions | Edge Function architecture pattern documented. tRPC split approach required. DB client is already Edge-compatible. |
| AI-03 | Concise output prompting (1-4 sentences) | Additive change to existing 3-layer prompt architecture. New prompt layer for conciseness. |
| SESS-01 | Fix singleton anti-pattern (constructor injection) | Existing service deps interfaces documented. QdrantClient and EmbeddingService need to be added to SessionServiceDeps and KnowledgeServiceDeps. |
| SESS-02 | Replace console.log with structured logger in connection.ts | 6 specific call sites identified. Logger needs mobile-compatible variant since `process.stdout.write` is unavailable in React Native. |
| SESS-03 | WebSocket keepalive pings (30s interval) | GeminiConnection class documented. Keepalive pattern with application-level messages (RN has no WebSocket ping API). |
| SESS-04 | Replace z.any() with typed Zod schemas | `session.router.ts:41` identified. Tool input schemas exist in buildTool definitions; use `z.unknown()` for args field. |
| COST-01 | Client-side VAD (Silero WASM) | ONNX Runtime for React Native required. Integration into AudioCapture pipeline documented. Layer 2. |
| COST-02 | Scene-change detection (pixel diff) | expo-image-manipulator already in use. Extend FrameCapture with diff logic. Layer 2. |
| PRICE-01 | Tiered pricing enforcement (4 tiers, block at cap) | New DB schema for org_usage_periods. Service-layer cap checking with atomic SQL increment. Layer 2. |
| PRICE-02 | Session usage tracking per org | Repository + service pattern. tRPC endpoint for usage query. Layer 2. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Logging:** Use `logger` from `@aucta/shared/utils/logger` everywhere. No `console.log` in production code.
- **Service Layer:** Services contain all business logic. Routers are thin wrappers. Services throw `ErrorWithCode`. Services accept deps via constructor injection.
- **File size:** 400 lines typical, 800 max per file.
- **Testing:** 80% coverage, co-located tests, services tested with injected mock dependencies.
- **Naming:** kebab-case.ts for modules, PascalCase.tsx for React components. Classes: PascalCase. DB: snake_case, TS: camelCase.
- **Security:** Explicit CORS allowlist. Env vars validated at startup. Ephemeral tokens never logged.
- **What NOT to use:** Prisma, Firebase Auth, Supabase, pgvector, socket.io, Redux, `@google/generative-ai` (legacy), `console.log`.
- **Drizzle:** Pin to `^0.45.0`, NOT v1.0-beta.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Verified |
|---------|---------|---------|----------|
| `@google/genai` | 1.48.x | Gemini SDK (ephemeral tokens, Live API) | [VERIFIED: codebase import] |
| `drizzle-orm` | ^0.45.0 | ORM (neon-http driver) | [VERIFIED: packages/db/src/client.ts] |
| `@neondatabase/serverless` | installed | Neon HTTP driver (Edge-compatible) | [VERIFIED: packages/db/src/client.ts uses `neon()` from this package] |
| `zod` | ^4.3.0 | Schema validation | [VERIFIED: codebase] |
| `@trpc/server` | ^11.16.0 | API layer | [VERIFIED: codebase] |
| `inngest` | ^4.1.0 | Background jobs | [VERIFIED: packages/api/src/jobs/] |
| `next` | ^16.2.0 | Web framework | [VERIFIED: apps/web/package.json] |
| `expo-image-manipulator` | SDK 55 | Image resize/manipulate | [VERIFIED: apps/mobile/lib/gemini/frame-capture.ts] |
| `react-native-audio-api` | 0.11.7 | Audio capture | [VERIFIED: apps/mobile/lib/gemini/audio-capture.ts] |

### New Dependencies for This Phase
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `onnxruntime-react-native` | latest | ONNX inference for Silero VAD | COST-01 (Layer 2 only) |
| `jpeg-js` | latest | JPEG decode for pixel diff | COST-02 (Layer 2 only) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function for dispatchToolCalls | Node.js serverless function | Vercel now recommends Node.js over Edge. Fluid Compute gives Node.js similar cold start performance. See pitfall section. |
| onnxruntime-react-native | @ricky0123/vad-react-native | Dedicated VAD package may simplify integration but adds an unmaintained dependency layer. Direct ONNX Runtime gives more control. |
| expo-image-manipulator for scene diff | react-native-skia | Skia has GPU-accelerated pixel operations, but adds heavy dependency for simple pixel comparison. |

## Architecture Patterns

### Server Migration: apps/server -> apps/web API Routes

The current `apps/server/src/index.ts` (159 lines) contains 5 route handlers that must migrate:

```
apps/server/src/index.ts (DELETE after migration)
  /health              -> apps/web/app/api/health/route.ts
  /ready               -> apps/web/app/api/ready/route.ts
  /api/auth/*           -> apps/web/app/api/auth/[...all]/route.ts
  /api/trpc/*           -> apps/web/app/api/trpc/[...trpc]/route.ts
  /api/inngest          -> apps/web/app/api/inngest/route.ts
```

**CORS handling:** Currently manual `withCors()` wrapper in Bun.serve(). Must become Next.js middleware at `apps/web/middleware.ts` that applies CORS headers to all `/api/*` routes. [VERIFIED: Pitfall 1 in PITFALLS.md]

**tRPC handler pattern (Next.js App Router):**
```typescript
// apps/web/app/api/trpc/[...trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@aucta/api";
import { createTRPCContext } from "@aucta/api/trpc";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
```
[VERIFIED: current server already uses `fetchRequestHandler`; `createTRPCContext` accepts `{ headers }` -- see packages/api/src/trpc.ts]

**Better Auth handler:**
```typescript
// apps/web/app/api/auth/[...all]/route.ts
import { auth } from "@aucta/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```
[CITED: Better Auth docs, PITFALLS.md Pitfall 2]

**Inngest handler:**
```typescript
// apps/web/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest, sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth } from "@aucta/api/jobs";

const handler = serve({
  client: inngest,
  functions: [sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth],
});

export { handler as GET, handler as POST, handler as PUT };
```
[CITED: Inngest docs require GET, POST, AND PUT exports -- PITFALLS.md Pitfall 10]

### Edge Function for dispatchToolCalls (D-03)

Since tRPC routes share a single catch-all handler (`/api/trpc/[...trpc]/route.ts`) which is Node.js runtime, dispatchToolCalls cannot be made Edge within tRPC. It must be a **separate API route**.

```
apps/web/app/api/dispatch-tools/route.ts   (runtime: 'edge')
```

The mobile `ToolRelay` class currently calls `trpc.session.dispatchToolCalls.mutate()`. After migration, it calls the standalone Edge endpoint directly (not via tRPC). This is simpler and avoids the tRPC overhead for this latency-critical path.

```typescript
// apps/web/app/api/dispatch-tools/route.ts
export const runtime = 'edge';
export const preferredRegion = 'fra1'; // EU Frankfurt, close to Neon DB

export async function POST(req: Request) {
  // Auth check (extract session from cookie/token)
  // Parse body: { functionCalls: [...] }
  // Build tool pool, dispatch, return responses
}
```

**Edge compatibility verified:**
- `@neondatabase/serverless` neon HTTP driver: Edge-compatible [VERIFIED: packages/db/src/client.ts already uses `neon()` + `drizzle-orm/neon-http`]
- Qdrant JS client: Uses `fetch` internally, Edge-compatible [ASSUMED]
- `@google/genai` embedding: Uses `fetch` for HTTP requests, Edge-compatible [ASSUMED]
- `zod`: Pure JavaScript, Edge-compatible [VERIFIED: no Node.js deps]

**Edge Runtime constraints to observe:**
- 25-second initial response timeout (sufficient for tool execution which targets <10s) [VERIFIED: Vercel Edge docs]
- 1MB code size limit on Hobby, 2MB on Pro (after gzip) -- bundle size must be monitored [VERIFIED: Vercel Edge docs]
- No `eval`, no dynamic code eval, no dynamic WebAssembly compilation [VERIFIED: Vercel Edge docs]
- Compatible Node.js modules: `async_hooks`, `events`, `buffer`, `assert`, `util` only [VERIFIED: Vercel Edge docs]

### Singleton Fix Pattern (SESS-01)

Current anti-pattern in `session.service.ts:194-209` and `knowledge.service.ts:203-206`:
```typescript
// BAD: Creates new clients on every call
private getSearchKnowledgeBaseTool(): AnyToolDef | null {
  const qdrantClient = createQdrantClient({...});  // NEW per call
  const embeddingService = new GeminiEmbeddingService({...}); // NEW per call
  return createSearchKnowledgeBaseTool({ qdrantClient, embeddingService });
}
```

Fix: Add to constructor deps interface and inject once:
```typescript
interface SessionServiceDeps {
  sessionRepo: SessionRepository;
  findingRepo: SessionFindingRepository;
  toolCallRepo: SessionToolCallRepository;
  inngest: Inngest;
  qdrantClient: ReturnType<typeof createQdrantClient> | null;      // NEW
  embeddingService: GeminiEmbeddingService | null; // NEW
}
```

Same pattern for `KnowledgeServiceDeps` -- add `qdrantClient` and `embeddingService` as optional deps. Create once at service composition root (router file or DI container), inject to both services.

### WebSocket Keepalive Pattern (SESS-03)

Add to `GeminiConnection` class:
```typescript
private keepaliveInterval: ReturnType<typeof setInterval> | null = null;

private startKeepalive(): void {
  this.keepaliveInterval = setInterval(() => {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    // Send application-level ping
    // Use a minimal message that Gemini treats as no-op
    this.ws.send(JSON.stringify({ clientContent: { turns: [] } }));
  }, 30_000);
}

private stopKeepalive(): void {
  if (this.keepaliveInterval) {
    clearInterval(this.keepaliveInterval);
    this.keepaliveInterval = null;
  }
}
```

React Native's WebSocket implementation does NOT expose `.ping()` method. Application-level keepalive via empty/minimal messages is the standard approach. [ASSUMED: React Native WebSocket spec does not include ping/pong methods in the JS API]

Start keepalive after `onSetupComplete`, stop on `close()`. If keepalive response is not received within 30s, trigger reconnection via `deps.onDisconnect`.

### Pricing Enforcement Pattern (PRICE-01/PRICE-02)

New database schema:
```typescript
// packages/db/src/schema/org-usage.ts
export const pricingTierEnum = pgEnum("pricing_tier", [
  "validation", "starter", "professional", "enterprise"
]);

export const orgUsagePeriods = pgTable("org_usage_periods", {
  id: varchar("id", { length: 30 }).primaryKey(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  tier: pricingTierEnum("tier").notNull().default("validation"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  sessionCount: integer("session_count").notNull().default(0),
  sessionCap: integer("session_cap"), // null = unlimited
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Session cap check in service layer (not middleware, per STANDARDS.md):
```typescript
// In SessionService.createSession()
async createSession(orgId: string, userId: string, modelVersion?: string) {
  const usage = await this.usageRepo.getCurrentPeriod(orgId);
  if (usage.sessionCap !== null && usage.sessionCount >= usage.sessionCap) {
    throw ErrorWithCode.Forbidden("SESSION_CAP_EXCEEDED");
  }
  await this.usageRepo.incrementSessionCount(orgId);
  // ... create session
}
```

The router maps `ErrorWithCode.Forbidden` to tRPC `FORBIDDEN` (which returns 403), but the requirement says 429. The errorConverter middleware needs a `SESSION_CAP_EXCEEDED` -> 429 mapping. Use `ErrorWithCode.TooManyRequests` or add a new error code. [ASSUMED: errorConverter currently maps Forbidden to FORBIDDEN/403; 429 needs custom handling]

### Mobile Logger for connection.ts (SESS-02)

The existing logger at `packages/shared/src/utils/logger.ts` uses `process.stdout.write` and `process.stderr.write`. React Native does not have these APIs. Two options:

**Option A (recommended):** Platform-aware logger that detects the runtime:
```typescript
const isNode = typeof process !== 'undefined'
  && typeof process.stdout?.write === 'function';

const write = isNode
  ? (output: string) => process.stdout.write(`${output}\n`)
  : (output: string) => console.log(output); // Structured JSON via console in RN

const writeError = isNode
  ? (output: string) => process.stderr.write(`${output}\n`)
  : (output: string) => console.error(output);
```

**Option B:** Separate mobile logger module that implements the same interface but uses `console.log`/`console.error` internally. Since the goal is **structured JSON** logging, using `console.log(JSON.stringify(entry))` in React Native achieves structured output (Sentry/LogBox will capture it).

The key requirement is: structured JSON with `level`, `msg`, `timestamp`, and context -- NOT raw `console.log("[GeminiWS] Connected")`.

### VAD Integration Pattern (COST-01, Layer 2)

Pipeline: `AudioCapture.onChunk` -> `VADFilter.process` -> `GeminiConnection.sendAudio`

```typescript
export class VADFilter {
  private session: InferenceSession | null = null;
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  private readonly SPEECH_THRESHOLD = 0.3;
  // 500ms silence = N frames based on 16kHz/4096 buffer (~256ms per buffer)
  private readonly SILENCE_FRAMES = 2;
  // 300ms padding = ~1 frame
  private readonly PADDING_FRAMES = 1;

  async init(): Promise<void> {
    // Load Silero VAD .onnx model via onnxruntime-react-native
    this.session = await InferenceSession.create(SILERO_MODEL_PATH);
  }

  process(pcmFloat32: Float32Array): boolean {
    // Run inference on audio chunk
    // Return true if speech detected (including padding window)
  }
}
```

The Silero VAD v5 model file (~2MB .onnx) must be bundled with the app. `onnxruntime-react-native` runs inference natively (not WASM) on iOS/Android using CoreML/NNAPI respectively. [ASSUMED: onnxruntime-react-native supports Silero v5 model format]

### Scene-Change Detection Pattern (COST-02, Layer 2)

Extend `FrameCapture` with diff logic. Since `expo-image-manipulator` is already used:

```typescript
export class FrameCapture {
  private previousPixels: Uint8Array | null = null;
  private readonly DIFF_THRESHOLD = 0.15;
  private readonly THUMBNAIL_SIZE = 128;

  private async shouldSendFrame(photoUri: string): Promise<boolean> {
    // 1. Resize to 128x128 using expo-image-manipulator
    // 2. Decode JPEG to pixels using jpeg-js
    // 3. Convert to grayscale (average of R,G,B)
    // 4. Compare with previousPixels using mean absolute difference
    // 5. If diff > DIFF_THRESHOLD, update previousPixels, return true
    // 6. Otherwise return false (skip frame)
  }
}
```

Use `jpeg-js` (pure JS, ~15KB, no native deps) to decode the small 128x128 JPEG thumbnail to raw RGBA pixels, then compute grayscale diff. At 128x128 the decode is <1ms. [ASSUMED: jpeg-js works in React Native JavaScript runtime]

### Anti-Patterns to Avoid
- **Do NOT create new Qdrant/embedding clients per tool call.** This is the exact anti-pattern being fixed in SESS-01.
- **Do NOT put pricing enforcement in tRPC middleware.** It belongs in SessionService per STANDARDS.md (services contain business logic).
- **Do NOT mix tRPC and Edge runtime in the same route handler.** They require separate API routes.
- **Do NOT use `WebSocket.ping()` in React Native.** The JS WebSocket API does not expose this method. Use application-level keepalive messages.
- **Do NOT hardcode the model name.** Use env var `GEMINI_LIVE_MODEL` with fallback (already in place).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS in Next.js | Custom per-route CORS headers | `middleware.ts` with centralized CORS logic | One place to maintain, covers all routes including preflight |
| VAD from scratch | Custom speech detection algorithm | Silero VAD model via onnxruntime-react-native | Silero is state-of-the-art, trained on millions of samples |
| JPEG pixel decoding | Custom base64 -> pixel decoder | `jpeg-js` npm package | Battle-tested JPEG decoder, handles edge cases |
| Session cap counting | Raw SQL increment with race conditions | Drizzle `sql` template with atomic UPDATE ... WHERE | Atomic increment prevents race conditions |
| Edge auth validation | Custom JWT parsing in Edge | Extract from cookie, validate via DB lookup | Auth must match the same session validation as tRPC routes |

**Key insight:** The tool system (`buildTool`, `assembleToolPool`, `dispatchToolCalls`) is already well-engineered and does NOT need replacement. The migration is about WHERE it runs (Edge Function instead of Bun.serve), not HOW it works.

## Common Pitfalls

### Pitfall 1: CORS Breaks Mobile After Server Migration
**What goes wrong:** Mobile app gets 403/CORS errors after switching from `apps/server` (Bun) to `apps/web` (Next.js) because CORS headers are missing.
**Why it happens:** The current server has a manual `withCors()` wrapper applied to every response. Next.js API routes don't have this by default.
**How to avoid:** Create `apps/web/middleware.ts` that applies CORS for all `/api/*` routes. Test mobile app against Next.js BEFORE deleting apps/server.
**Warning signs:** Mobile tRPC calls failing with CORS errors; Better Auth returning 403.
[VERIFIED: PITFALLS.md Pitfall 1]

### Pitfall 2: Inngest Functions Not Registered After Migration
**What goes wrong:** After migrating from `inngest/bun` to `inngest/next`, existing Inngest functions (sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth) stop executing.
**Why it happens:** Different adapter API. `inngest/next` returns `{ GET, POST, PUT }` that must be individually exported. Missing the PUT export breaks sync. Missing any function from the registration array makes it invisible.
**How to avoid:** Export ALL functions from a single registry. Export GET, POST, AND PUT. Verify all functions appear in Inngest dashboard after migration.
**Warning signs:** Inngest dashboard showing fewer functions than expected; session summaries stop generating.
[VERIFIED: PITFALLS.md Pitfall 10]

### Pitfall 3: Edge Function Bundle Size Exceeds Limit
**What goes wrong:** The dispatchToolCalls Edge Function fails to deploy because the bundle (Drizzle + Neon driver + Qdrant client + @google/genai + Zod + tool definitions) exceeds the 1MB (Hobby) or 2MB (Pro) gzipped limit.
**Why it happens:** Edge Functions have strict code size limits. The @google/genai SDK alone may be significant.
**How to avoid:** Monitor bundle size during development. Use tree-shaking aggressively. Only import the specific functions needed (not full packages). If bundle is too large, fall back to Node.js runtime (Vercel now recommends this anyway).
**Warning signs:** Vercel deployment failing with code size limit error.

### Pitfall 4: Edge Function Cannot Access Session Auth
**What goes wrong:** The standalone Edge Function at `/api/dispatch-tools` cannot validate the user's session because Better Auth session validation may not be Edge-compatible.
**Why it happens:** Better Auth's session validation may use Node.js-specific APIs internally. The Edge Function is outside tRPC, so it doesn't get the `orgProcedure` middleware.
**How to avoid:** Implement auth in the Edge Function by reading the session cookie/token and validating against the database directly (the DB is Edge-compatible via neon-http). Or pass a session token from mobile that can be verified with a simple DB lookup.
**Warning signs:** Edge Function returning 401 even for authenticated users; session cookie not being forwarded to standalone endpoint.

### Pitfall 5: Keepalive Messages Trigger Gemini Processing
**What goes wrong:** Application-level keepalive messages (sent every 30s) are interpreted by Gemini as input, causing the model to respond to empty messages.
**Why it happens:** Gemini Live API processes all incoming messages. If the keepalive message has content, it triggers model processing.
**How to avoid:** Test the exact keepalive message format. Use the minimal possible message that keeps the WebSocket alive without triggering model processing. The `clientContent: { turns: [] }` format or similar empty-payload messages are candidates. Test empirically.
**Warning signs:** Model producing unexpected audio responses every 30 seconds; token usage increasing without user input.

### Pitfall 6: z.any() Replacement Breaks Existing Tool Calls
**What goes wrong:** After replacing `z.any()` with typed schemas in the dispatchToolCalls input, existing tool calls from the mobile app fail validation because the args shapes don't match the new strict schema.
**Why it happens:** The typed schema is more restrictive than `z.any()`. If the mobile app sends args with extra properties or slightly different shapes, Zod rejects them.
**How to avoid:** Use `z.record(z.string(), z.unknown())` instead of a strict union of per-tool schemas for the `args` field. The actual per-tool validation happens inside `dispatchToolCalls` via `tool.validateInput()`. The router-level schema should be permissive for args but strict for the envelope (id, name, args structure).
**Warning signs:** Mobile tool calls failing with Zod validation errors; `VALIDATION_ERROR` responses for previously working tools.
[VERIFIED: dispatcher.ts:58 calls `tool.validateInput(fc.args)` which does per-tool Zod parsing]

### Pitfall 7: Session Count Race Condition
**What goes wrong:** Two concurrent session starts for the same org both read the current count, both determine they're under the cap, and both succeed -- exceeding the cap by 1.
**Why it happens:** Read-then-write pattern without atomic operation.
**How to avoid:** Use atomic SQL increment: `UPDATE org_usage_periods SET session_count = session_count + 1 WHERE org_id = $1 AND session_count < session_cap RETURNING session_count`. If no rows updated, cap was hit.
**Warning signs:** Org occasionally exceeds session cap by 1-2 sessions.

### Pitfall 8: Vercel Edge Runtime Recommendation Changed
**What goes wrong:** Vercel's documentation now contains a warning: "We recommend migrating from edge to Node.js for improved performance and reliability. Both runtimes run on Fluid compute with Active CPU pricing." The Edge Function provides no measurable advantage over Node.js.
**Why it happens:** Vercel Fluid Compute now gives Node.js functions near-zero cold starts, eliminating Edge's historical advantage. Edge has stricter limits (code size, API coverage) with no offsetting benefit.
**How to avoid:** This is a locked decision (D-03). Implement as Edge per decision, but monitor performance. If bundle size or compatibility issues arise during implementation, escalate to user for reconsideration.
**Warning signs:** Bundle size issues; Node.js-only dependencies needed; no measurable latency improvement over Node.js.
[VERIFIED: Vercel Edge Runtime docs contain explicit warning to migrate to Node.js]

## Code Examples

### Model Constant Update (AI-01)
```typescript
// packages/api/src/services/session.service.ts line 32
// BEFORE:
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? "gemini-2.5-flash-live-preview";
// AFTER:
const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";
```
[VERIFIED: session.service.ts:32]

### Singleton Fix (SESS-01) - SessionService
```typescript
// BEFORE (session.service.ts:194-209):
private getSearchKnowledgeBaseTool(): AnyToolDef | null {
  const qdrantClient = createQdrantClient({...});     // NEW every call
  const embeddingService = new GeminiEmbeddingService({...}); // NEW every call
  return createSearchKnowledgeBaseTool({ qdrantClient, embeddingService });
}

// AFTER: Inject via constructor
interface SessionServiceDeps {
  // ... existing deps ...
  qdrantClient: ReturnType<typeof createQdrantClient> | null;
  embeddingService: GeminiEmbeddingService | null;
}

private getSearchKnowledgeBaseTool(): AnyToolDef | null {
  if (!this.qdrantClient || !this.embeddingService) return null;
  return createSearchKnowledgeBaseTool({
    qdrantClient: this.qdrantClient,
    embeddingService: this.embeddingService,
  });
}
```
[VERIFIED: session.service.ts lines 194-209, knowledge.service.ts lines 203-206]

### Next.js Middleware for CORS
```typescript
// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Handle preflight
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers",
        "Content-Type, Cookie, Authorization, X-Requested-With");
      res.headers.set("Access-Control-Allow-Credentials", "true");
      res.headers.set("Access-Control-Max-Age", "86400");
    }
    return res;
  }

  // Add CORS to actual responses
  const res = NextResponse.next();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return res;
}

export const config = { matcher: "/api/:path*" };
```
[ASSUMED: pattern based on current withCors() in apps/server/src/index.ts]

### Typed Tool Args Schema (SESS-04)
```typescript
// BEFORE (session.router.ts:41):
args: z.record(z.string(), z.any()),

// AFTER:
args: z.record(z.string(), z.unknown()),
```
Note: `z.unknown()` is the correct replacement for `z.any()`. The actual per-tool input validation happens inside `dispatchToolCalls` via `tool.validateInput(fc.args)` which uses each tool's Zod schema. The router schema validates the envelope structure, not the per-tool args.
[VERIFIED: dispatcher.ts:58 calls `tool.validateInput(fc.args)` which does per-tool Zod parsing]

### Concise Output Addition
```typescript
// New prompt layer to add to the existing 3-layer architecture:
export const conciseOutputGuide = `## RESPONSE FORMAT
During active field work, keep responses concise:
- Simple confirmations or acknowledgments: 1-2 sentences maximum
- Step-by-step guidance or safety warnings: 3-4 sentences maximum
- NEVER exceed 4 sentences in a single response
- Lead with the most important information
- Omit pleasantries and filler during active diagnostics
When the technician asks a direct question, answer directly.`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel Edge for low latency | Vercel Node.js with Fluid Compute | 2025-2026 | Edge no longer provides cold start advantage; Node.js recommended |
| Gemini 2.5 Flash Live async tool calling | Gemini 3.1 Flash Live sync tool calling | March 2026 | Tool calls now block response stream; server-side execution critical |
| Mobile-relay tool calls | Server-side (or Edge) tool execution | Forced by 3.1 | Eliminates 200-500ms mobile relay latency |
| `z.any()` for flexible input | `z.unknown()` + runtime validation | Zod 4 best practice | Type safety without breaking existing tool dispatch |

**Deprecated/outdated:**
- `gemini-2.5-flash-live-preview` -- Being shut down, replace with `gemini-3.1-flash-live-preview` [CITED: AUDIT-REPORT.md]
- `inngest/bun` adapter -- Replace with `inngest/next` for Next.js API routes [VERIFIED: PITFALLS.md]
- `apps/server` Bun.serve() -- Being deleted entirely per D-02

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Qdrant JS client uses `fetch` internally and is Edge-compatible | Architecture Patterns (Edge Function) | Edge Function cannot execute searchKnowledgeBase tool; would need Node.js fallback |
| A2 | `@google/genai` embedding endpoint uses `fetch` and is Edge-compatible | Architecture Patterns (Edge Function) | Cannot generate embeddings in Edge Function; searchKnowledgeBase tool breaks |
| A3 | React Native WebSocket does not expose `.ping()` method | Architecture Patterns (Keepalive) | If ping() is available, use native WebSocket ping instead of application-level messages |
| A4 | `onnxruntime-react-native` supports Silero VAD v5 model format and Expo SDK 55 | Standard Stack | VAD integration blocked; would need alternative approach |
| A5 | `jpeg-js` works in React Native JavaScript runtime | Architecture Patterns (Scene Detection) | Cannot decode JPEG for pixel comparison; need alternative decoder |
| A6 | Application-level keepalive does not trigger Gemini model processing | Architecture Patterns (Keepalive) | Keepalive causes unwanted model responses; must find alternative message format |
| A7 | `errorConverter` currently maps Forbidden to 403; 429 needs new error code | Architecture Patterns (Pricing) | Session cap exceeded returns wrong HTTP status code |
| A8 | Gemini 3.1 Flash Live WebSocket endpoint URL is same as 2.5 (v1alpha) | Phase Requirements | WebSocket connection fails after model update; need to update protocol.ts URL |

## Open Questions

1. **Keepalive message format for Gemini WebSocket**
   - What we know: WebSocket connections drop after NAT timeout (~60-120s) without keepalive
   - What's unclear: What message format keeps the connection alive without triggering Gemini model processing? Does Gemini support WebSocket-level ping/pong frames?
   - Recommendation: Test with `clientContent: { turns: [] }` first. If it triggers responses, try a minimal `realtimeInput` with empty data. Document working format.

2. **Edge Function bundle size feasibility**
   - What we know: Edge has 1-2MB gzipped limit. dispatchToolCalls needs Drizzle + Neon + Qdrant + Zod + genai SDK.
   - What's unclear: Whether the combined bundle fits within limits after tree-shaking.
   - Recommendation: Build the Edge Function early in implementation. If bundle size is a problem, fall back to Node.js runtime. Report to user if D-03 needs revision.

3. **onnxruntime-react-native + Expo SDK 55 compatibility**
   - What we know: onnxruntime-react-native exists and supports native ONNX inference on iOS/Android.
   - What's unclear: Whether it works with Expo SDK 55 New Architecture (default in SDK 55).
   - Recommendation: Since COST-01 is Layer 2, defer investigation until Layer 1 is complete.

4. **429 status code for session cap exceeded**
   - What we know: Requirements say 429. Current errorConverter maps to standard tRPC codes (403, 404, etc.).
   - What's unclear: How to return 429 from tRPC (not a standard tRPC error code).
   - Recommendation: Use tRPC's `TOO_MANY_REQUESTS` error code which maps to HTTP 429. Add this mapping to errorConverter.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js | Server migration | Yes | ^16.2.0 | -- |
| Vercel Edge Runtime | D-03 (dispatchToolCalls) | Yes (deployment) | -- | Node.js runtime |
| Neon Postgres | DB access | Yes | EU Frankfurt | -- |
| Qdrant | searchKnowledgeBase tool | Yes | 1.17.x (EU) | -- |
| onnxruntime-react-native | COST-01 (VAD) | Needs install | -- | Skip VAD (Layer 2) |
| jpeg-js | COST-02 (scene detection) | Needs install | -- | Skip scene detection (Layer 2) |

**Missing dependencies with no fallback:** None -- all blocking dependencies are available.

**Missing dependencies with fallback:**
- `onnxruntime-react-native`: Only needed for Layer 2 COST-01. If incompatible with Expo SDK 55, VAD can be deferred.
- `jpeg-js`: Only needed for Layer 2 COST-02. If problematic, scene detection can use approximate methods (base64 length comparison).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` (root workspace, projects: packages/* + apps/mobile) |
| Quick run command | `bun vitest run --project=api` |
| Full suite command | `bun vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-01 | Model name updated in ephemeral token creation | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -t "model"` | Yes (update assertion) |
| AI-02 | dispatchToolCalls accessible via Edge Function | integration | Manual deploy test or mock Edge env | Needs new test |
| AI-03 | Concise guidance included in system instruction | unit | `bun vitest run packages/api/src/routers/session.router.test.ts -t "prompt"` | Yes (update assertion) |
| SESS-01 | Services use injected clients, not per-call creation | unit | `bun vitest run packages/api/src/services/` | Needs new test file |
| SESS-02 | Zero console.log in connection.ts | lint/grep | `grep -c "console\." apps/mobile/lib/gemini/connection.ts` | No test file needed |
| SESS-03 | Keepalive sends ping every 30s | unit | `bun vitest run apps/mobile/lib/gemini/connection.test.ts` | Needs new test file |
| SESS-04 | z.any() replaced with z.unknown() | unit | `bun vitest run packages/api/src/routers/session.router.test.ts` | Yes (existing covers) |
| COST-01 | VAD filters silence frames | unit | `bun vitest run apps/mobile/lib/gemini/vad-filter.test.ts` | Wave 0 (Layer 2) |
| COST-02 | Scene detection skips static frames | unit | `bun vitest run apps/mobile/lib/gemini/frame-capture.test.ts` | Partial (needs diff test) |
| PRICE-01 | Session blocked when cap exceeded | unit | `bun vitest run packages/api/src/services/session.service.test.ts` | Needs new test |
| PRICE-02 | Usage tracking returns current month totals | unit | `bun vitest run packages/api/src/services/usage.service.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun vitest run --project=api --project=mobile`
- **Per wave merge:** `bun vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/api/src/services/session.service.test.ts` -- covers AI-01, SESS-01, PRICE-01 (service-level tests for singleton fix and pricing)
- [ ] `apps/mobile/lib/gemini/connection.test.ts` -- covers SESS-03 (keepalive test)
- [ ] `packages/api/src/services/usage.service.test.ts` -- covers PRICE-02 (usage tracking)
- [ ] `apps/mobile/lib/gemini/vad-filter.test.ts` -- covers COST-01 (Layer 2, can be deferred)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Better Auth session validation on new Edge Function endpoint |
| V3 Session Management | Yes | Ephemeral tokens (single-use, 1-min start, 30-min window) |
| V4 Access Control | Yes | orgProcedure middleware; session cap enforcement per org |
| V5 Input Validation | Yes | Zod schemas on all inputs; `z.unknown()` replacing `z.any()` |
| V6 Cryptography | No | No new crypto operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Session cap bypass via race condition | Tampering | Atomic SQL increment (not read-then-write) |
| Unauthenticated tool dispatch via Edge endpoint | Spoofing | Auth validation in Edge Function before tool execution |
| CORS misconfiguration after server migration | Information Disclosure | Explicit origin allowlist in middleware.ts |
| Ephemeral token leakage in logs | Information Disclosure | STANDARDS.md: never log tokens. Verify new Edge Function follows this. |

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/server/src/index.ts`, `packages/api/src/services/session.service.ts`, `packages/api/src/services/knowledge.service.ts`, `packages/api/src/routers/session.router.ts`, `packages/ai/src/tools/dispatcher.ts`, `apps/mobile/lib/gemini/connection.ts`, `apps/mobile/lib/gemini/protocol.ts`, `apps/mobile/lib/gemini/tool-relay.ts`, `apps/mobile/lib/gemini/audio-capture.ts`, `apps/mobile/lib/gemini/frame-capture.ts`, `packages/db/src/client.ts`
- `.planning/AUDIT-REPORT.md` -- Architecture critique, cost model, action plan
- `.planning/research/PITFALLS.md` -- Known migration gotchas
- `.planning/research/SUPPLEMENTAL-RESEARCH-REPORT.md` -- Gemini inference tiers, Silero VAD
- `STANDARDS.md` -- Code conventions and patterns
- Vercel Edge Runtime docs: https://vercel.com/docs/functions/runtimes/edge [VERIFIED: April 2026]
- Vercel Functions limits: https://vercel.com/docs/functions/limitations [VERIFIED: April 2026]
- Neon serverless driver docs: https://neon.com/docs/serverless/serverless-driver [VERIFIED]
- Inngest Next.js docs: https://www.inngest.com/docs/reference/serve [VERIFIED]

### Secondary (MEDIUM confidence)
- Gemini Live API docs: https://ai.google.dev/gemini-api/docs/live (model names, API surface)

### Tertiary (LOW confidence)
- onnxruntime-react-native compatibility with Expo SDK 55 (not verified)
- jpeg-js compatibility with React Native runtime (not verified)
- Qdrant JS client Edge Runtime compatibility (assumed based on fetch usage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries verified in codebase, versions confirmed
- Architecture (server migration): HIGH -- Current code thoroughly analyzed, migration path clear
- Architecture (Edge Function): MEDIUM -- Vercel docs verified but bundle size and auth patterns need runtime testing
- Architecture (VAD/scene detection): LOW -- Layer 2, dependencies not yet verified with Expo SDK 55
- Pitfalls: HIGH -- Based on codebase analysis and verified PITFALLS.md

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable stack, 30-day validity)
