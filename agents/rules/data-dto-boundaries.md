---
title: Use DTOs at Every Architectural Boundary
impact: CRITICAL
tags: data, dto, boundaries, security, types
---

## Use DTOs at Every Architectural Boundary

**Impact: CRITICAL**

Drizzle row types must never leak to the frontend. Explicit DTOs at every boundary prevent technology coupling, security risks, and fragile contracts.

**Incorrect (Drizzle types leaking):**

```typescript
// tRPC router returning raw Drizzle types
import type { InferSelectModel } from "drizzle-orm";
import { aiSessions } from "@aucta/db/schema";

type Session = InferSelectModel<typeof aiSessions>;

export const sessionRouter = router({
  getById: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(aiSessions); // leaks all columns
  }),
});
```

**Correct (explicit DTOs with Zod):**

```typescript
// packages/shared/src/schemas/session.schema.ts
import { z } from "zod";

export const SessionDTO = z.object({
  id: z.string(),
  orgId: z.string(),
  status: z.enum(["active", "completed", "failed", "timeout"]),
  startedAt: z.date(),
  durationMs: z.number().nullable(),
  feedbackRating: z.number().min(1).max(5).nullable(),
});

export type SessionDTO = z.infer<typeof SessionDTO>;
```

**The standard:**

1. **Repository → Service:** Repository returns Zod-validated DTOs from `packages/shared/src/schemas/`
2. **Service → tRPC Router:** Service returns DTOs; router may narrow further for specific endpoints
3. **tRPC Router → Client:** Client receives typed DTOs via tRPC inference

All DTO conversions pass through Zod to validate data before crossing a boundary.

**Enum/union pattern — use string literal unions, not Drizzle enums:**

```typescript
// Good — ORM-agnostic
export type SessionStatus = "active" | "completed" | "failed" | "timeout";

// Bad — importing Drizzle enum
import { sessionStatusEnum } from "@aucta/db/schema";
```
