---
title: packages/ vs apps/modules/ Boundaries
impact: HIGH
tags: architecture, boundaries, imports
---

## packages/ vs apps/modules/ Boundaries

**Impact: HIGH**

Shared packages contain framework-agnostic code. App-specific code that depends on tRPC hooks, React Navigation, or Next.js APIs lives in `apps/{app}/modules/`.

### packages/ (framework-agnostic)

- `packages/ai/` — AI pipeline: tools, session orchestration, knowledge base. No React, no tRPC client.
- `packages/api/` — tRPC router definitions and Inngest jobs. Server-only.
- `packages/db/` — Drizzle schema, repositories. No business logic.
- `packages/shared/` — Zod schemas, types, constants, utils. Zero dependencies on other packages.
- `packages/auth/` — Better Auth config. No UI.

### apps/{app}/modules/ (framework-specific)

```
apps/web/modules/
  sessions/
    hooks/useSessionList.ts        # tRPC hook — MUST be here
    components/SessionDetail.tsx   # Next.js component — MUST be here

apps/mobile/modules/
  session/
    hooks/useGeminiSession.ts      # Uses Zustand + tRPC — MUST be here
    components/SessionCamera.tsx   # Uses expo-camera — MUST be here
```

### Import Direction (one-way only)

```
packages/shared  ← packages/db  ← packages/ai  ← packages/api
                                                       ↑
                                              apps/web/modules/
                                              apps/mobile/modules/
```

**Violations to catch:**
- `packages/ai` importing from `@aucta/api` (tRPC) — NEVER
- `packages/shared` importing from `packages/ai` — NEVER
- `packages/db` importing from `packages/api` — NEVER
- `apps/web` importing Drizzle types directly — use DTOs instead
