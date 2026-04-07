# Phase 4: Session Lifecycle - Research

**Researched:** 2026-04-04
**Domain:** Session data persistence, background job processing (Inngest), offline caching (MMKV), AI summary generation (Gemini), mobile feedback UX
**Confidence:** HIGH

## Summary

Phase 4 transforms the live streaming session from a transient experience into a durable, data-driven lifecycle. The core work spans five domains: (1) database schema for sessions, findings, and tool calls; (2) incremental data persistence from the mobile client via tRPC mutations; (3) Inngest background job for AI-powered summary generation; (4) MMKV-based offline caching of session summaries; and (5) a feedback screen with star rating and session recap.

The existing codebase provides strong foundations: the Zustand session store tracks session state, the tRPC session router handles token creation, the repository pattern is established in `packages/db`, and the logFinding tool already defines the Finding data structure. The primary gaps are: no `ai_sessions` database table yet, no Inngest integration, no MMKV installation, and the session end flow navigates directly to Home rather than a feedback screen.

**Primary recommendation:** Build the schema and repositories first, then wire incremental persistence into the existing session flow, add the Inngest summary pipeline on the Bun server, implement MMKV caching, and finally build the feedback screen as a new Expo Router route.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Dedicated feedback screen after session end. Navigation flow: session -> feedback screen -> home. Full-screen route, not a bottom sheet or inline card.
- **D-02:** Star rating (1-5) is required. Text note is optional. "Skip" button available but de-emphasized. Maximizes feedback collection while respecting time pressure.
- **D-03:** Feedback screen shows a minimal session recap alongside the rating: duration, tools used, AI language detected. Helps the technician reflect before rating.
- **D-04:** AI session record created in the database when the technician starts the session (before WebSocket connects). Updated with end time, feedback, summary on completion. Captures failed/abandoned sessions too.
- **D-05:** Separate `session_findings` and `session_tool_calls` tables with FK to `ai_sessions`. Normalized schema for queryability and future analytics.
- **D-06:** Token usage tracked client-side by counting Gemini messages in Zustand store. Approximate count sufficient for cost estimation. Submitted on session end.
- **D-07:** Crash-resilient data collection. Findings and tool calls are persisted incrementally during the session (not just on session end). Implementation approach is Claude's discretion.
- **D-08:** Structured markdown summary with sections: Problem described, Steps taken, Findings logged, Recommendations. Scannable by managers.
- **D-09:** Use the best available Gemini model for summary generation (likely Gemini 2.5 Pro). Cost is secondary to quality.
- **D-10:** AI-generated content label as a badge/tag on the summary: "AI-generated summary" with an info icon. Visible but not intrusive. Satisfies COMP-07 / EU AI Act Art. 50.
- **D-11:** Technician sees their last session summary on the Home screen. No full session history UI in this phase. Summary also cached locally via MMKV.
- **D-12:** Cache the last 10-20 session summaries and their findings in MMKV. Auto-evict oldest when limit is reached.
- **D-13:** Skip KB article caching for now. Knowledge Base doesn't exist until Phase 5.
- **D-14:** Sync on app open and after each session ends. No real-time push, no manual-only refresh.
- **D-15:** No emotion recognition (COMP-08). Session quality measured only by explicit star rating and optional text feedback.

### Claude's Discretion
- Inngest job configuration and retry strategy for summary generation
- Exact ai_sessions schema columns beyond what decisions require
- Crash-resilient persistence approach (real-time tRPC mutations vs local MMKV buffer with periodic sync)
- Feedback screen visual design (star component, layout, animations)
- MMKV cache key structure and serialization format
- How session recap data flows from Zustand to the feedback screen
- Inngest handler route placement (Next.js API route vs Bun server route)

### Deferred Ideas (OUT OF SCOPE)
- Per-customer AI model selection for summaries
- KB article offline caching (wait for Phase 5)
- Full session history/explorer UI
- Real-time push for summary availability (tRPC SSE)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SESS-10 | Post-session feedback prompt: 1-5 stars + optional text note | Feedback screen route, star rating component, tRPC mutation, Zustand session recap data |
| SESS-11 | Session data persisted: start/end time, duration, language detected, tools used, feedback, token count | ai_sessions + session_findings + session_tool_calls schema, repository pattern, incremental tRPC mutations |
| SESS-12 | Post-session summary generated via Inngest background job | Inngest v4.1.2 on Bun server, Gemini 2.5 Pro generateContent, structured markdown output |
| INFRA-08 | Inngest background job handler | inngest/bun adapter on existing Bun server, serve() registration |
| UX-06 | Offline cached references: recent session summaries via MMKV | react-native-mmkv v4.3.0, createMMKV(), JSON serialization, eviction strategy |
| COMP-07 | AI-generated content labels on session summaries | Badge component, isAiGenerated flag on schema and DTO |
| COMP-08 | No emotion recognition: session quality measured only by explicit feedback | Enforce in schema design -- only feedbackRating (1-5) and feedbackNote (text). No sentiment analysis fields |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Import boundaries:** packages/ai/ must NOT import from @trpc/server. packages/db/ contains only Drizzle schema and repositories. packages/shared/ has Zod schemas and constants.
- **Styling:** NativeWind v4.2.3 + Tailwind CSS v3 (confirmed by package.json -- not v5 preview)
- **Drizzle:** Pinned to ^0.45.0, avoid v1.0.0-beta. Always run `bunx drizzle-kit generate` then `bunx drizzle-kit migrate`
- **Testing:** 80%+ test coverage for new code, co-located tests (*.test.ts next to source)
- **Error handling:** ErrorWithCode in services/repositories, TRPCError only in routers, conversion via middleware
- **Git:** Conventional commits, no force push, draft PRs by default
- **Comments:** Only "why", never "what"
- **No FK constraints to Better Auth tables** -- application-layer referential integrity (Phase 1 decision)
- **orgId from session.activeOrganizationId** -- enforced at middleware level
- **Gemini SDK:** Use `@google/genai` (not legacy @google/generative-ai). Use `apiVersion: 'v1alpha'` for Live API and ephemeral tokens.

## Standard Stack

### Core (New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| inngest | 4.1.2 | Background job framework | Serverless-native step functions, independent retries per step, event-driven triggers. Free tier 25K-50K runs/month. Native Bun adapter via `inngest/bun`. |
| react-native-mmkv | 4.3.0 | Offline local storage | 30x faster than AsyncStorage, fully synchronous, supports Expo with prebuild. V4 requires RN >= 0.74 + New Architecture (both met by Expo SDK 55 / RN 0.83). |

### Already Installed (Used in This Phase)

| Library | Version | Purpose | How Used |
|---------|---------|---------|----------|
| @google/genai | 1.48.0 | Gemini SDK for summary generation | `ai.models.generateContent()` with Gemini 2.5 Pro for structured session summaries |
| drizzle-orm | 0.45.2 | ORM for new schema tables | ai_sessions, session_findings, session_tool_calls table definitions |
| zod | 4.3.x | Schema validation | Session DTOs, feedback input validation, summary schema |
| zustand | 5.0.12 | Client state | Extended session store for findings, tool calls, token counts |
| @trpc/server + @trpc/client | 11.16.x | API layer | New tRPC procedures for session CRUD, feedback, summary retrieval |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inngest on Bun server | Inngest on Next.js API route | TECH-SPEC suggests Next.js route, but the Bun server is the current API server. Adding Inngest there avoids deploying Next.js prematurely. Next.js dashboard is a later milestone. |
| react-native-mmkv | AsyncStorage | MMKV is 30x faster, synchronous, required by CLAUDE.md ("AsyncStorage" listed in "What NOT to Use") |
| Real-time tRPC mutations for crash resilience | MMKV buffer with periodic sync | Real-time mutations are simpler: each finding/tool-call persists immediately via tRPC. MMKV buffer adds complexity (queue management, sync logic, conflict resolution) for marginal latency benefit on a 3G+ network. Recommend real-time mutations. |
| Gemini 2.5 Pro | Gemini 2.5 Flash | D-09 says "best available model, quality over cost." 2.5 Pro is described as the most advanced model for complex tasks. Use Pro for summaries, Flash for live sessions. |

**Installation:**
```bash
# Inngest on server
bun add inngest --filter apps/server

# MMKV on mobile (requires dev build, not Expo Go)
bunx expo install react-native-mmkv react-native-nitro-modules --filter apps/mobile
bunx expo prebuild --filter apps/mobile
```

## Architecture Patterns

### Recommended Project Structure (New Files)

```
packages/db/src/schema/
  ai-sessions.ts                    # ai_sessions table definition
  session-findings.ts               # session_findings table
  session-tool-calls.ts             # session_tool_calls table

packages/db/src/repositories/
  session.repository.ts             # SessionRepository class (CRUD for ai_sessions)
  session-finding.repository.ts     # SessionFindingRepository
  session-tool-call.repository.ts   # SessionToolCallRepository

packages/shared/src/schemas/
  session.schema.ts                 # SessionDTO, SessionSummaryDTO, FeedbackInputDTO
  session-finding.schema.ts         # SessionFindingDTO
  session-tool-call.schema.ts       # SessionToolCallDTO

packages/api/src/routers/
  session.router.ts                 # Extended with new procedures (existing file)

packages/api/src/jobs/
  inngest-client.ts                 # Inngest client instance
  session-summarize.ts              # session.summarize function
  index.ts                          # Export all functions

apps/server/src/
  index.ts                          # Extended with Inngest handler route

apps/mobile/
  app/(app)/feedback.tsx            # Feedback screen route
  components/session/FeedbackScreen.tsx  # Feedback UI component
  components/session/StarRating.tsx      # Reusable star rating input
  components/home/LastSessionCard.tsx    # Session summary card for Home screen
  lib/storage/session-cache.ts           # MMKV cache layer for sessions
  stores/session-store.ts               # Extended with findings, tool calls, token counts
```

### Pattern 1: Session Record Created Before WebSocket

**What:** Insert an `ai_sessions` row with status "connecting" when the technician taps "Start Session", before the WebSocket connects. This captures every session attempt, including failures and crashes.

**When to use:** Session start flow in `useGeminiSession.startSession()`

**Implementation approach:**
```typescript
// 1. Create session record via tRPC (returns sessionId)
const { sessionId } = await createSessionMutation.mutateAsync({});

// 2. Store sessionId in Zustand
store.getState().setSessionId(sessionId);

// 3. Proceed with token acquisition and WebSocket connection
const tokenData = await createTokenMutation.mutateAsync(undefined);
```

### Pattern 2: Incremental Persistence via tRPC Mutations

**What:** Each finding and tool call is persisted to the server immediately when it occurs, not batched at session end. This is the crash-resilience strategy.

**When to use:** During active session when Gemini calls logFinding or any other tool.

**Implementation approach:**
The tool relay already sends tool calls through the server (`ToolRelay.relay()`). Extend the `dispatchToolCalls` tRPC mutation to persist tool call records. For findings, the `logFinding` tool's `call()` already executes server-side -- extend it to write to `session_findings` table via repository instead of in-memory store.

**Why not MMKV buffer:** The tools already execute on the server (tool relay pattern from Phase 3). Adding server-side persistence at the tool execution layer is simpler than building a client-side MMKV queue with sync logic. The network round-trip already happens for every tool call.

### Pattern 3: Inngest Event-Driven Summary

**What:** When a session ends, send an `inngest.send({ name: "session/ended", data: { sessionId } })` event. The Inngest function fetches session data, generates an AI summary via Gemini 2.5 Pro, and updates the session record.

**When to use:** After session end mutation completes.

**Implementation approach:**
```typescript
// packages/api/src/jobs/session-summarize.ts
inngest.createFunction(
  { id: "session-summarize", retries: 3 },
  { event: "session/ended" },
  async ({ event, step }) => {
    const session = await step.run("fetch-session", async () => {
      return sessionRepo.findWithDetails(event.data.sessionId);
    });
    
    const summary = await step.run("generate-summary", async () => {
      return generateSessionSummary(session); // Gemini 2.5 Pro
    });
    
    await step.run("save-summary", async () => {
      return sessionRepo.updateSummary(session.id, summary);
    });
  }
);
```

### Pattern 4: MMKV Cache with LRU Eviction

**What:** Cache last N session summaries in MMKV with a key convention. On app open and after session end, sync from server. Auto-evict oldest entries when cache exceeds limit.

**When to use:** Home screen displays last session summary, offline access.

**Implementation approach:**
```typescript
// Key structure
const CACHE_KEYS = {
  sessionList: "sessions:list",         // JSON array of session IDs (ordered)
  session: (id: string) => `sessions:${id}`,  // Individual session + summary
  lastSynced: "sessions:lastSynced",    // ISO timestamp
};

const MAX_CACHED_SESSIONS = 20;
```

### Pattern 5: Feedback Screen as Route Gate

**What:** After session ends, navigate to `/feedback` with the session recap data instead of going directly Home. The feedback screen collects the rating and submits it, then navigates Home.

**When to use:** Session end flow.

**Implementation approach:**
- Change `handleEndConfirm` in SessionScreen from `router.replace("/(app)/(tabs)")` to `router.replace({ pathname: "/(app)/feedback", params: { sessionId } })`
- Feedback screen fetches session recap (from Zustand or tRPC) and displays it alongside star rating
- On submit/skip, persist feedback via tRPC and navigate Home

### Anti-Patterns to Avoid

- **Batch persistence at session end only:** A crash at minute 8 of a 10-minute session loses all findings and tool call data. Persist incrementally.
- **Putting Drizzle in the Inngest job directly:** Inngest jobs must go through repository classes, same as tRPC routers. The job file calls service/repository methods, never raw Drizzle.
- **Storing MMKV data as individual keys per field:** Store each session as a single JSON blob under one key. Many small keys increase serialization overhead.
- **Skipping the session record on failed connections:** D-04 says "captures failed/abandoned sessions too." Always create the DB row first.
- **Using InMemoryFindingStore in production:** The current `logFindingTool` uses `InMemoryFindingStore`. Phase 4 must replace this with a database-backed `FindingStore` implementation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Background job orchestration | Custom queue/worker with Redis | Inngest step functions | Independent retries per step, automatic de-duplication, built-in monitoring via Inngest Dev Server, zero infrastructure (runs on existing Bun server) |
| Offline local storage | Custom SQLite wrapper or AsyncStorage | MMKV via react-native-mmkv | 30x faster, synchronous reads, encryption support, Expo compatible |
| Star rating input | Custom TouchableOpacity array | Existing React Native star libraries or simple Pressable map | The star rating is simple enough to build with 5 Pressables mapping over [1,2,3,4,5], but avoid over-engineering with gesture handlers |
| Session summary AI prompt | Manual string concatenation | Structured prompt template with typed sections | Gemini 2.5 Pro needs a clear structured prompt to produce consistent markdown output. Use a template function. |

**Key insight:** Inngest eliminates the need to build retry logic, dead-letter queues, or job monitoring. Each `step.run()` is independently retryable -- if summary generation fails (e.g., Gemini API error), it retries that step without re-fetching session data.

## Common Pitfalls

### Pitfall 1: MMKV Requires Dev Build (Not Expo Go)

**What goes wrong:** MMKV uses native modules (JSI/TurboModules). It will crash in Expo Go.
**Why it happens:** Expo Go bundles a fixed set of native modules. MMKV is not included.
**How to avoid:** This aligns with the existing constraint -- Phase 3 already required dev builds for audio/camera. Ensure `expo prebuild` is run after installing MMKV. The `react-native-nitro-modules` peer dependency must also be installed.
**Warning signs:** "Native module MMKV is null" error at runtime.

### Pitfall 2: Inngest Dev Server Required Locally

**What goes wrong:** Inngest functions don't fire in local development without the Inngest Dev Server running.
**Why it happens:** Inngest works by registering functions with its platform (or local dev server). Without it, `inngest.send()` succeeds silently but nothing executes.
**How to avoid:** Run `bunx inngest-cli dev` alongside the Bun server. Set `INNGEST_DEV=1` in `.env.local`. Add to dev startup scripts.
**Warning signs:** Session ends, no summary appears, no errors in server logs.

### Pitfall 3: Better Auth Session Table Name Collision

**What goes wrong:** Better Auth already has a `session` table. Naming the AI session table `session` or `sessions` causes confusion.
**Why it happens:** Both are "sessions" in different contexts -- auth sessions vs AI guidance sessions.
**How to avoid:** Name the table `ai_sessions` (as specified in TECH-SPEC). The `session` export from `packages/db/src/schema/auth.ts` is the Better Auth session table.
**Warning signs:** Import ambiguity, wrong table referenced in queries.

### Pitfall 4: Zustand Store Reset Before Feedback Screen

**What goes wrong:** Current `endSession()` calls `store.getState().reset()` after a 100ms delay. If the feedback screen reads session data from Zustand, it gets empty state.
**Why it happens:** The reset happens in `useGeminiSession.endSession()` -- it was designed to clean up before returning to Home.
**How to avoid:** Delay the Zustand reset until AFTER the feedback screen has captured the data it needs (duration, tools used, findings count). The feedback screen should capture session recap data into local state or route params before cleanup.
**Warning signs:** Feedback screen shows "0s" duration, "0 tools used."

### Pitfall 5: Gemini API Key in Inngest Job Context

**What goes wrong:** The Inngest job runs server-side and needs a Gemini API key for summary generation. The key used for Live API (ephemeral tokens) is different from standard generation.
**Why it happens:** Ephemeral tokens lock the model to Live API. Summary generation uses standard `generateContent` which needs the server-side API key directly.
**How to avoid:** Use `process.env.GEMINI_API_KEY` directly in the Inngest job. Standard `generateContent` does NOT use `apiVersion: 'v1alpha'` -- it uses the default API version.
**Warning signs:** 401 errors from Gemini in the Inngest job.

### Pitfall 6: Inngest Bun Adapter Route Integration

**What goes wrong:** The existing Bun server uses a `fetch()` handler with manual URL routing. Inngest's Bun adapter expects `Bun.serve({ routes: { "/api/inngest": serve(...) } })`.
**Why it happens:** Bun 1.2.3+ supports the `routes` property alongside `fetch()` as fallback. However, the current server code uses only the `fetch()` pattern.
**How to avoid:** Two approaches: (1) Migrate to `routes` for all paths, or (2) call the Inngest serve handler inside the existing `fetch()` function by matching the pathname. Approach 2 is less disruptive: check `if (url.pathname.startsWith("/api/inngest"))` and delegate to the Inngest handler.
**Warning signs:** 404 on `/api/inngest` when Inngest tries to register.

## Code Examples

### Database Schema: ai_sessions

```typescript
// packages/db/src/schema/ai-sessions.ts
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const aiSessionStatusEnum = pgEnum("ai_session_status", [
  "connecting",
  "active",
  "completed",
  "failed",
  "timeout",
  "abandoned",
]);

export const aiSessions = pgTable("ai_sessions", {
  id: varchar("id", { length: 30 }).primaryKey(),
  orgId: varchar("org_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  status: aiSessionStatusEnum("status").notNull().default("connecting"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  modelVersion: varchar("model_version", { length: 100 }),
  languageDetected: varchar("language_detected", { length: 10 }),
  tokenCountInput: integer("token_count_input"),
  tokenCountOutput: integer("token_count_output"),
  feedbackRating: integer("feedback_rating"),    // 1-5, nullable
  feedbackNote: text("feedback_note"),
  summary: text("summary"),                      // AI-generated markdown
  isAiGenerated: boolean("is_ai_generated").default(false), // COMP-07 label flag
  toolsUsed: jsonb("tools_used").$type<string[]>(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Database Schema: session_findings

```typescript
// packages/db/src/schema/session-findings.ts
import { pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { aiSessions } from "./ai-sessions.js";

export const findingCategoryEnum = pgEnum("finding_category", [
  "safety", "maintenance", "regulatory", "observation", "recommendation",
]);

export const findingSeverityEnum = pgEnum("finding_severity", [
  "low", "medium", "high", "critical",
]);

export const sessionFindings = pgTable("session_findings", {
  id: varchar("id", { length: 30 }).primaryKey(),
  sessionId: varchar("session_id", { length: 30 }).notNull()
    .references(() => aiSessions.id),
  category: findingCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  severity: findingSeverityEnum("severity").notNull(),
  equipmentModel: varchar("equipment_model", { length: 200 }),
  manufacturer: varchar("manufacturer", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Database Schema: session_tool_calls

```typescript
// packages/db/src/schema/session-tool-calls.ts
import { integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { aiSessions } from "./ai-sessions.js";

export const sessionToolCalls = pgTable("session_tool_calls", {
  id: varchar("id", { length: 30 }).primaryKey(),
  sessionId: varchar("session_id", { length: 30 }).notNull()
    .references(() => aiSessions.id),
  toolName: varchar("tool_name", { length: 100 }).notNull(),
  input: jsonb("input"),
  output: jsonb("output"),
  durationMs: integer("duration_ms"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Note: `boolean` import needed -- add `import { boolean } from "drizzle-orm/pg-core"` in both ai-sessions and session-tool-calls. The ai-sessions example above references `boolean` but the import line should include it.

### Inngest Client Setup

```typescript
// packages/api/src/jobs/inngest-client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "aucta" });
```

### Inngest Bun Server Integration

```typescript
// apps/server/src/index.ts -- add Inngest handler
import { serve as inngestServe } from "inngest/bun";
import { inngest } from "@aucta/api/jobs/inngest-client";
import { sessionSummarize } from "@aucta/api/jobs/session-summarize";

// Inside the fetch handler, add before the 404 fallback:
if (url.pathname.startsWith("/api/inngest")) {
  const inngestHandler = inngestServe({
    client: inngest,
    functions: [sessionSummarize],
  });
  response = await inngestHandler(req);
}
```

### Summary Generation with Gemini 2.5 Pro

```typescript
// packages/api/src/jobs/session-summarize.ts
import { GoogleGenAI } from "@google/genai";

async function generateSessionSummary(session: SessionWithDetails): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = buildSummaryPrompt(session);
  
  const result = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: prompt,
  });
  
  return result.text ?? "";
}

function buildSummaryPrompt(session: SessionWithDetails): string {
  return `Generate a structured session summary in markdown format.

## Session Context
- Duration: ${session.durationMs ? Math.round(session.durationMs / 1000 / 60) : 0} minutes
- Language: ${session.languageDetected ?? "unknown"}
- Tools used: ${session.toolsUsed?.join(", ") ?? "none"}

## Findings
${session.findings.map(f => `- [${f.severity.toUpperCase()}] ${f.category}: ${f.description}`).join("\n")}

## Tool Call Results
${session.toolCalls.map(tc => `- ${tc.toolName}: ${tc.success ? "success" : "failed"}`).join("\n")}

## Required Output Format
Produce exactly these sections:
### Problem Described
### Steps Taken
### Findings Logged
### Recommendations

Keep it concise and scannable. Use bullet points. This will be read by managers reviewing technician work.`;
}
```

### MMKV Cache Layer

```typescript
// apps/mobile/lib/storage/session-cache.ts
import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "session-cache" });

const KEYS = {
  sessionIds: "cache:sessionIds",
  session: (id: string) => `cache:session:${id}`,
  lastSynced: "cache:lastSynced",
};

const MAX_CACHED = 20;

export function cacheSession(session: CachedSession): void {
  const ids: string[] = JSON.parse(storage.getString(KEYS.sessionIds) ?? "[]");
  
  // Add to front (most recent first)
  const updated = [session.id, ...ids.filter(id => id !== session.id)];
  
  // Evict oldest if over limit
  while (updated.length > MAX_CACHED) {
    const evicted = updated.pop()!;
    storage.remove(KEYS.session(evicted));
  }
  
  storage.set(KEYS.sessionIds, JSON.stringify(updated));
  storage.set(KEYS.session(session.id), JSON.stringify(session));
}

export function getLastSession(): CachedSession | null {
  const ids: string[] = JSON.parse(storage.getString(KEYS.sessionIds) ?? "[]");
  if (ids.length === 0) return null;
  const data = storage.getString(KEYS.session(ids[0]));
  return data ? JSON.parse(data) : null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inngest v3 (transformers) | Inngest v4.1.2 (step functions, native Bun adapter) | 2025 | Native `inngest/bun` serve adapter eliminates need for Express/Hono wrapper |
| AsyncStorage for RN storage | MMKV v4.3.0 (Nitro Modules based) | 2025 | 30x faster, synchronous, requires New Architecture (Expo SDK 55 default) |
| @google/generative-ai (legacy) | @google/genai v1.48.0 | 2025 | Unified SDK, `ai.models.generateContent()` replaces `model.generateContent()` |
| Inngest on Next.js API routes only | Inngest on Bun via inngest/bun | 2024 | Can add Inngest to existing Bun server without deploying Next.js |

**Deprecated/outdated:**
- `InMemoryFindingStore` (packages/ai/src/tools/logFinding/): Must be replaced with a database-backed implementation for production
- Direct Home navigation after session end: Must be replaced with feedback screen route

## Open Questions

1. **Gemini 2.5 Pro model name string**
   - What we know: The docs show `"gemini-2.5-pro"` as the model identifier. The page lists it as the most advanced model.
   - What's unclear: Exact model name may need verification (could be `"gemini-2.5-pro-latest"` or a dated version).
   - Recommendation: Use `"gemini-2.5-pro"` and fall back to `"gemini-2.5-flash"` if Pro is unavailable or returns errors. Set model name as environment variable for flexibility.

2. **Inngest Bun adapter with existing fetch handler**
   - What we know: Bun 1.2.3+ supports `routes` property alongside `fetch()`. The Inngest Bun adapter returns a handler for use in `routes`.
   - What's unclear: Whether the Inngest handler returned by `serve()` is a plain `(req: Request) => Response` that can be called inside an existing `fetch()` handler, or if it requires the `routes` property specifically.
   - Recommendation: Test calling the Inngest handler inside the existing `fetch()`. If incompatible, migrate to Bun's `routes` property (additive, non-breaking).

3. **Token counting accuracy**
   - What we know: D-06 says "approximate count sufficient." Client-side counting by incrementing on each Gemini message.
   - What's unclear: Gemini Live WebSocket does not return token counts per message. Counting messages is a rough proxy.
   - Recommendation: Count audio chunks sent (input proxy) and turn-complete events (output proxy). Store as approximate. Accurate token counting requires Gemini billing API integration (future).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Server runtime + Inngest host | Yes | 1.3.x | -- |
| Node.js | Metro bundler | Yes | -- | -- |
| Neon Postgres | Session data persistence | Yes | EU Frankfurt | -- |
| Inngest CLI (dev server) | Local background job testing | No (install needed) | -- | `bunx inngest-cli dev` (auto-download) |
| react-native-mmkv | Offline caching | No (install needed) | -- | Install via `bunx expo install react-native-mmkv react-native-nitro-modules` |
| Gemini API key | Summary generation | Yes (env var) | -- | -- |

**Missing dependencies with no fallback:**
- None that block execution. All missing dependencies are installable.

**Missing dependencies with fallback:**
- Inngest CLI: auto-downloads via `bunx inngest-cli dev`
- MMKV: requires `expo prebuild` after install (already required for audio/camera dev builds)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` (root workspace) + per-package configs |
| Quick run command | `bun run test --filter packages/api` |
| Full suite command | `bun run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SESS-10 | Feedback submission persists rating + note | unit | `vitest run packages/api/src/routers/session.router.test.ts` | Partial (existing file, new tests needed) |
| SESS-11 | Session data persisted with all required fields | unit | `vitest run packages/db/src/repositories/session.repository.test.ts` | Wave 0 |
| SESS-11 | Incremental finding persistence | unit | `vitest run packages/api/src/routers/session.router.test.ts` | Wave 0 |
| SESS-12 | Inngest summary function executes steps | unit | `vitest run packages/api/src/jobs/session-summarize.test.ts` | Wave 0 |
| INFRA-08 | Inngest handler responds to registration | integration | `vitest run apps/server/src/inngest.test.ts` | Wave 0 |
| UX-06 | MMKV cache stores/retrieves/evicts sessions | unit | `vitest run apps/mobile/lib/storage/session-cache.test.ts` | Wave 0 |
| COMP-07 | Summary marked as AI-generated | unit | `vitest run packages/shared/src/schemas/session.schema.test.ts` | Wave 0 |
| COMP-08 | No emotion/sentiment fields in schema | unit | Schema validation test (part of session schema tests) | Wave 0 |

### Sampling Rate

- **Per task commit:** `bun run test --filter <affected-package>`
- **Per wave merge:** `bun run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/db/src/repositories/session.repository.test.ts` -- covers SESS-11
- [ ] `packages/db/src/repositories/session-finding.repository.test.ts` -- covers SESS-11
- [ ] `packages/db/src/repositories/session-tool-call.repository.test.ts` -- covers SESS-11
- [ ] `packages/api/src/jobs/session-summarize.test.ts` -- covers SESS-12
- [ ] `packages/shared/src/schemas/session.schema.test.ts` -- covers COMP-07, COMP-08
- [ ] `apps/mobile/lib/storage/session-cache.test.ts` -- covers UX-06

## Sources

### Primary (HIGH confidence)
- Inngest official docs (serve handlers, framework adapters, step functions) -- https://www.inngest.com/docs/learn/serving-inngest-functions -- Bun adapter confirmed as `inngest/bun`
- Inngest official docs (quick start, createFunction API) -- https://www.inngest.com/docs/getting-started/nextjs-quick-start
- react-native-mmkv GitHub README -- https://github.com/mrousavy/react-native-mmkv -- V4 API confirmed: createMMKV(), get/set/remove
- Bun.serve official docs -- https://bun.sh/docs/api/http -- routes property confirmed for Bun 1.2.3+
- @google/genai official docs (text generation) -- https://ai.google.dev/gemini-api/docs/text-generation -- `ai.models.generateContent()` API confirmed
- Gemini models page -- https://ai.google.dev/gemini-api/docs/models -- Gemini 2.5 Pro listed as most advanced model

### Secondary (MEDIUM confidence)
- npm registry: inngest@4.1.2, react-native-mmkv@4.3.0, @google/genai@1.48.0, drizzle-orm@0.45.2 -- versions verified via `npm view`
- TECH-SPEC.md session data model (ai_sessions table schema) -- project-internal document
- Existing codebase patterns (repository pattern, DTO boundaries, error handling) -- verified by reading source files

### Tertiary (LOW confidence)
- Gemini 2.5 Pro exact model string ("gemini-2.5-pro") -- training data, not verified against latest API. The docs page showed "gemini-3-flash-preview" for the latest models, suggesting model naming may have evolved. Recommend environment variable for model name.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Inngest and MMKV are well-documented, versions verified on npm
- Architecture: HIGH -- follows established project patterns (repository, DTO, vertical slices)
- Pitfalls: HIGH -- based on actual codebase analysis (Zustand reset timing, Better Auth table collision, Expo Go limitation)
- Inngest Bun integration: MEDIUM -- adapter exists, but exact fetch-handler interop pattern needs validation
- Gemini summary model: MEDIUM -- model name may need runtime verification

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days -- stable technologies, no fast-moving dependencies)
