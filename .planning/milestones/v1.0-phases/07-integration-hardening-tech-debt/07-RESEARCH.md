# Phase 7: Integration Hardening and Tech Debt - Research

**Researched:** 2026-04-07
**Domain:** Integration hardening, tech debt cleanup, ephemeral token security
**Confidence:** HIGH

## Summary

Phase 7 is a hardening phase that closes one LOW-severity integration gap (ephemeral token tool constraints) and resolves 6 accumulated tech debt items from Phases 1 and 4. No new features, no new libraries, no schema changes. Every change targets existing code with established patterns already proven in the codebase.

The scope breaks into four work areas: (1) adding tool declarations to ephemeral token `liveConnectConstraints` for security-in-depth, (2) expanding the `org.getCurrent` tRPC endpoint to return the current user's role, (3) wiring the settings screen to display real org name and user role, and (4) removing the `InMemoryFindingStore` class and simplifying `logFindingTool` to inline ID generation. Three success criteria (SC2, SC4, SC5 partial) are already met in the current codebase and require verification only.

**Primary recommendation:** Treat this as 3-4 small, independent plans. Each change is isolated (different packages/files), well-precedented in the codebase, and testable in isolation. No architectural decisions needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove `InMemoryFindingStore` class entirely and inline ID generation in `logFindingTool`. The store's data is ephemeral (lost when request ends), and the real persistence path is mobile -> addFinding tRPC -> Postgres (wired in Phase 6). The tool only needs to generate a `fnd_` ID for Gemini's response -- a simple `generateId("fnd")` call inline is sufficient. Delete the class, simplify `createLogFindingTool`, and update tests.
- **D-02:** Expand `org.getCurrent` tRPC endpoint to include the current user's membership role in its response. The endpoint already calls `getFullOrganization` which includes the members array -- find the current user's member record and return their role alongside org name/slug/logo.
- **D-03:** Settings screen replaces hardcoded "Technician" badge (line 88) with actual role from `org.getCurrent` response, and replaces "Your Organization" (line 143) with actual org name.
- **D-04:** Add tool/function declarations to `liveConnectConstraints.config` in the ephemeral token creation (session.router.ts:102-108). This enforces the tool set at the Gemini token level as a security-in-depth measure. Continue returning tool declarations in the response for client backwards compatibility -- additive change, no mobile client modifications needed.
- **D-05:** SC2 (home screen org name) is already fixed -- `index.tsx:66` uses `orgQuery.data?.name ?? "Aucta"`. Verify and mark as met.
- **D-06:** SC4 (incrementFindingsCount) is already wired -- `useGeminiSession.ts:199` calls `store.getState().incrementFindingsCount()`. Verify and mark as met.
- **D-07:** logFinding mobile persistence already wired -- `useGeminiSession.ts:187` calls `addFindingMutation.mutate()`. Verify and mark as met.

### Claude's Discretion
- Test strategy for the changes (unit tests for modified code, integration test updates)
- Whether to update existing `session.router.test.ts` tests or add new ones for the constraints change
- How to handle the FindingStore interface after removing InMemoryFindingStore (keep interface if used elsewhere, remove if only consumer)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOOL-07 (strengthen) | Ephemeral token endpoint: authenticates user, builds layered system prompt, registers tool declarations, issues short-lived Gemini token with locked constraints | D-04: Add tool declarations to `liveConnectConstraints.config.tools` so the tool set is enforced at the token level, not just via client-side WebSocket setup |
</phase_requirements>

## Standard Stack

No new libraries needed. All changes use existing project dependencies.

### Core (Already Installed)
| Library | Version | Purpose | Role in This Phase |
|---------|---------|---------|-------------------|
| @google/genai | 1.48.x | Gemini SDK | Ephemeral token config modification (tools in liveConnectConstraints) |
| @aucta/ai | Internal | Tool system | logFinding tool simplification, tool pool for constraints |
| @aucta/shared | Internal | Utilities | `generateId("fnd")` for inline ID generation |
| @trpc/server | 11.16.x | API framework | org.getCurrent endpoint expansion |
| @tanstack/react-query | 5.x | Server state | Settings screen org query |
| Vitest | 4.1.x | Testing | Unit test updates |
| better-auth | 1.5.x | Auth | `getFullOrganization` for member role extraction |

### No New Dependencies Required

All four work areas use existing imports. No `bun install` needed.

## Architecture Patterns

### Existing Patterns to Follow

#### Pattern 1: Member Role Extraction (PROVEN)
**What:** Finding current user's role from `getFullOrganization` members array
**When to use:** D-02 (org.getCurrent endpoint expansion)
**Precedent:** `invite.router.ts` lines 35-38 already does this exact operation:
```typescript
// Source: packages/api/src/routers/invite.router.ts:35-38
const currentMember = (member?.members ?? []).find(
  (m: { userId: string }) => m.userId === ctx.userId,
);
const userRole = currentMember?.role ?? "technician";
```
**Confidence:** HIGH -- proven pattern in production code.

#### Pattern 2: tRPC Query in Mobile Screens (PROVEN)
**What:** Using `useQuery(trpc.xxx.queryOptions())` pattern in screen components
**When to use:** D-03 (settings screen consuming org data)
**Precedent:** `index.tsx` lines 22-26 already queries `org.getCurrent`:
```typescript
// Source: apps/mobile/app/(app)/(tabs)/index.tsx:22-26
const orgQuery = useQuery(
  trpc.org.getCurrent.queryOptions(undefined, {
    enabled: !!session?.activeOrganizationId,
  }),
);
```
**Confidence:** HIGH -- exact same query needed in settings screen.

#### Pattern 3: Tool Pool to Function Declarations (PROVEN)
**What:** `assembleToolPool(buildToolList()).functionDeclarations` produces the array of Gemini function declarations
**When to use:** D-04 (ephemeral token constraints)
**Precedent:** `session.router.ts` line 85-86 and 116 already builds the pool and extracts declarations:
```typescript
// Source: packages/api/src/routers/session.router.ts:85-86, 116
const pool = assembleToolPool(buildToolList());
// ...
toolDeclarations: pool.functionDeclarations,
```
**Confidence:** HIGH -- same pool feeds both the response AND the constraints.

#### Pattern 4: Inline ID Generation (PROVEN)
**What:** `generateId("prefix")` for creating unique IDs without a store
**When to use:** D-01 (replacing InMemoryFindingStore)
**Precedent:** Used throughout the codebase (session, finding, tool-call IDs).
**Confidence:** HIGH.

### Anti-Patterns to Avoid
- **Do not modify mobile client for D-04:** The tool declarations are already sent in the token response for client-side WebSocket setup. Adding them to liveConnectConstraints is server-side only and additive.
- **Do not create a new FindingStore implementation:** D-01 says remove the class entirely, not replace it. The logFinding tool only needs to generate an ID.
- **Do not duplicate the getFullOrganization call:** The org.getCurrent endpoint already calls it. Add role extraction to the existing call, do not make a second API request.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Member role lookup | Custom DB query for member role | `getFullOrganization` + array find | Better Auth manages the members table; querying it directly bypasses auth layer |
| Finding ID generation | New ID generation mechanism | `generateId("fnd")` from `@aucta/shared` | Already used for all entity IDs in the project |
| Tool declaration format | Manual Gemini function declaration objects | `assembleToolPool(buildToolList()).functionDeclarations` | Same pool already used for client-side declarations |

## Common Pitfalls

### Pitfall 1: liveConnectConstraints.config.tools Format
**What goes wrong:** Passing `functionDeclarations` array directly as a flat field instead of wrapping in the `tools` array-of-objects format Gemini expects.
**Why it happens:** The Gemini Live API expects `tools: [{ functionDeclarations: [...] }]`, not `functionDeclarations: [...]` directly.
**How to avoid:** Wrap the declarations in the correct nested structure:
```typescript
config: {
  systemInstruction: systemPrompt,
  responseModalities: [Modality.AUDIO],
  tools: [{ functionDeclarations: pool.functionDeclarations }],
}
```
**Warning signs:** Token creation fails with a schema validation error, or tools are silently ignored during live sessions.
**Confidence:** MEDIUM -- the `tools` field format is confirmed from Gemini function calling docs and the `live.ts` SDK source (`params.config?.tools ?? []`), but exact behavior within ephemeral token constraints has not been tested with this specific SDK version.

### Pitfall 2: FindingStore Interface Removal Scope
**What goes wrong:** Removing `FindingStore` interface breaks something that imports it.
**Why it happens:** The interface is exported from `logFinding/index.ts` but might be imported elsewhere.
**How to avoid:** Research confirms `FindingStore` and `InMemoryFindingStore` are NOT re-exported from `@aucta/ai` public API (`packages/ai/src/index.ts` only exports `logFindingTool`). The only consumers are the internal `index.ts` file and `logFinding.test.ts`. Safe to remove both the interface and class.
**Confidence:** HIGH -- verified by grep across entire codebase.

### Pitfall 3: createLogFindingTool Signature Change
**What goes wrong:** After removing FindingStore, `createLogFindingTool` no longer needs a `store` parameter, which breaks test imports.
**Why it happens:** Tests use `createLogFindingTool(store)` with a custom store instance.
**How to avoid:** The simplified tool no longer needs constructor injection for testability since there is no store to inject. The tool simply generates an ID and returns a response. Tests should be rewritten to test the simplified tool directly. The `createLogFindingTool` factory may be removed entirely if no DI is needed, or kept parameter-free.
**Confidence:** HIGH.

### Pitfall 4: org.getCurrent Type Change is Breaking for Consumers
**What goes wrong:** Adding `currentUserRole` to the response changes the tRPC inferred type, potentially breaking consumers that destructure the response.
**Why it happens:** TypeScript strict mode catches new fields only if consumers use explicit type annotations.
**How to avoid:** Adding a field is additive and non-breaking in TypeScript. Existing consumers that don't use the new field are unaffected. The settings screen will be updated to use it. The home screen queries the same endpoint but doesn't destructure role, so it's fine.
**Confidence:** HIGH.

## Code Examples

### Example 1: Ephemeral Token with Tool Constraints (D-04)

Current code at `session.router.ts:102-108`:
```typescript
liveConnectConstraints: {
  model: GEMINI_LIVE_MODEL,
  config: {
    systemInstruction: systemPrompt,
    responseModalities: [Modality.AUDIO],
  },
},
```

Updated to include tools:
```typescript
liveConnectConstraints: {
  model: GEMINI_LIVE_MODEL,
  config: {
    systemInstruction: systemPrompt,
    responseModalities: [Modality.AUDIO],
    tools: [{ functionDeclarations: pool.functionDeclarations }],
  },
},
```

**Note:** The `pool` variable is already available at this point in the function (line 85). This is a 1-line addition.

### Example 2: org.getCurrent with Role (D-02)

Current code at `org.router.ts:64-92`:
```typescript
getCurrent: orgProcedure.query(async ({ ctx }) => {
  const org = await auth.api.getFullOrganization({
    query: { organizationId: ctx.orgId },
    headers: ctx.headers,
  });
  // ... null check ...
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    createdAt: org.createdAt,
    settings: settings ? { ... } : null,
  };
});
```

Pattern from `invite.router.ts:35-38`:
```typescript
const currentMember = (org.members ?? []).find(
  (m: { userId: string }) => m.userId === ctx.userId,
);
const currentUserRole = currentMember?.role ?? "member";
```

Add `currentUserRole` to the return object.

### Example 3: Simplified logFinding Tool (D-01)

After removing InMemoryFindingStore, the tool becomes:
```typescript
import { generateId } from "@aucta/shared/utils/id";
import { buildTool } from "../base.js";
import { LogFindingInput, LogFindingOutput, /* types */ } from "./types.js";

export const logFindingTool = buildTool<LogFindingInputType, LogFindingOutputType>({
  name: "logFinding",
  description: "Record an observation, safety concern, or recommendation during the session",
  inputSchema: LogFindingInput,
  outputSchema: LogFindingOutput,
  isReadOnly: false,
  async call(input, _context): Promise<LogFindingOutputType> {
    const findingId = generateId("fnd");
    return {
      findingId,
      recorded: true,
      message: `Finding recorded: ${input.category} (${input.severity})`,
    };
  },
});
```

Removed: `FindingStore` interface, `InMemoryFindingStore` class, `createLogFindingTool` factory function.
The tool is now a simple stateless function that generates an ID and returns a confirmation. Real persistence happens via mobile `addFindingMutation.mutate()` (wired in Phase 6).

### Example 4: Settings Screen with Real Data (D-03)

Current hardcoded values:
```tsx
// Line 87-89: hardcoded role badge
<Text className="text-[12px] font-semibold text-accent">
  Technician
</Text>

// Line 141-144: hardcoded org name
<Text className="text-body text-text-primary">
  {session?.activeOrganizationId ? "Your Organization" : "No organization"}
</Text>
```

Pattern from home screen `index.tsx:22-26, 66`:
```tsx
const orgQuery = useQuery(
  trpc.org.getCurrent.queryOptions(undefined, {
    enabled: !!session?.activeOrganizationId,
  }),
);
// Usage: orgQuery.data?.name ?? "Aucta"
```

Settings screen should add the same query and use:
- `orgQuery.data?.currentUserRole` for the role badge (with capitalize transform)
- `orgQuery.data?.name` for the org name

## Pre-Solved Verifications

Three success criteria are already met. Evidence from codebase:

### SC2: Home Screen Org Name (D-05) -- ALREADY FIXED
**File:** `apps/mobile/app/(app)/(tabs)/index.tsx:66`
**Code:** `{orgQuery.data?.name ?? "Aucta"}`
**Query:** Lines 22-26 query `trpc.org.getCurrent`
**Verdict:** Met. No action needed.

### SC4: incrementFindingsCount Wired (D-06) -- ALREADY FIXED
**File:** `apps/mobile/hooks/useGeminiSession.ts:199`
**Code:** `store.getState().incrementFindingsCount();`
**Context:** Called inside the `onToolCall` callback when `fc.name === "logFinding"` and response is successful.
**Verdict:** Met. No action needed.

### SC5 (partial): logFinding Mobile Persistence (D-07) -- ALREADY FIXED
**File:** `apps/mobile/hooks/useGeminiSession.ts:187`
**Code:** `addFindingMutation.mutate({...})` inside the logFinding tool call handler.
**Context:** Fire-and-forget mutation (Phase 6 pattern) persists findings to Postgres via `session.addFinding` tRPC.
**Verdict:** The mobile persistence path is wired. SC5 also requires "no InMemoryFindingStore references remain" which requires the D-01 cleanup.

## State of the Art

No technology changes since Phase 6. All stack versions remain as established.

| Area | Status | Impact on This Phase |
|------|--------|---------------------|
| @google/genai | 1.48.x stable | tools field in liveConnectConstraints config is supported (confirmed from SDK source) |
| Better Auth | 1.5.x stable | getFullOrganization members array is reliable for role extraction |
| Gemini Live API | Still "Preview" | liveConnectConstraints is the mechanism for token-level enforcement |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` (root workspace) + per-package configs |
| Quick run command | `bun run --filter @aucta/api test` or `cd packages/api && vitest run` |
| Full suite command | `turbo test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOOL-07 (strengthen) | Tool declarations locked in ephemeral token constraints | unit | `vitest run packages/api/src/routers/session.router.test.ts -t "tools"` | Extend existing file |
| D-01 | logFinding tool generates fnd_ ID without store | unit | `vitest run packages/ai/src/tools/logFinding/logFinding.test.ts` | Rewrite existing tests |
| D-02 | org.getCurrent returns currentUserRole | unit | `vitest run packages/api/src/routers/org.router.test.ts` | Wave 0 (new file) |
| D-03 | Settings screen shows real role and org name | manual | Visual verification on device/simulator | N/A |

### Sampling Rate
- **Per task commit:** `vitest run <changed-test-file>`
- **Per wave merge:** `turbo test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/api/src/routers/org.router.test.ts` -- covers D-02 (org.getCurrent with role)
- [ ] Update `session.router.test.ts` -- add assertion for tools in liveConnectConstraints (D-04)
- [ ] Rewrite `logFinding.test.ts` -- remove InMemoryFindingStore tests, add simplified tool tests (D-01)

## Discretion Recommendations

### Test Strategy
**Recommendation:** Update existing test files rather than creating new ones, except for `org.router.test.ts` which doesn't exist yet.

| Change | Test Approach |
|--------|--------------|
| D-01 (InMemoryFindingStore removal) | Rewrite `logFinding.test.ts` -- remove the `InMemoryFindingStore` describe block, update tool tests to not inject a store |
| D-02 (org.getCurrent role) | Create `org.router.test.ts` with mock for `auth.api.getFullOrganization` returning members, verify `currentUserRole` in response |
| D-04 (token constraints) | Add test case to existing `session.router.test.ts` asserting `liveConnectConstraints.config.tools` contains function declarations |

**Confidence:** HIGH -- follows established testing patterns in the project.

### FindingStore Interface Disposal
**Recommendation:** Remove both `FindingStore` interface AND `InMemoryFindingStore` class.

Evidence:
- `FindingStore` is NOT re-exported from `@aucta/ai` public API (checked `packages/ai/src/index.ts`)
- Only consumers are `logFinding/index.ts` (defines it) and `logFinding.test.ts` (imports it)
- No external package imports `FindingStore` or `InMemoryFindingStore`
- With inline ID generation, there is no store interface needed

If a future phase needs a FindingStore abstraction, it can be re-introduced. YAGNI applies here.

**Confidence:** HIGH -- full grep across codebase confirms no other consumers.

### createLogFindingTool Factory
**Recommendation:** Remove the `createLogFindingTool` factory function entirely. It existed for constructor injection of the store. Without a store, there is nothing to inject. Export `logFindingTool` directly as a `buildTool()` result.

The factory is NOT exported from `@aucta/ai` public API, so only `logFinding.test.ts` imports it directly. Tests can be rewritten to test `logFindingTool` directly (which is the exported instance).

**Confidence:** HIGH.

## Open Questions

1. **Gemini ephemeral token tools enforcement behavior**
   - What we know: The `config` object in `liveConnectConstraints` supports a `tools` field (confirmed from `live.ts` source: `params.config?.tools ?? []`). The field mask mechanism in `tokens.ts` auto-generates masks from all config keys.
   - What's unclear: Whether the Gemini backend actually enforces the tool set at the token level (rejecting client-side attempts to add extra tools), or just sets defaults. The docs only say tokens can be "locked to a set of configurations."
   - Recommendation: Implement D-04 as specified. Even if enforcement is "soft" (defaults rather than hard reject), it's still security-in-depth. Test by asserting the config structure is correct. Full behavioral verification requires a live Gemini API call (human verification item).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). All changes are code/config-only within existing packages. No new tools, services, or runtimes required.

## Sources

### Primary (HIGH confidence)
- Project codebase: `packages/api/src/routers/session.router.ts` -- current ephemeral token implementation
- Project codebase: `packages/api/src/routers/org.router.ts` -- current org.getCurrent endpoint
- Project codebase: `packages/api/src/routers/invite.router.ts:35-38` -- proven member role extraction pattern
- Project codebase: `packages/ai/src/tools/logFinding/index.ts` -- current FindingStore/InMemoryFindingStore
- Project codebase: `packages/ai/src/index.ts` -- public API surface (confirms FindingStore not exported)
- Project codebase: `apps/mobile/hooks/useGeminiSession.ts` -- confirms SC4 and SC5 are pre-solved
- Project codebase: `apps/mobile/app/(app)/(tabs)/index.tsx` -- confirms SC2 is pre-solved
- `.planning/v1.0-MILESTONE-AUDIT.md` -- tech debt inventory and integration gap definitions

### Secondary (MEDIUM confidence)
- @google/genai SDK source `live.ts` -- confirms `params.config?.tools ?? []` pattern
- @google/genai SDK source `tokens.ts` -- confirms `convertBidiSetupToTokenSetup` field mask mechanism
- Gemini function calling docs (ai.google.dev) -- confirms `tools: [{ functionDeclarations: [...] }]` format

### Tertiary (LOW confidence)
- Gemini ephemeral token enforcement behavior -- docs say "locked to configurations" but behavioral verification of tool enforcement requires live testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing code
- Architecture: HIGH -- all patterns already proven in codebase (invite.router role extraction, home screen org query, tool pool declarations)
- Pitfalls: HIGH -- full codebase grep confirms safe removal scope; Gemini tools format MEDIUM pending live test
- Pre-solved verifications: HIGH -- line-level evidence for all three items

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable -- no external dependency changes)
