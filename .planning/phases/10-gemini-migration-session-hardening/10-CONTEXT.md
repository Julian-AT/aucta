# Phase 10: Gemini Migration & Session Hardening - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate to Gemini 3.1 Flash Live, harden session reliability (singleton fix, structured logging, keepalive, typed schemas), reduce AI costs (VAD, scene detection, concise prompting), and enforce tiered pricing. `apps/server` is deleted — all backend functionality moves to `apps/web` Next.js API routes as part of this phase.

**Critical constraint discovered during discussion:** The current `apps/server` (Bun.serve()) is a placeholder and will NOT exist in production. The entire backend must be serverless on Vercel. Vercel has a 300-second function invocation timeout, making persistent WebSocket proxy architectures impossible. This fundamentally shapes the tool execution architecture.

**Roadmap AI-02 adjustment:** The roadmap states "<100ms tool latency" but the mobile-direct + Edge relay architecture adds ~100-200ms round-trip. Realistic target is <200ms measured end-to-end from tool call event to result injection.

</domain>

<decisions>
## Implementation Decisions

### Tool execution architecture
- **D-01:** Mobile-direct + Edge relay — Mobile keeps its direct Gemini WebSocket connection via ephemeral tokens. Tool calls relay through Vercel Edge Functions (dispatchToolCalls). ~100-200ms latency. Pure serverless, no persistent server process.
- **D-02:** All `apps/server` functionality migrates into `apps/web` — Token endpoint, tool dispatch, session CRUD, Inngest handlers all become Next.js API routes. `apps/server` directory gets deleted.
- **D-03:** `dispatchToolCalls` runs as a Vercel Edge Function (~0ms cold start). Other tRPC routes stay as standard Node.js serverless functions.
- **D-04:** Ephemeral tokens stay — required for the mobile-direct Gemini connection. Token generation moves from `apps/server` to a Next.js API route in `apps/web`.
- **D-05:** Migration targets: `apps/web/app/api/trpc/[trpc]/route.ts` (tRPC handler), `apps/web/app/api/auth/[...all]/route.ts` (Better Auth), `apps/web/app/api/inngest/route.ts` (Inngest handler).

### Pricing enforcement
- **D-06:** Block new sessions only — when org reaches session cap, new sessions are blocked (API returns 429). In-progress sessions are NEVER interrupted.
- **D-07:** Validation plan — free/validation period has unlimited sessions (no cap). Used for onboarding and testing. Once org moves to a paid tier, caps apply.
- **D-08:** Four pricing tiers: Validation (unlimited/free), Starter (EUR 29/30 sessions), Professional (EUR 49/60 sessions), Enterprise (EUR 79/unlimited).
- **D-09:** Count on start — session counts increment when the session begins, not when it ends. Prevents abuse via never-ending sessions.

### Cost optimization tuning
- **D-10:** Conservative VAD — Silero WASM with 0.3 speech probability threshold, 500ms silence duration before cutting, 300ms padding on speech boundaries. Prioritizes never cutting off a technician mid-sentence over aggressive cost savings.
- **D-11:** Pixel diff scene-change detection — downscale frames to 128x128 grayscale, compute mean absolute pixel difference, 15% threshold. Skip frames below threshold during static camera scenarios.

### Concise output prompting
- **D-12:** Context-adaptive response length — 1-2 sentences for simple confirmations/acknowledgments, 3-4 sentences for complex guidance (multi-step procedures, safety warnings). Hard cap of 4 sentences maximum. System prompt instructs Gemini to be concise during active field work.
- **D-13:** Auto-detect language — keep current behavior where Gemini auto-detects the technician's language. No explicit language selection UI needed.

### Claude's Discretion
- Exact system prompt wording for concise output (D-12) — as long as it achieves the sentence limits
- Pixel diff implementation details beyond the specified parameters (D-11)
- VAD integration approach with expo-audio / audio capture pipeline (D-10)
- Edge Function configuration details for dispatchToolCalls (D-03)
- Order of migration tasks for apps/server → apps/web (D-02, D-05)

</decisions>

<specifics>
## Specific Ideas

- The 300s Vercel timeout makes any persistent WebSocket proxy impossible — architecture MUST be serverless-native
- `apps/server/src/index.ts` contains: tRPC handler, auth handler, Inngest handler, CORS config, health endpoint — all must migrate
- `packages/api/src/services/session.service.ts` line 32: model reference `gemini-2.5-flash-live-preview` must change to `gemini-3.1-flash-live-preview` (AI-01)
- `packages/api/src/services/session.service.ts` lines 194-209: `getSearchKnowledgeBaseTool()` creates NEW Qdrant client + embedding service per call — singleton anti-pattern (SESS-01)
- `packages/api/src/services/knowledge.service.ts` lines 203-206: same singleton anti-pattern in `embedAndUpsert()` (SESS-01)
- `apps/mobile/lib/gemini/connection.ts` lines 55, 64, 74, 153, 166, 174: six console.log/error calls to replace with structured logger (SESS-02)
- `packages/api/src/routers/session.router.ts` line 41: `z.any()` must be replaced with typed Zod schema (SESS-04)
- Gemini 3.1 Flash Live dropped async function calling — tool calls now block the response stream. This is a behavioral change from 2.5 that the mobile app must handle gracefully.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & constraints
- `.planning/AUDIT-REPORT.md` — Architecture critique (Section 2), AI pipeline cost model (Section 3), risk register (Section 9), 30-item prioritized action plan (Section 10)
- `.planning/EVAL-FRAMEWORK.md` — 25 AI quality test scenarios; use during verify to validate tool call behavior, safety boundaries, multilingual responses
- `STANDARDS.md` — Service layer pattern (constructor injection, ErrorWithCode), logging conventions, package boundaries

### AI & real-time
- `.planning/research/SUPPLEMENTAL-RESEARCH-REPORT.md` — Gemini inference tiers, Silero VAD evaluation, expo-two-way-audio findings
- `.planning/research/PITFALLS.md` — Known gotchas: CORS migration, Bun/Metro compat, Expo SDK 55 breaking changes

### Existing code (read before modifying)
- `apps/mobile/lib/gemini/connection.ts` — WebSocket connection to Gemini (stays, logging changes)
- `apps/mobile/lib/gemini/tool-relay.ts` — Current tool relay pattern (stays, backend changes to Edge Function)
- `apps/mobile/lib/gemini/protocol.ts` — Gemini protocol types, constants, audio specs
- `packages/api/src/services/session.service.ts` — Singleton anti-pattern, model reference, tool dispatch
- `packages/api/src/services/knowledge.service.ts` — Singleton anti-pattern in embedAndUpsert
- `packages/ai/src/tools/dispatcher.ts` — dispatchToolCalls function, tool pool pattern
- `packages/api/src/routers/session.router.ts` — z.any() input schema
- `apps/server/src/index.ts` — Server to delete; study for migration targets

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/mobile/lib/gemini/tool-relay.ts` — ToolRelay class with `relay()` method already calls `dispatchToolCalls` via tRPC. Backend changes to Edge Function but mobile call pattern stays.
- `packages/ai/src/tools/dispatcher.ts` — `dispatchToolCalls()` function with timeout, validation, error handling. Moves to Edge Function runtime but logic is reusable.
- `apps/mobile/lib/gemini/protocol.ts` — Gemini protocol types, audio constants (16kHz input, 24kHz output), type guards. Reusable as-is for 3.1 migration.

### Established Patterns
- Repository pattern (Drizzle in repositories, DTOs at boundaries) — session usage tracking must follow this
- Constructor injection — required for SESS-01 singleton fix
- ErrorWithCode in services, TRPCError only in routers — pricing enforcement errors must follow this
- tRPC router pattern in `packages/api` — new pricing endpoints follow existing structure

### Integration Points
- Mobile → Edge Function: tool-relay.ts calls dispatchToolCalls (existing tRPC path, backend changes)
- Mobile → Next.js API: ephemeral token endpoint (currently apps/server, moves to apps/web)
- Session usage tracking: new DB table/columns for org session counts, queried by pricing enforcement middleware
- Inngest handlers: currently in apps/server, migrate to apps/web/app/api/inngest/route.ts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-gemini-migration-session-hardening*
*Context gathered: 2026-04-10*
