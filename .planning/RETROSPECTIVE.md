# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-07
**Phases:** 7 | **Plans:** 30 | **Timeline:** 5 days

### What Was Built
- Real-time AI copilot: camera + audio → Gemini 2.5 Flash Live → spoken guidance with mid-conversation tool calls
- Multi-tenant auth with org-scoped RBAC, invite codes, and tRPC middleware
- 3 domain tools: lookupErrorCode (60 HVAC codes), logFinding (structured observations), searchKnowledgeBase (hybrid retrieval)
- Self-learning knowledge base: session ingestion → LLM compilation → verification queue → hybrid search
- Session lifecycle: DB persistence, feedback collection, Inngest summary pipeline, MMKV offline cache
- EU AI Act compliance: non-dismissible AI indicator, safety disclaimers, stream-and-discard architecture

### What Worked
- **Critical path ordering**: Auth → Tools → Streaming → Lifecycle → KB dependency chain meant each phase built cleanly on the previous
- **buildTool() factory pattern**: Every tool follows the same structure, making new tools trivial to add
- **Repository pattern with constructor injection**: Clean separation, easy to mock in tests, Drizzle stays contained
- **Milestone audit before completion**: Caught Inngest registration gap (BLOCKER) that would have been missed — Phase 6 was created specifically to fix it
- **Vertical slices**: Each phase delivered a coherent, testable capability

### What Was Inefficient
- **Knowledge base pipeline built then unwired**: Phase 5 built the full pipeline but never registered Inngest functions in the server — a cross-phase integration gap that required Phase 6 to fix
- **InMemoryFindingStore was dead code from Phase 2**: The in-memory approach was never useful once Phase 4 added DB persistence, but wasn't cleaned up until Phase 7
- **ROADMAP.md metadata went stale**: Progress table showed incorrect statuses for most of the milestone — cosmetic but indicates tooling gap
- **Tech debt accumulated in Phase 1 UI**: Hardcoded org name and role badge persisted through 6 phases before Phase 7 fixed them

### Patterns Established
- `ErrorWithCode` in services, `TRPCError` only in routers — clean separation via middleware conversion
- Zustand `getState()`/`setState()` for callbacks outside React render cycle (WebSocket, audio)
- Lazy `require()` for native modules to prevent Expo Go crash at module evaluation
- Fire-and-forget `mutate()` for non-blocking persistence from audio stream callbacks
- `z.toJSONSchema()` with `$schema` stripping for Gemini function declaration compatibility
- Discriminated union output (`found: true/false`) for lookup tools instead of throwing on not-found

### Key Lessons
1. **Phase-level verification doesn't catch cross-phase integration gaps.** The Inngest registration issue passed all unit/integration tests in Phase 5 but the functions were never wired to the server entry point. Milestone audits are essential.
2. **Build the pipeline wiring in the same phase as the pipeline.** Don't defer "register this in the server" to a later phase — it creates dead code that's hard to detect.
3. **Clean up dead code immediately** when its replacement ships. InMemoryFindingStore should have been removed in Phase 6 when mobile persistence was wired, not left for Phase 7.
4. **Hardcoded UI placeholders are tech debt from day one.** Wire real data early or mark it as a known gap explicitly.
5. **Audio/WebSocket callbacks need state access outside React.** Zustand's `getState()` pattern was the right call over Redux or Context — confirmed repeatedly across Phases 3-6.

### Cost Observations
- Model mix: primarily Opus for orchestration and planning, Sonnet for execution
- Sessions: ~30 plan executions across 7 phases in 5 days
- Notable: quality model profile with parallel agent execution delivered high throughput

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 30 | First milestone — established critical path ordering, audit-before-completion pattern |

### Cumulative Quality

| Milestone | Test Files | Test Cases | LOC |
|-----------|-----------|------------|-----|
| v1.0 | 43 | 416 | 22,867 |

### Top Lessons (Verified Across Milestones)

1. Cross-phase integration must be verified at milestone level, not just phase level
2. Repository pattern + constructor injection enables clean testing at every layer
