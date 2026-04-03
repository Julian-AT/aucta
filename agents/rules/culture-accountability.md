---
title: Hold Each Other Accountable for Quality
impact: MEDIUM
tags: culture, accountability, quality, teamwork
---

## Hold Each Other Accountable for Quality

**Impact: MEDIUM**

Cutting corners feels faster in the moment but creates problems that slow everyone down later. Every shortcut one person takes becomes everyone's problem.

**Challenge poor decisions, respectfully:**

```
// When someone says:
"Let's just hardcode this for now"

// The expected response:
"What would it take to do it properly the first time?"
```

```
// When someone wants to skip org_id filtering:
"Can we add the middleware check? I can help if needed."
```

```
// When someone skips tests for an AI tool:
"This tool handles safety-critical lookups — tests are non-negotiable."
```

**Aucta-specific accountability:**
- **Safety-critical code** (F-Gas calculations, safety recalls, escalation) requires tests and code review. No exceptions.
- **org_id filtering** is enforced at the tRPC middleware level. Never trust individual router implementations to handle it.
- **Knowledge base confidence levels** must be accurate. If AI-generated content is marked as `manufacturer_sourced`, that's a compliance violation.
- **Ephemeral tokens** must never be logged, cached beyond their TTL, or exposed in client state.

We succeed as a team or we fail as a team.
