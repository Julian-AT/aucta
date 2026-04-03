---
title: Isolate Database Access Behind Repositories
impact: CRITICAL
tags: data, repository, drizzle, orm, isolation
---

## Isolate Database Access Behind Repositories

**Impact: CRITICAL**

Database access must go through Repository classes. Drizzle ORM calls must never appear in services, tRPC routers, or UI code. This enables testing with mocks and makes ORM changes a single-layer refactor.

**Incorrect (Drizzle leaking into a service):**

```typescript
import { db } from "@aucta/db";
import { aiSessions } from "@aucta/db/schema";

async function getSession(id: string) {
  return db.select().from(aiSessions).where(eq(aiSessions.id, id));
}
```

**Correct (Repository abstraction):**

```typescript
// packages/ai/src/session/sessionRepository.ts
import { db } from "@aucta/db";
import { aiSessions } from "@aucta/db/schema";
import type { SessionDTO } from "@aucta/shared/types";

export class SessionRepository {
  constructor(private db: DrizzleClient) {}

  async findById(id: string): Promise<SessionDTO | null> {
    const rows = await this.db
      .select({
        id: aiSessions.id,
        orgId: aiSessions.orgId,
        status: aiSessions.status,
        startedAt: aiSessions.startedAt,
      })
      .from(aiSessions)
      .where(eq(aiSessions.id, id));
    return rows[0] ?? null;
  }
}

// packages/ai/src/session/sessionService.ts
export class SessionService {
  constructor(private deps: { sessionRepo: SessionRepository }) {}

  async getSession(id: string) {
    return this.deps.sessionRepo.findById(id);
  }
}
```

**The standard:**
- All database access goes through Repository classes
- Repositories are the only code that knows about Drizzle
- No business logic in repositories — that belongs in Services
- Repositories return DTOs (Zod-validated), never raw Drizzle row types
- Services depend on repositories via constructor injection
