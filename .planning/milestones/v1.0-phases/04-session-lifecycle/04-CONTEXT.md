# Phase 4: Session Lifecycle - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the session lifecycle with post-session feedback collection, server-side data persistence (ai_sessions, findings, tool calls), automated AI summary generation via Inngest background job, offline caching of recent session summaries via MMKV, and EU AI Act content labeling. By the end, every session leaves a durable record with feedback, structured metadata, and an AI-generated summary — accessible even offline.

</domain>

<decisions>
## Implementation Decisions

### Feedback UX
- **D-01:** Dedicated feedback screen after session end. Navigation flow: session -> feedback screen -> home. Full-screen route, not a bottom sheet or inline card.
- **D-02:** Star rating (1-5) is required. Text note is optional. "Skip" button available but de-emphasized. Maximizes feedback collection while respecting time pressure.
- **D-03:** Feedback screen shows a minimal session recap alongside the rating: duration, tools used, AI language detected. Helps the technician reflect before rating.

### Session Data Persistence
- **D-04:** AI session record created in the database when the technician starts the session (before WebSocket connects). Updated with end time, feedback, summary on completion. Captures failed/abandoned sessions too.
- **D-05:** Separate `session_findings` and `session_tool_calls` tables with FK to `ai_sessions`. Normalized schema for queryability and future analytics.
- **D-06:** Token usage tracked client-side by counting Gemini messages in Zustand store. Approximate count sufficient for cost estimation. Submitted on session end.
- **D-07:** Crash-resilient data collection. Findings and tool calls are persisted incrementally during the session (not just on session end). If a 10-minute session crashes at minute 8, only the last few seconds of data are lost. Implementation approach (real-time mutations vs local MMKV buffer with periodic sync) is Claude's discretion — optimize for reliability over complexity.

### Summary Generation & Display
- **D-08:** Structured markdown summary with sections: Problem described, Steps taken, Findings logged, Recommendations. Scannable by managers.
- **D-09:** Use the best available Gemini model for summary generation (likely Gemini 2.5 Pro). Cost is secondary to quality. Researcher should confirm the optimal model.
- **D-10:** AI-generated content label as a badge/tag on the summary: "AI-generated summary" with an info icon. Visible but not intrusive. Satisfies COMP-07 / EU AI Act Art. 50.
- **D-11:** Technician sees their last session summary on the Home screen. No full session history UI in this phase (session explorer is deferred per PROJECT.md Out of Scope). Summary also cached locally via MMKV.

### Offline Caching
- **D-12:** Cache the last 10-20 session summaries and their findings in MMKV. Auto-evict oldest when limit is reached.
- **D-13:** Skip KB article caching for now. Knowledge Base doesn't exist until Phase 5. Only cache session data.
- **D-14:** Sync on app open and after each session ends. No real-time push, no manual-only refresh. Simple and predictable.

### Compliance
- **D-15:** No emotion recognition (COMP-08). Session quality measured only by explicit star rating and optional text feedback. No sentiment analysis on audio/video.

### Claude's Discretion
- Inngest job configuration and retry strategy for summary generation
- Exact ai_sessions schema columns beyond what decisions require
- Crash-resilient persistence approach (real-time tRPC mutations vs local MMKV buffer with periodic sync)
- Feedback screen visual design (star component, layout, animations)
- MMKV cache key structure and serialization format
- How session recap data flows from Zustand to the feedback screen
- Inngest handler route placement (Next.js API route vs Bun server route)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specification
- `TECH-SPEC.md` -- Full product spec: session data model, Inngest background jobs, MMKV caching, Gemini API details, ephemeral token flow
- `LEGAL-ADMIN.md` -- EU AI Act Art. 50 content labeling requirements, GDPR session data handling, COMP-07/COMP-08 compliance

### Architecture Rules
- `agents/rules/architecture-feature-boundaries.md` -- packages/ vs apps/modules/ boundaries. Session persistence logic in packages/; UI in apps/mobile/
- `agents/rules/architecture-vertical-slices.md` -- Vertical slice for session lifecycle domain
- `agents/rules/data-repository-pattern.md` -- Repository pattern for ai_sessions, session_findings, session_tool_calls tables
- `agents/rules/data-dto-boundaries.md` -- Zod-validated DTOs for session data at every boundary
- `agents/rules/data-drizzle-migrations.md` -- Schema change and migration workflow for new tables
- `agents/rules/patterns-dependency-injection.md` -- Constructor injection for session service, summary service
- `agents/rules/quality-error-handling.md` -- ErrorWithCode in services, TRPCError only in routers
- `agents/rules/testing-coverage-requirements.md` -- 80%+ test coverage, co-located tests

### Domain Knowledge
- `agents/knowledge-base.md` -- AI tool system architecture, session lifecycle details

### Phase Dependencies
- `.planning/phases/02-ai-pipeline-and-tool-system/02-CONTEXT.md` -- logFinding structure (D-07/08/09: 5 categories, 4 severity levels), tool failure behavior
- `.planning/phases/03-live-streaming-session/03-CONTEXT.md` -- Session end flow (D-11/12), session start flow (D-09/10), Zustand store shape

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/stores/session-store.ts` -- Zustand store with sessionStartTime, status, sessionId. Will need extension for findings/tool call accumulation.
- `apps/mobile/hooks/useGeminiSession.ts` -- Session orchestration hook with endSession(), cleanupResources(). Feedback screen triggers after endSession sets status "completed".
- `apps/mobile/components/session/SessionScreen.tsx` -- Current end flow: handleEndConfirm -> endSession() -> router.replace("/(app)/(tabs)"). Needs to route to feedback screen instead.
- `packages/api/src/routers/session.router.ts` -- Existing session router with ephemeral token endpoint. Will host new session persistence mutations.
- `packages/db/src/schema/` -- Current schema has auth tables only. New ai_sessions, session_findings, session_tool_calls tables needed.
- `apps/server/src/index.ts` -- Bun server handling /api/auth and /api/trpc routes. May need Inngest handler route.

### Established Patterns
- tRPC router + middleware chain (auth -> org-scope -> rate-limit -> error-converter)
- Repository pattern with Drizzle in packages/db/
- DTO boundaries with Zod schemas in packages/shared/src/schemas/
- NativeWind v5 + Tailwind CSS v4 styling
- Expo Router file-based routing with group layouts
- Zustand getState()/setState() outside React render cycle for WebSocket callbacks

### Integration Points
- Session end flow (SessionScreen.tsx handleEndConfirm) -> new feedback route -> then home
- Zustand session store -> tRPC mutations for incremental data persistence
- tRPC session router -> new endpoints for session CRUD, feedback submission, summary retrieval
- Inngest -> triggered on session end -> generates summary -> updates ai_sessions record
- MMKV -> caches session summaries for offline access on Home screen
- Home screen -> displays last session summary card with AI-generated badge

</code_context>

<specifics>
## Specific Ideas

- Crash resilience is a priority: a session that crashes after 8 minutes should not lose all data. Findings and tool calls must be persisted incrementally.
- Best available Gemini model for summaries (quality over cost). Per-customer model selection is a future milestone feature.
- Last session summary on Home screen keeps the app session-first (consistent with Phase 1 D-09 session-first design).
- Feedback screen as a gate before returning to Home ensures high feedback collection rates while the session is fresh in the technician's mind.

</specifics>

<deferred>
## Deferred Ideas

- **Per-customer AI model selection for summaries** -- Attach summary model choice to customer plan/tier. Future milestone feature.
- **KB article offline caching** -- Wait for Phase 5 Knowledge Base to exist before caching articles.
- **Full session history/explorer UI** -- Explicitly out of scope per PROJECT.md. Mobile and web session explorer deferred.
- **Real-time push for summary availability** -- tRPC SSE subscription to notify when summary is ready. Simpler sync-on-open sufficient for now.

</deferred>

---

*Phase: 04-session-lifecycle*
*Context gathered: 2026-04-04*
