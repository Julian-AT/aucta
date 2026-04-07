# Phase 2: AI Pipeline and Tool System - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the server-side AI infrastructure in `packages/ai/`: ephemeral Gemini token endpoint, layered system prompt assembly, buildTool() factory with tool registry and dispatcher, and two initial tools (lookupErrorCode, logFinding). By the end, the API can issue ephemeral Gemini tokens with a locked system prompt and registered tool declarations, and tools can be dispatched and tested individually. No mobile UI in this phase.

</domain>

<decisions>
## Implementation Decisions

### Error Code Data Source
- **D-01:** Static JSON seed data for v1. Ship with bundled JSON files per manufacturer.
- **D-02:** Cover top 3 brands common in Austrian/EU market: Daikin, Mitsubishi Electric, Fujitsu. ~50-80 error codes total.
- **D-03:** Design the tool interface (repository abstraction) so it can be swapped to a database-backed implementation later without changing the tool contract.

### System Prompt Personality
- **D-04:** Practical colleague tone. Like a friendly senior colleague on the radio — uses trade terminology naturally, avoids jargon overload, direct but not robotic. Example: "Check the condensate drain first — that's your most likely culprit."
- **D-05:** Context-aware safety. Upfront disclaimer at session start, then safety warnings only when the specific task involves risk (refrigerants, electrical, gas). Does not nag on routine work.
- **D-06:** Refuse + redirect on competence boundaries. When a task requires credentials the technician may not have (F-Gas cert, licensed electrician), the AI refuses, explains why, and offers to help document findings so a qualified person can follow up.

### logFinding Structure
- **D-07:** 5 core finding categories: safety, maintenance, regulatory, observation, recommendation.
- **D-08:** 4 severity levels: low, medium, high, critical. "Critical" triggers visual flags in session summaries and future dashboard alerts.
- **D-09:** Optional equipment context. Findings include optional equipment_model and manufacturer fields. Gemini includes them when it can identify the equipment from camera or conversation.

### Tool Failure Behavior
- **D-10:** Acknowledge + fallback on missing data. Tool returns a structured "not found" response. AI tells the technician it doesn't have that specific data but offers general knowledge as fallback.
- **D-11:** 10-second timeout per tool call. On timeout, return a structured error and let the AI continue the conversation without the tool result.
- **D-12:** Validation errors returned to Gemini. When Gemini sends a tool call with invalid input (Zod validation failure), return a structured error response so the AI can rephrase or ask the technician for clarification.

### Claude's Discretion
- buildTool() factory API design and internal implementation
- Tool registry and dispatcher architecture
- System prompt layer ordering and exact wording beyond the tone/safety decisions above
- Ephemeral token endpoint implementation details (tRPC procedure vs standalone route)
- Test strategy for tools (unit test structure, mocking approach)
- Error code JSON file structure and organization
- logFinding in-memory storage strategy (pending session persistence in Phase 4)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specification
- `TECH-SPEC.md` — Full product spec: Gemini Live API integration, ephemeral token flow, system prompt structure, tool declarations, data models. Primary source of truth.
- `LEGAL-ADMIN.md` — F-Gas EU 2024/573 regulation details, EU AI Act Art. 50 transparency requirements, safety disclaimers, AI scope limitations.

### Architecture Rules
- `agents/rules/architecture-feature-boundaries.md` — packages/ai/ is framework-agnostic, no React, no tRPC client
- `agents/rules/architecture-vertical-slices.md` — Vertical slice organization: each tool is a self-contained directory
- `agents/rules/data-repository-pattern.md` — Repository pattern for data access (relevant for error code data abstraction)
- `agents/rules/data-dto-boundaries.md` — Zod-validated DTOs at every boundary
- `agents/rules/patterns-dependency-injection.md` — Constructor injection for tool dependencies
- `agents/rules/quality-error-handling.md` — ErrorWithCode in services/packages/ai, TRPCError only in routers
- `agents/rules/testing-coverage-requirements.md` — 80%+ test coverage, co-located tests

### Domain Knowledge
- `agents/knowledge-base.md` — AI tool system architecture (buildTool, registry, dispatcher), Gemini WebSocket protocol, session lifecycle, ephemeral token flow, tool calling semantics

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/shared/src/utils/errors.ts` — ErrorWithCode class with NotFound, Forbidden, BadRequest, Conflict. Use in tool implementations.
- `packages/shared/src/constants/roles.ts` — Role definitions and hierarchy. Relevant for system prompt org overlay.
- `packages/api/src/trpc.ts` — TRPCContext with session (userId, activeOrganizationId). Ephemeral token endpoint will use this for auth.
- `packages/api/src/middleware/` — Auth, org-scope, rate-limit, error-converter middleware. Token endpoint reuses these.

### Established Patterns
- tRPC router pattern with middleware chain (auth -> org-scope -> rate-limit -> error-converter)
- Repository pattern with Drizzle in `packages/db/`
- DTO boundaries with Zod schemas in `packages/shared/src/schemas/`
- Bun server at `apps/server/src/index.ts` handling both `/api/auth` and `/api/trpc` routes

### Integration Points
- `packages/api/src/root.ts` — appRouter needs new `session` or `token` router for ephemeral token endpoint
- `packages/ai/` — New package to create. Contains tools, system prompt, and AI pipeline logic.
- `packages/db/src/schema/` — May need new tables for session metadata (or defer to Phase 4)
- Import direction: packages/shared <- packages/db <- packages/ai <- packages/api

</code_context>

<specifics>
## Specific Ideas

- Tool architecture inspired by Claude Code's buildTool() + assembleToolPool() pattern (per PROJECT.md)
- Each tool is a self-contained directory: index.ts (call + validate), prompt.ts (Gemini function declaration), types.ts (Zod schemas), co-located test file
- System prompt uses layered assembly pattern (not string concatenation): core role, HVAC expertise, safety rules, org overlay, knowledge context
- Error codes should be realistic HVAC data — real manufacturer codes that technicians would actually encounter

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-ai-pipeline-and-tool-system*
*Context gathered: 2026-04-04*
