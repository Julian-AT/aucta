# Phase 7: Integration Hardening and Tech Debt - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the remaining LOW-severity integration gap (ephemeral token constraints) and resolve accumulated tech debt. This phase strengthens existing wiring — no new features or capabilities.

</domain>

<decisions>
## Implementation Decisions

### InMemoryFindingStore Cleanup
- **D-01:** Remove `InMemoryFindingStore` class entirely and inline ID generation in `logFindingTool`. The store's data is ephemeral (lost when request ends), and the real persistence path is mobile → addFinding tRPC → Postgres (wired in Phase 6). The tool only needs to generate a `fnd_` ID for Gemini's response — a simple `generateId("fnd")` call inline is sufficient. Delete the class, simplify `createLogFindingTool`, and update tests.

### Settings Screen Data
- **D-02:** Expand `org.getCurrent` tRPC endpoint to include the current user's membership role in its response. The endpoint already calls `getFullOrganization` which includes the members array — find the current user's member record and return their role alongside org name/slug/logo.
- **D-03:** Settings screen replaces hardcoded "Technician" badge (line 88) with actual role from `org.getCurrent` response, and replaces "Your Organization" (line 143) with actual org name.

### Ephemeral Token Constraints
- **D-04:** Add tool/function declarations to `liveConnectConstraints.config` in the ephemeral token creation (session.router.ts:102-108). This enforces the tool set at the Gemini token level as a security-in-depth measure. Continue returning tool declarations in the response for client backwards compatibility — additive change, no mobile client modifications needed.

### Pre-Solved Items (Verify Only)
- **D-05:** SC2 (home screen org name) is already fixed — `index.tsx:66` uses `orgQuery.data?.name ?? "Aucta"`. Verify and mark as met.
- **D-06:** SC4 (incrementFindingsCount) is already wired — `useGeminiSession.ts:199` calls `store.getState().incrementFindingsCount()`. Verify and mark as met.
- **D-07:** logFinding mobile persistence already wired — `useGeminiSession.ts:187` calls `addFindingMutation.mutate()`. Verify and mark as met.

### Claude's Discretion
- Test strategy for the changes (unit tests for modified code, integration test updates)
- Whether to update existing `session.router.test.ts` tests or add new ones for the constraints change
- How to handle the FindingStore interface after removing InMemoryFindingStore (keep interface if used elsewhere, remove if only consumer)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Ephemeral Token Constraints
- `packages/api/src/routers/session.router.ts` — createToken mutation with current liveConnectConstraints (lines 70-118)
- `packages/api/src/routers/session.router.test.ts` — existing ephemeral token tests

### InMemoryFindingStore
- `packages/ai/src/tools/logFinding/index.ts` — InMemoryFindingStore class and logFindingTool (lines 19-68)
- `packages/ai/src/tools/logFinding/logFinding.test.ts` — tests for InMemoryFindingStore and logFindingTool

### Settings Screen
- `apps/mobile/app/(app)/(tabs)/settings.tsx` — hardcoded "Technician" (line 88) and "Your Organization" (line 143)
- `packages/api/src/routers/org.router.ts` — org.getCurrent endpoint to expand (lines 64-92)

### Pre-Solved Verification
- `apps/mobile/app/(app)/(tabs)/index.tsx` — home screen org name query (line 22-26, 66)
- `apps/mobile/hooks/useGeminiSession.ts` — incrementFindingsCount call (line 199), addFinding mutation (lines 72-74, 187)
- `apps/mobile/stores/session-store.ts` — incrementFindingsCount action (lines 55, 101)

### Milestone Audit
- `.planning/v1.0-MILESTONE-AUDIT.md` — tech debt inventory and integration gaps that define this phase's scope

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `org.getCurrent` tRPC endpoint already fetches `getFullOrganization` which includes members — role extraction is a small addition
- `generateId("fnd")` utility from `@aucta/shared` already used elsewhere for ID generation
- `buildToolList()` at session.router.ts:62-67 already builds the tool list — same list feeds both pool and constraints

### Established Patterns
- tRPC org queries use `orgProcedure` which provides `ctx.orgId` and `ctx.userId` — role lookup can use both
- Home screen uses `useQuery(trpc.org.getCurrent.queryOptions(...))` pattern — settings screen should mirror this
- Fire-and-forget mutation pattern (`mutate()` without await) established in Phase 6 for non-blocking operations

### Integration Points
- `session.router.ts` createToken mutation — add tools to liveConnectConstraints config
- `org.router.ts` getCurrent query — expand response with `currentUserRole` field
- `settings.tsx` — consume org.getCurrent data instead of hardcoded values
- `logFinding/index.ts` — simplify tool to inline ID generation, remove FindingStore class

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard implementation following existing patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-integration-hardening-tech-debt*
*Context gathered: 2026-04-06*
