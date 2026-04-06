# Phase 6: Wire Knowledge Pipeline - Research

**Researched:** 2026-04-06
**Domain:** Inngest function registration, tRPC mutation wiring, Zustand store integration
**Confidence:** HIGH

## Summary

Phase 6 closes integration gaps identified in the v1.0 milestone audit. The self-learning knowledge base pipeline code is fully implemented and tested at the unit/integration level (Phase 5), but three Inngest functions are not registered in the server entry point, and the logFinding tool's findings never persist to the database because the mobile client does not call the `addFinding` tRPC mutation.

The fixes are surgical: (1) add 3 imports and function registrations to `apps/server/src/index.ts`, (2) wire `addFinding` tRPC mutation from the mobile `onToolCall` callback when a `logFinding` tool response is detected, and (3) call `incrementFindingsCount` on the Zustand store when findings are persisted. No new business logic, schemas, or services need to be written.

**Primary recommendation:** This phase is purely integration wiring. All code paths exist and are tested. The planner should structure tasks as small, targeted edits with integration-level verification rather than building anything new.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KB-04 | Session ingestion pipeline: extract learnings from completed sessions, generate candidate articles (Inngest job) | `knowledgeIngest` function fully implemented in `packages/api/src/jobs/knowledge-ingest.ts`, triggers on `session/ended`. Only needs registration in `apps/server/src/index.ts` inngestServe(). |
| KB-05 | Article compilation: LLM generates/updates structured wiki articles from raw session data | `knowledgeCompile` function fully implemented in `packages/api/src/jobs/knowledge-compile.ts`, triggers on `knowledge/articles-ingested`. Only needs registration in inngestServe(). |
| KB-07 | Verification queue: pending articles await review, status transitions | Backend works (tRPC endpoints + confidence ladder). Auto-creation of pending records is in `knowledgeIngest` code (line 81-86). Will work once `knowledgeIngest` is registered. Also requires `addFinding` wiring so findings feed the ingestion pipeline with quality data. |
| KB-08 | Health monitoring: coverage gap detection, stale article detection, consistency checking | `knowledgeHealth` cron function fully implemented in `packages/api/src/jobs/knowledge-health.ts`, triggers at `0 3 * * *`. Only needs registration in inngestServe(). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives from CLAUDE.md relevant to this phase:

- **Architecture:** Repository pattern (Drizzle stays in repositories), DTO boundaries (Zod-validated), constructor injection, vertical slices, ErrorWithCode in services / TRPCError only in routers
- **Inngest v4:** Uses triggers array in config object, not separate second argument (D-28 decision)
- **Testing:** 80%+ coverage for new code, co-located tests, Vitest workspace with per-package configs
- **Git:** Conventional commits, never force push, push before checking CI
- **Zustand:** `getState()`/`setState()` outside React render cycle for WebSocket callbacks
- **PR:** Draft mode by default, under 500 lines, conventional commit titles
- **Quality:** Comment why not what, clarity over cleverness

## Standard Stack

No new libraries required. This phase uses only existing dependencies.

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| inngest | 4.1.2 | Background job framework | Installed in @aucta/server and @aucta/api |
| inngest/bun | 4.1.2 | Bun-native serve adapter | Already imported in apps/server/src/index.ts |
| @tanstack/react-query | 5.x | tRPC mutation hooks | Already in mobile app |
| zustand | 5.0.x | Session state management | Already in mobile app |

No `npm install` or `bun add` commands needed.

## Architecture Patterns

### Current Architecture (What Exists)

```
Event Flow (currently broken at >>>):
  session.router.ts (endSession mutation)
    -> inngest.send({ name: "session/ended" })
    -> sessionSummarize (registered, works)
    >>> knowledgeIngest (NOT registered, dead)
    >>> knowledgeCompile (NOT registered, dead)
    >>> knowledgeHealth (NOT registered, dead)

logFinding Flow (currently broken at >>>):
  Gemini -> tool call -> mobile ToolRelay -> server dispatchToolCalls
    -> logFindingTool.call() -> InMemoryFindingStore (ephemeral, lost on request end)
    >>> addFinding tRPC mutation (exists, never called)
    >>> session_findings table (exists, always empty)
```

### Target Architecture (After Phase 6)

```
Event Flow (all registered):
  session.router.ts (endSession mutation)
    -> inngest.send({ name: "session/ended" })
    -> sessionSummarize (fetch/generate/save summary)
    -> knowledgeIngest (extract/create articles/embed/trigger compile)
      -> inngest.send({ name: "knowledge/articles-ingested" })
      -> knowledgeCompile (merge/compile/backlink/re-embed)
    -> knowledgeHealth (cron 0 3 * * *, coverage gaps/stale/conflicts)

logFinding Flow (wired end-to-end):
  Gemini -> tool call -> mobile ToolRelay -> server dispatchToolCalls
    -> logFindingTool.call() -> InMemoryFindingStore (server-side, for Gemini response)
    -> mobile onToolCall detects logFinding -> addFinding.mutate() -> session_findings table
    -> incrementFindingsCount() -> Zustand store
```

### Pattern 1: Inngest Function Registration

**What:** All Inngest functions must be imported and passed to the `functions` array in `inngestServe()`.

**Current state (apps/server/src/index.ts lines 12, 63-64):**
```typescript
const { inngest, sessionSummarize } = await import("@aucta/api/jobs");
// ...
functions: [sessionSummarize],
```

**Target state:**
```typescript
const { inngest, sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth } = await import("@aucta/api/jobs");
// ...
functions: [sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth],
```

This is the single change that unblocks KB-04, KB-05, KB-07, and KB-08.

### Pattern 2: Tool Response Detection in onToolCall

**What:** The `onToolCall` callback in `useGeminiSession.ts` currently handles `endSession` tool call specially. It needs to also detect `logFinding` responses and persist them.

**Current pattern (apps/mobile/hooks/useGeminiSession.ts lines 118-175):**
```typescript
onToolCall: async (toolCall) => {
  // Check for client-side endSession tool
  const endSessionCall = toolCall.functionCalls.find(fc => fc.name === "endSession");
  if (endSessionCall) { /* handle end session */ return; }

  // Relay all other tool calls to server
  const result = await toolRelayRef.current.relay(toolCall);
  connectionRef.current.sendToolResponse(result.functionResponses);

  // Persist each tool call incrementally
  for (const fc of toolCall.functionCalls) {
    addToolCallMutation.mutate({ ... });
    store.getState().addToolName(fc.name);
    store.getState().incrementToolCallsCount();
  }
}
```

**Target pattern:** After the tool call relay and persistence loop, detect logFinding calls and persist findings via addFinding mutation:
```typescript
// After relay and tool call persistence loop:
for (const fc of toolCall.functionCalls) {
  if (fc.name === "logFinding" && serverSessionId) {
    const response = result.functionResponses.find(r => r.id === fc.id);
    if (response?.response && !response.response.error) {
      addFindingMutation.mutate({
        sessionId: serverSessionId,
        category: fc.args.category,
        description: fc.args.description,
        severity: fc.args.severity,
        equipmentModel: fc.args.equipmentModel,
        manufacturer: fc.args.manufacturer,
      });
      store.getState().incrementFindingsCount();
    }
  }
}
```

### Anti-Patterns to Avoid

- **Do not create a new FindingStore implementation:** The persistence path is mobile -> addFinding tRPC -> SessionFindingRepository -> Postgres. The server-side InMemoryFindingStore serves its purpose (providing Gemini with a response). The persistent storage path is via the tRPC mutation from mobile.
- **Do not modify the logFinding tool itself:** The tool works correctly. The gap is in the mobile wiring, not the tool implementation.
- **Do not create a new Inngest function or event:** All functions and events already exist. This is purely a registration problem.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding persistence | New FindingStore adapter | Existing addFinding tRPC mutation | SessionFindingRepository and tRPC mutation already exist and are tested |
| Inngest function wiring | Custom event dispatch | inngestServe() functions array | Inngest's built-in registration handles discovery, UI display, and routing |
| Finding data extraction | Custom parser for tool response | `fc.args` from Gemini function call | The args contain the original input with category, description, severity, etc. |

## Common Pitfalls

### Pitfall 1: InMemoryFindingStore Creates Confusion
**What goes wrong:** Developers might think the InMemoryFindingStore IS the persistence layer and try to replace it.
**Why it happens:** Two parallel data paths: InMemoryFindingStore for server-side tool response, addFinding for database persistence.
**How to avoid:** The InMemoryFindingStore exists to give logFinding tool a findingId to return to Gemini. The real persistence is the separate addFinding tRPC call from mobile. Do not conflate them.
**Warning signs:** PR attempts to modify `packages/ai/src/tools/logFinding/index.ts`.

### Pitfall 2: addFinding Mutation Missing from useGeminiSession Dependencies
**What goes wrong:** The addFinding mutation hook is not initialized in useGeminiSession, causing runtime errors.
**Why it happens:** The addToolCall mutation is already there but addFinding was never added.
**How to avoid:** Create the mutation hook at the same level as addToolCallMutation: `const addFindingMutation = useMutation(trpc.session.addFinding.mutationOptions())`.
**Warning signs:** TypeScript error on `addFindingMutation` being undefined.

### Pitfall 3: Race Condition Between Tool Response and Finding Persistence
**What goes wrong:** The finding persistence call fires after the tool response is already sent to Gemini.
**Why it happens:** addFinding is a fire-and-forget mutation (`.mutate()`, not `.mutateAsync()`).
**How to avoid:** This is actually correct behavior. Finding persistence should not block the audio stream. Use `.mutate()` (fire-and-forget), same pattern as addToolCall. If it fails, the session data still has the tool call record.
**Warning signs:** Using `.mutateAsync()` and `await` for finding persistence would add latency to the audio stream.

### Pitfall 4: Inngest Function Registration Order
**What goes wrong:** Assuming function order in the array matters.
**Why it happens:** Inngest functions array is order-independent. Each function registers by its ID and trigger.
**How to avoid:** Just add all functions to the array. Order does not matter.
**Warning signs:** N/A -- this is a non-issue but worth documenting.

### Pitfall 5: Multiple Functions Triggering on Same Event
**What goes wrong:** Concern that both sessionSummarize and knowledgeIngest triggering on `session/ended` might conflict.
**Why it happens:** Both functions listen for the same event.
**How to avoid:** Inngest runs each function independently. Both `sessionSummarize` and `knowledgeIngest` trigger on `session/ended` and execute in parallel without interference. This is the intended design (established in Phase 5 decision D-42).
**Warning signs:** N/A -- this is correct architecture.

### Pitfall 6: args Type Safety in onToolCall
**What goes wrong:** `fc.args` is typed as `Record<string, unknown>` but addFinding expects specific types.
**Why it happens:** Gemini function call args are untyped from the mobile perspective.
**How to avoid:** Cast the args fields explicitly when building the addFinding mutation input. The server-side Zod schema (CreateSessionFindingDTO) validates the data. If the cast is wrong, the mutation will fail gracefully (fire-and-forget).
**Warning signs:** TypeScript errors when accessing `fc.args.category` as string.

## Code Examples

### Example 1: Server Entry Point Fix (apps/server/src/index.ts)

```typescript
// Line 12: Update import to include all knowledge functions
const { inngest, sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth } = await import("@aucta/api/jobs");

// Lines 62-65: Update inngestServe to register all functions
const inngestHandler = inngestServe({
  client: inngest,
  functions: [sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth],
});
```

### Example 2: Mobile Finding Persistence (apps/mobile/hooks/useGeminiSession.ts)

```typescript
// Add mutation hook alongside existing ones:
const addFindingMutation = useMutation(
  trpc.session.addFinding.mutationOptions(),
);

// In onToolCall, after relay + tool call persistence:
for (const fc of toolCall.functionCalls) {
  if (fc.name === "logFinding" && serverSessionId) {
    const response = result.functionResponses.find(r => r.id === fc.id);
    if (response?.response && !response.response.error) {
      addFindingMutation.mutate({
        sessionId: serverSessionId,
        category: String(fc.args.category),
        description: String(fc.args.description),
        severity: String(fc.args.severity),
        equipmentModel: fc.args.equipmentModel ? String(fc.args.equipmentModel) : undefined,
        manufacturer: fc.args.manufacturer ? String(fc.args.manufacturer) : undefined,
      });
      store.getState().incrementFindingsCount();
    }
  }
}
```

### Example 3: addFinding Input Shape (for reference)

```typescript
// From packages/shared/src/schemas/session-finding.schema.ts
const CreateSessionFindingDTO = z.object({
  sessionId: z.string(),
  category: FindingCategory,  // "safety" | "maintenance" | "regulatory" | "observation" | "recommendation"
  description: z.string(),
  severity: FindingSeverity,   // "low" | "medium" | "high" | "critical"
  equipmentModel: z.string().optional(),
  manufacturer: z.string().optional(),
});
```

## Detailed Gap Analysis

### Gap 1: Inngest Registration (BLOCKER)

| Property | Value |
|----------|-------|
| File | `apps/server/src/index.ts` |
| Lines | 12, 63-64 |
| Impact | KB-04, KB-05, KB-07, KB-08 all blocked |
| Fix | Add 3 imports + 3 array entries |
| Risk | LOW -- pure additive change |

The `packages/api/src/jobs/index.ts` already exports all 4 functions:
```typescript
export { inngest } from "./inngest-client.js";
export { sessionSummarize } from "./session-summarize.js";
export { knowledgeIngest } from "./knowledge-ingest.js";
export { knowledgeCompile } from "./knowledge-compile.js";
export { knowledgeHealth } from "./knowledge-health.js";
```

### Gap 2: logFinding Persistence (MEDIUM)

| Property | Value |
|----------|-------|
| File | `apps/mobile/hooks/useGeminiSession.ts` |
| Lines | ~118-175 (onToolCall callback) |
| Impact | session_findings table empty, knowledge ingestion quality degraded |
| Fix | Add addFinding mutation hook + detection in onToolCall |
| Risk | LOW -- follows existing addToolCall pattern |

The `addFinding` tRPC mutation exists and is tested in `session.router.ts` (line 191-196). The `SessionFindingRepository` is wired. Only the mobile call is missing.

### Gap 3: incrementFindingsCount Dead Code (LOW)

| Property | Value |
|----------|-------|
| File | `apps/mobile/stores/session-store.ts` |
| Lines | 55, 101-102 |
| Impact | Findings count in session recap always 0 |
| Fix | Call after addFinding mutation in onToolCall |
| Risk | NONE -- simple store action call |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `packages/api/vitest.config.ts`, `apps/mobile/vitest.config.ts` |
| Quick run command | `bun vitest run --project api` |
| Full suite command | `bun vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KB-04 | knowledgeIngest registered and receives session/ended events | integration | `bun vitest run --project api -- knowledge-ingest` | Exists (knowledge-ingest.test.ts) -- needs registration test |
| KB-05 | knowledgeCompile registered and receives knowledge/articles-ingested events | integration | `bun vitest run --project api -- knowledge-compile` | Exists (knowledge-compile.test.ts) -- needs registration test |
| KB-07 | Verification records auto-created during ingestion | unit | `bun vitest run --project api -- knowledge-ingest` | Exists -- already tests verification creation |
| KB-08 | knowledgeHealth cron registered and scheduled | integration | `bun vitest run --project api -- knowledge-health` | Exists (knowledge-health.test.ts) -- needs registration test |

### New Tests Needed
| Test | Location | What It Verifies |
|------|----------|------------------|
| Server inngestServe includes all 4 functions | `apps/server/src/index.test.ts` or source-level check | Registration array contains sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth |
| onToolCall persists logFinding via addFinding | `apps/mobile/hooks/useGeminiSession.test.ts` | When logFinding tool response arrives, addFinding mutation is called with correct shape |
| incrementFindingsCount called on logFinding | `apps/mobile/hooks/useGeminiSession.test.ts` | Findings count increments when finding is persisted |

### Sampling Rate
- **Per task commit:** `bun vitest run --project api && bun vitest run --project mobile`
- **Per wave merge:** `bun vitest run`
- **Phase gate:** Full suite green + `bun run typecheck` + `bun run lint`

### Wave 0 Gaps
- [ ] `apps/server/src/index.test.ts` -- verify all Inngest functions registered (source-level or integration test)
- [ ] Update `apps/mobile/hooks/useGeminiSession.test.ts` -- add logFinding persistence test cases

## State of the Art

No technology changes needed. All libraries are at the same versions used throughout Phases 1-5.

| Component | Current State | Needed Change |
|-----------|---------------|---------------|
| Inngest 4.1.2 | Installed, 1 of 4 functions registered | Register remaining 3 |
| addFinding tRPC mutation | Exists, tested, never called from mobile | Call from mobile onToolCall |
| incrementFindingsCount | Exists in store, never called | Call alongside addFinding |
| InMemoryFindingStore | Works for server-side tool response | No change needed |

## Open Questions

1. **Should InMemoryFindingStore be removed or replaced?**
   - What we know: It serves its purpose for Gemini tool responses on the server side. The persistent path is via tRPC from mobile.
   - What's unclear: Whether having two parallel paths (in-memory for Gemini + database via tRPC) causes confusion.
   - Recommendation: Defer to Phase 7 (tech debt). The milestone audit lists this for Phase 7. For Phase 6, leave it as-is and focus on wiring the persistence path.

2. **Should the server inngestServe handler be recreated per-request?**
   - What we know: Currently `inngestServe()` is called inside the request handler (line 62-65), creating a new handler per request.
   - What's unclear: Whether this has performance implications with 4 functions instead of 1.
   - Recommendation: Not a Phase 6 concern. The Inngest handler is lightweight. If optimization is needed, it can be hoisted outside the fetch handler in Phase 7.

## Sources

### Primary (HIGH confidence)
- `apps/server/src/index.ts` -- server entry point, lines 12 and 62-65
- `packages/api/src/jobs/index.ts` -- all 4 Inngest function exports confirmed
- `packages/api/src/jobs/knowledge-ingest.ts` -- full implementation with verification record creation
- `packages/api/src/jobs/knowledge-compile.ts` -- full implementation with merge/compile/backlink/re-embed
- `packages/api/src/jobs/knowledge-health.ts` -- full implementation with cron trigger
- `packages/api/src/routers/session.router.ts` -- addFinding mutation at line 191-196
- `apps/mobile/hooks/useGeminiSession.ts` -- onToolCall callback, missing logFinding detection
- `apps/mobile/stores/session-store.ts` -- incrementFindingsCount defined but unused
- `.planning/v1.0-MILESTONE-AUDIT.md` -- gap analysis identifying all 3 issues

### Secondary (MEDIUM confidence)
- Inngest docs: `inngest/bun` serve adapter accepts `{ client, functions }` -- functions array is the standard registration mechanism

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing dependencies verified
- Architecture: HIGH -- all code paths exist, this is purely wiring
- Pitfalls: HIGH -- based on direct codebase analysis, not external research

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- no external dependency changes)
