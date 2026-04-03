# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** A technician points their phone camera at HVAC equipment, speaks naturally in any language, and receives expert-level spoken guidance in real time.
**Current focus:** Phase 1: Foundation and Auth

## Current Position

Phase: 1 of 5 (Foundation and Auth)
Plan: 0 of 0 in current phase
Status: Ready to plan
Last activity: 2026-04-03 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 5-phase structure following critical path: Auth -> Tools -> Streaming -> Lifecycle -> KB
- [Roadmap]: KB does not block live session demo -- Gemini's base HVAC knowledge sufficient initially
- [Roadmap]: NativeWind v4.2.3 stable, not v5 preview
- [Roadmap]: Context window compression (SlidingWindow) mandatory from first WebSocket implementation

### Pending Todos

None yet.

### Blockers/Concerns

- Gemini Live API is labeled "Preview" -- may have breaking changes or pricing shifts
- react-native-audio-api AudioBufferQueueSourceNode is undocumented -- needs verification in Phase 3
- Session cost economics: $0.35-$0.50 per 15-min session may consume 50-75% of EUR 29/month revenue

## Session Continuity

Last session: 2026-04-03
Stopped at: Roadmap creation complete
Resume file: None
