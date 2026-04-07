# Phase 2: AI Pipeline and Tool System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-ai-pipeline-and-tool-system
**Areas discussed:** Error code data source, System prompt personality, logFinding structure, Tool failure behavior

---

## Error Code Data Source

### Where should lookupErrorCode get its data?

| Option | Description | Selected |
|--------|-------------|----------|
| Static JSON seed data | Bundled JSON files of common HVAC error codes per manufacturer. Fast to implement, works offline. | |
| Database table with seed + API | Stored in Postgres, seeded from JSON, org owners can add custom codes via API. | |
| Static now, database later | Start with static JSON for v1, design interface for future database swap. | ✓ |
| You decide | Claude decides implementation approach. | |

**User's choice:** Static now, database later
**Notes:** None

### How much seed data?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 3 brands, ~50-80 codes | Daikin, Mitsubishi Electric, Fujitsu. Enough to demo and test. | ✓ |
| 1 brand, ~10-15 codes | Minimal but proves the architecture. | |
| 5-6 brands, ~100-150 codes | Wider net for early testing. | |

**User's choice:** Top 3 brands, ~50-80 codes
**Notes:** None

---

## System Prompt Personality

### What tone should the AI copilot use?

| Option | Description | Selected |
|--------|-------------|----------|
| Practical colleague | Friendly senior colleague. Uses trade terminology naturally, direct but not robotic. | ✓ |
| Clinical expert | Formal, measured responses with precise terminology. | |
| Casual mentor | Very casual, like texting a knowledgeable buddy. | |

**User's choice:** Practical colleague
**Notes:** None

### How aggressive should safety disclaimers be?

| Option | Description | Selected |
|--------|-------------|----------|
| Context-aware safety | Disclaimer at session start, then only when task involves risk. | ✓ |
| Always-on safety reminders | Safety reminders in every response. | |
| Minimal, trust the professional | Session-start only. Warns only on F-Gas regulated work. | |

**User's choice:** Context-aware safety
**Notes:** None

### How should the AI handle competence boundary refusals?

| Option | Description | Selected |
|--------|-------------|----------|
| Refuse + redirect | Refuses, explains why, offers to document findings for qualified follow-up. | ✓ |
| Hard refusal | Hard stop with no alternatives. | |
| Inform but don't guide | Provides general info but makes clear it's not guidance. | |

**User's choice:** Refuse + redirect
**Notes:** None

---

## logFinding Structure

### What categories should logFinding support?

| Option | Description | Selected |
|--------|-------------|----------|
| 5 core categories | safety, maintenance, regulatory, observation, recommendation | ✓ |
| Freeform categories | No enum, Gemini decides naturally. | |
| 3 minimal categories | safety, maintenance, observation. Expand later. | |

**User's choice:** 5 core categories
**Notes:** None

### How should severity levels work?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 levels | low, medium, high, critical. Critical triggers visual flags. | ✓ |
| 3 levels (traffic light) | info, warning, danger. | |
| Optional severity | Not every observation needs severity. | |

**User's choice:** 4 levels
**Notes:** None

### Should findings link to equipment models?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional equipment context | Optional equipment_model and manufacturer fields. Gemini includes when it can identify. | ✓ |
| Session-level only | No equipment linking. Comes in Phase 5. | |
| Required equipment identification | Gemini must identify equipment before logging. | |

**User's choice:** Optional equipment context
**Notes:** None

---

## Tool Failure Behavior

### How should lookupErrorCode handle missing error codes?

| Option | Description | Selected |
|--------|-------------|----------|
| Acknowledge + fallback | Structured "not found" response. AI tells technician and falls back to general knowledge. | ✓ |
| Silent fallback | Returns empty result silently. AI proceeds with general knowledge. | |
| Explicit failure, no guessing | Returns not-found. AI says it can't help with that lookup. | |

**User's choice:** Acknowledge + fallback
**Notes:** None

### How should tool execution timeouts work?

| Option | Description | Selected |
|--------|-------------|----------|
| 10s timeout, graceful skip | Return structured error, let AI continue without tool result. | ✓ |
| 5s timeout, aggressive | Tighter but might miss slow queries. | |
| No tool timeout | Let tools run until completion. | |

**User's choice:** 10s timeout, graceful skip
**Notes:** None

### How should invalid tool call input be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Error response to Gemini | Structured validation error so AI can rephrase or ask for clarification. | ✓ |
| Silent reject + log | Silently reject and log. AI won't know. | |
| Hard fail | Throw exception, terminate tool call chain. | |

**User's choice:** Error response to Gemini
**Notes:** None

---

## Claude's Discretion

- buildTool() factory API design
- Tool registry and dispatcher architecture
- System prompt layer ordering and exact wording
- Ephemeral token endpoint implementation details
- Test strategy for tools
- Error code JSON file structure
- logFinding in-memory storage strategy

## Deferred Ideas

None — discussion stayed within phase scope
