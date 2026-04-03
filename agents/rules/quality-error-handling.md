---
title: Error Handling Patterns
impact: HIGH
tags: errors, trpc, services, repositories
---

## Error Handling Patterns

**Impact: HIGH**

Use descriptive errors with context. Use `ErrorWithCode` in services and repositories; use `TRPCError` only in tRPC routers.

### Descriptive Errors

```typescript
// Good — descriptive with context
throw new Error(`Session ${sessionId} not found for org ${orgId}`);

// Bad — generic
throw new Error("Session not found");
```

### ErrorWithCode in Services/Repositories

```typescript
// packages/shared/src/utils/errors.ts
export class ErrorWithCode extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ErrorWithCode";
  }

  static NotFound(message: string) {
    return new ErrorWithCode("NOT_FOUND", message);
  }

  static Forbidden(message: string) {
    return new ErrorWithCode("FORBIDDEN", message);
  }

  static BadRequest(message: string) {
    return new ErrorWithCode("BAD_REQUEST", message);
  }
}
```

```typescript
// In a service (NOT a tRPC router)
import { ErrorWithCode } from "@aucta/shared/utils/errors";

export class SessionService {
  async getSession(id: string, orgId: string) {
    const session = await this.deps.sessionRepo.findById(id);
    if (!session) throw ErrorWithCode.NotFound(`Session ${id} not found`);
    if (session.orgId !== orgId) throw ErrorWithCode.Forbidden("Cross-org access denied");
    return session;
  }
}
```

### TRPCError in Routers Only

```typescript
// In a tRPC router — convert ErrorWithCode to TRPCError via middleware
import { TRPCError } from "@trpc/server";

// Or throw directly in the router layer
throw new TRPCError({
  code: "NOT_FOUND",
  message: `Session ${input.id} not found`,
});
```

### Conversion Middleware

Add a tRPC middleware that catches `ErrorWithCode` and converts it to the appropriate `TRPCError`. This keeps services free of tRPC imports.

### packages/ai/ Import Restrictions

Files in `packages/ai/` must NOT import from `@trpc/server`. Use `ErrorWithCode` for all error handling in the AI pipeline.
