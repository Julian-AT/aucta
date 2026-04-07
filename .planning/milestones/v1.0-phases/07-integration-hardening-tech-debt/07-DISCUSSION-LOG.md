# Phase 7: Integration Hardening and Tech Debt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 07-integration-hardening-tech-debt
**Areas discussed:** InMemoryFindingStore fate, Settings screen data, Pre-solved items verification, Ephemeral token constraints

---

## InMemoryFindingStore Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove, inline ID gen | logFinding tool generates a fnd_ ID inline (no store needed), returns it to Gemini. Delete InMemoryFindingStore class and tests entirely. | ✓ |
| Replace with minimal stub | Replace InMemoryFindingStore with a simple object that just generates an ID. Keeps FindingStore interface for future use. | |
| Keep but rename | Keep InMemoryFindingStore but rename to clarify it's ephemeral/server-only. Least code change. | |

**User's choice:** Remove, inline ID gen (user deferred to recommended option for best quality outcome)
**Notes:** Store's data is ephemeral anyway — lost when request ends. Real persistence is via mobile addFinding tRPC mutation (wired in Phase 6).

---

## Settings Screen Data

| Option | Description | Selected |
|--------|-------------|----------|
| Expand org.getCurrent | Add the current user's role to the org.getCurrent response. Single query gets both org name + user role. | ✓ |
| Use getMembers + filter | Call org.getMembers, filter by current userId client-side. Fetches all members when you only need one role. | |
| Add new endpoint | New org.getMyRole endpoint that returns just the current user's role. Most focused but adds a new endpoint. | |

**User's choice:** Expand org.getCurrent (Recommended)
**Notes:** Endpoint already calls getFullOrganization which includes members array. Natural extension.

---

## Pre-Solved Items Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Verify and skip | Verify these are working, mark SC2 and SC4 as already-met in context. Focus phase work on 3 remaining items. | ✓ |
| Verify with edge case review | Re-read the code more carefully, check edge cases (loading states, error states, null org). Light hardening pass. | |
| Full tech debt re-audit | Review all 6 original tech debt items from milestone audit to see if anything else was quietly fixed. | |

**User's choice:** Verify and skip (Recommended)
**Notes:** SC2 (home org name) fixed in Phase 4, SC4 (incrementFindingsCount) wired in Phase 6.

---

## Ephemeral Token Constraints

| Option | Description | Selected |
|--------|-------------|----------|
| Add to constraints | Add tools/functionDeclarations to liveConnectConstraints.config so Gemini enforces tool set at token level. Client still sends them in setup for backwards compatibility. | ✓ |
| Add to constraints, remove from response | Add to constraints AND remove tool declarations from response. Tighter but requires mobile client change. | |
| Full: constraints + test + client cleanup | Add to constraints, remove from response, and add a test verifying constraints include tool declarations. | |

**User's choice:** Add to constraints (Recommended)
**Notes:** Additive change, no mobile client modifications needed. Security-in-depth measure.

---

## Claude's Discretion

- Test strategy for modified code
- FindingStore interface cleanup after removing InMemoryFindingStore
- Whether to update existing tests or add new ones for constraints change

## Deferred Ideas

None — discussion stayed within phase scope.
