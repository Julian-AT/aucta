---
title: Git and CI Workflow
impact: HIGH
tags: git, ci, workflow
---

## Git and CI Workflow

**Impact: HIGH**

### Push Before Checking CI

Always push committed changes to the remote before waiting for CI status. CI runs on the remote repository state, not local commits.

**Proper sequence:**
1. Commit locally
2. Run local checks (`bun run typecheck`, `bun run lint`)
3. Push to remote
4. Monitor CI status

### Branch Strategy

- `main` — production, auto-deploys to Vercel + triggers EAS Build
- Feature branches from `main` — naming: `feat/tool-search-knowledge-base`, `fix/session-reconnect`
- Each PR gets a Neon database branch (copy-on-write)

### Never Force Push

Never force push to main or shared branches. Under any circumstances.

### Conventional Commits

PR titles and commit messages follow conventional commits:

```
feat(ai): add searchKnowledgeBase tool
fix(session): handle reconnection timeout gracefully
refactor(db): extract session repository
chore(deps): update @google/genai to 1.48.x
test(tools): add coverage for lookupErrorCode edge cases
docs: update TECH-SPEC with repository pattern
```

### After Schema Changes

When making changes that affect the database schema or after pulling updates that modify schema files:

1. Run `bunx drizzle-kit generate` from `packages/db/`
2. Run `bunx drizzle-kit migrate` to apply
3. Run `bun run typecheck` to verify all consumers compile
