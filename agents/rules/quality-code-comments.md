---
title: Only Comment Why, Never What
impact: MEDIUM
tags: quality, comments, readability
---

## Only Comment Why, Never What

**Impact: MEDIUM**

Comments should explain non-obvious intent, trade-offs, or constraints. Never narrate what code does — the code itself communicates that.

**Bad comments (narrating what):**

```typescript
// Get the session
const session = await sessionRepo.findById(id);

// Check if session exists
if (!session) {
  // Throw not found error
  throw ErrorWithCode.NotFound("Session not found");
}

// Return the session
return session;
```

**Good comments (explaining why):**

```typescript
// Gemini's sessionResumption token expires after 2 minutes of disconnection.
// Beyond that window, we must create a fresh session instead of resuming.
const RESUMPTION_WINDOW_MS = 120_000;

// F-Gas EU 2024/573 requires logging refrigerant quantities above 5 tonnes CO2eq.
// This threshold varies by refrigerant type — R-410A hits it at ~2.6 kg.
if (charge > getRegulatedThreshold(refrigerantType)) {
  await logFinding({ category: "regulatory", severity: "high", ... });
}
```

**When to comment:**
- Regulatory or compliance reasons behind code
- Non-obvious performance trade-offs
- Workarounds for external API limitations
- Why a specific algorithm was chosen over alternatives
