---
title: PR Creation Best Practices
impact: HIGH
tags: pull-request, code-review, workflow
---

## PR Creation Best Practices

**Impact: HIGH**

### Draft Mode

Create pull requests in draft mode by default. A human reviewer marks it as ready for review.

### PR Title

Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`

```
feat(ai): add searchKnowledgeBase tool with hybrid retrieval
fix(session): handle WebSocket reconnection timeout
refactor(db): extract session repository from inline queries
```

### Size Limits

- **Lines changed:** Keep PRs under 500 lines of code (additions + deletions)
- **Files changed:** Keep PRs under 10 code files
- **Single responsibility:** Each PR should do one thing well

Lock files, generated files, and documentation are excluded from these counts.

### How to Split Large Changes

1. **By layer:** Database/schema changes, then backend logic, then frontend UI
2. **By feature component:** API endpoint PR, then UI PR, then integration PR
3. **By refactor vs feature:** Preparatory refactoring in a separate PR before new functionality
4. **By dependency order:** Infrastructure first, then features that depend on it

### Before Pushing

1. Run `bun run typecheck` to check types
2. Run `bun run lint` to lint and format
3. Run relevant tests locally
4. Verify no secrets or API keys in the diff
