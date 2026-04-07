# Phase 4: Session Lifecycle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-session-lifecycle
**Areas discussed:** Feedback UX, Session data persistence, Summary generation & display, Offline caching scope

---

## Feedback UX

### Q1: How should the post-session feedback prompt appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated feedback screen | Full-screen route appears with star rating + optional text before returning to Home. Ensures feedback isn't missed. | ✓ |
| Bottom sheet on Home | Bottom sheet slides up over Home screen. Less disruptive but easier to dismiss with gloves. | |
| Inline prompt on Home | Inline card on Home screen. Least disruptive but also least noticeable. | |

**User's choice:** Dedicated feedback screen
**Notes:** None

### Q2: Should the feedback rating be required or skippable?

| Option | Description | Selected |
|--------|-------------|----------|
| Required stars, optional text | Star rating required, text note optional. Skip button available but de-emphasized. | ✓ |
| Fully optional | Both stars and text optional. Prominent Skip button. Lower friction but less data. | |
| Mandatory rating | No skip option. Must rate before continuing. Maximum data but may frustrate busy techs. | |

**User's choice:** Required stars, optional text
**Notes:** None

### Q3: Should the feedback screen show a brief session recap?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal session recap | Duration, tools used, AI language detected. Quick summary before rating. | ✓ |
| Rating only, no recap | Just the star rating + text input. Clean and fast. | |
| Detailed recap + rating | Full session recap with findings list, tools used, duration. More informative but heavier. | |

**User's choice:** Minimal session recap
**Notes:** None

---

## Session Data Persistence

### Q4: When should the AI session record be created?

| Option | Description | Selected |
|--------|-------------|----------|
| Create on session start | Create row when technician taps Start Session (before WebSocket). Update on completion. Captures failed sessions. | ✓ |
| Create on session end | Create row only after successful session end + feedback. Cleaner data but loses failed sessions. | |
| Lightweight start, full end | Lightweight row on start, full data on end. Two-phase approach. | |

**User's choice:** Create on session start
**Notes:** None

### Q5: How should findings and tool call history be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate related tables | Separate session_findings and session_tool_calls tables with FK. Normalized, queryable. | ✓ |
| JSON columns | Store as JSON arrays on ai_sessions. Simpler but harder to query. | |
| Counts only | Only store counts. Detail is lost but minimal schema. | |

**User's choice:** Separate related tables
**Notes:** None

### Q6: How should token usage be tracked?

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side counting | Count Gemini messages in Zustand. Approximate but no extra API calls. | ✓ |
| From Gemini response metadata | Parse usageMetadata from server messages. More accurate but more parsing. | |
| Skip token tracking | Don't track in v1. Simplify implementation. | |

**User's choice:** Client-side counting
**Notes:** None

### Q7: How should session data get from mobile to server?

| Option | Description | Selected |
|--------|-------------|----------|
| Single mutation on end | One tRPC mutation with all data after session ends. One round-trip. | |
| Real-time streaming | Send findings/tool calls during session. End only sends final metadata. | |
| Multiple focused mutations | Collect locally, submit in batches. Multiple mutations each focused. | |

**User's choice:** Other (free text)
**Notes:** User requested crash resilience: "Take an approach where not all data is lost when the session crashes. We must collect as much data as possible. When we have a 10 minute session that crashes after 8min, everything is gone. Take the approach you deem best to prevent this." Captured as D-07: incremental persistence during session, implementation approach at Claude's discretion.

---

## Summary Generation & Display

### Q8: What format should the session summary take?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured sections | Markdown with sections: Problem, Steps, Findings, Recommendations. Scannable. | ✓ |
| Narrative paragraph | Single paragraph summarizing conversationally. Natural but hard to scan. | |
| Key-value metadata only | Equipment, Issue, Resolution, Duration. Minimal, dashboard-friendly. | |

**User's choice:** Structured sections
**Notes:** None

### Q9: Which AI model should generate summaries?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Gemini 2.5 Flash | Cheaper, no real-time needed, handles structured output. | |
| In-session via Live API | Reuse session before closing. Zero extra cost but ties to context limits. | |
| You decide | Let planner decide based on cost/effort. | |

**User's choice:** Other (free text)
**Notes:** "We can use a better Gemini model. Look up the best model for this task, cost is not that important. Also maybe let's attach this to the plan of the customer in a future phase/milestone (which model is used)." Captured as D-09 (best model, researcher to confirm) + deferred idea (per-customer model selection).

### Q10: How should the AI-generated content label appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Badge/tag on summary | "AI-generated summary" badge with info icon. Visible but not intrusive. | ✓ |
| Disclaimer text header | Italic text at top of every summary. More explicit. | |
| Badge + disclaimer | Both badge and disclaimer line. Maximum compliance. | |

**User's choice:** Badge/tag on summary
**Notes:** None

### Q11: Where does the technician see session summaries?

| Option | Description | Selected |
|--------|-------------|----------|
| Last session on Home + MMKV | Last summary on Home screen, cached locally. No full history UI (deferred). | ✓ |
| Basic session list screen | Scrollable list of past sessions. Tap to expand. | |
| You decide | Claude decides where to show summaries. | |

**User's choice:** Last session on Home + MMKV cache
**Notes:** None

---

## Offline Caching Scope

### Q12: How many session summaries to cache?

| Option | Description | Selected |
|--------|-------------|----------|
| Last 10-20 sessions | Enough for recent reference. Auto-evict oldest. | ✓ |
| Last 5 sessions | Minimal footprint. | |
| Last 30 days | More history but larger storage. | |

**User's choice:** Last 10-20 sessions
**Notes:** None

### Q13: Should KB articles be cached now?

| Option | Description | Selected |
|--------|-------------|----------|
| Sessions only, skip KB | KB doesn't exist until Phase 5. Cache only session data. | ✓ |
| Add KB cache skeleton | Placeholder infrastructure ready for Phase 5. | |
| You decide | Claude decides based on effort. | |

**User's choice:** Sessions only, skip KB
**Notes:** None

### Q14: When should the cache sync?

| Option | Description | Selected |
|--------|-------------|----------|
| On app open + after session | Sync on launch and after each session ends. Simple and predictable. | ✓ |
| Real-time push | tRPC SSE subscription. Instant but more complex. | |
| Manual refresh only | Pull-to-refresh only. | |

**User's choice:** On app open + after session
**Notes:** None

---

## Claude's Discretion

- Inngest job configuration and retry strategy
- Exact ai_sessions schema beyond captured decisions
- Crash-resilient persistence approach (real-time mutations vs MMKV buffer)
- Feedback screen visual design
- MMKV cache key structure
- Data flow from Zustand to feedback screen
- Inngest handler route placement

## Deferred Ideas

- Per-customer AI model selection for summaries (future milestone)
- KB article offline caching (Phase 5 dependency)
- Full session history/explorer UI (PROJECT.md Out of Scope)
- Real-time push for summary availability (simpler sync sufficient)
