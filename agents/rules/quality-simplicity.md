---
title: Prioritize Clarity Over Cleverness
impact: HIGH
tags: quality, simplicity, readability
---

## Prioritize Clarity Over Cleverness

**Impact: HIGH**

Code should be easy to read and understand on first pass. Simple systems reduce cognitive load for every engineer and every AI agent working in the codebase.

**Questions to ask before writing:**
- Am I actually solving the problem at hand?
- Am I thinking too much about possible future use cases?
- Have I considered at least one simpler alternative?

**Incorrect (clever but hard to parse):**

```typescript
const grouped = data.reduce((a, b) => ({...a, [b.id]: (a[b.id] || []).concat(b)}), {});
```

**Correct (clear and readable):**

```typescript
const groupedById: Record<string, Item[]> = {};

for (const item of data) {
  if (!groupedById[item.id]) {
    groupedById[item.id] = [];
  }
  groupedById[item.id].push(item);
}
```

**Aucta-specific applications:**
- Tool implementations: each tool's `call()` should be a linear sequence of steps, not nested promise chains
- System prompt assembly: use the array-based `buildEffectiveSystemPrompt()` pattern, not string concatenation
- Zustand stores: flat state shape, no deeply nested objects
- tRPC routers: one procedure per use case, no god-routers

Simple doesn't mean lacking in features. Systems should feel complete, not anemic.
