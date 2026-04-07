---
phase: 01-foundation-and-auth
plan: 03
subsystem: api
tags: [trpc, middleware, rate-limiting, upstash, rbac, invite-codes]

requires:
  - phase: 01-foundation-and-auth/01
    provides: "Zod schemas, ErrorWithCode, constants, utils (id, invite-code)"
  - phase: 01-foundation-and-auth/02
    provides: "Better Auth server, RBAC permissions, Drizzle repositories (invite, org-settings, audit)"
provides:
  - "tRPC v11 server init with Better Auth session context"
  - "protectedProcedure and orgProcedure middleware chain"
  - "Upstash Redis rate limiting (auth 10/min, token 5/min, general 100/min)"
  - "ErrorWithCode to TRPCError conversion middleware"
  - "Org router: create, getCurrent, getMembers"
  - "Invite router: create, lookup, join, list, revoke"
  - "appRouter and AppRouter type export"
affects: [mobile-app, web-dashboard, ai-session]

tech-stack:
  added: ["@trpc/server@^11.16.0", "@upstash/redis@^1.37.0", "@upstash/ratelimit@^2.0.0"]
  patterns: ["tRPC middleware chain", "ErrorWithCode to TRPCError conversion", "org-scoped procedures"]

key-files:
  created:
    - packages/api/package.json
    - packages/api/tsconfig.json
    - packages/api/vitest.config.ts
    - packages/api/src/trpc.ts
    - packages/api/src/root.ts
    - packages/api/src/middleware/auth.ts
    - packages/api/src/middleware/org-scope.ts
    - packages/api/src/middleware/rate-limit.ts
    - packages/api/src/middleware/error-converter.ts
    - packages/api/src/routers/org.router.ts
    - packages/api/src/routers/invite.router.ts
  modified: []

key-decisions:
  - "orgId exclusively from session.activeOrganizationId (D-15), never from client input"
  - "Defensive null check in withOrgScope middleware for TS type narrowing across middleware boundaries"
  - "Better Auth server-side API calls pass headers for session context"
  - "Managers restricted to inviting technicians only (D-14 enforcement)"

patterns-established:
  - "tRPC middleware chain: publicProcedure -> isAuthed -> protectedProcedure -> withOrgScope -> orgProcedure"
  - "Error conversion: services throw ErrorWithCode, errorConverter middleware maps to TRPCError codes"
  - "Rate limiting: createRateLimitMiddleware factory wraps any Ratelimit instance as tRPC middleware"
  - "Router uses repositories via module-level instantiation with db from @aucta/db/client"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05, AUTH-07, AUTH-08, INFRA-06]

duration: 3min
completed: 2026-04-04
---

# Phase 01 Plan 03: tRPC API Layer Summary

**tRPC v11 API with auth/org-scope/rate-limit middleware stack, org CRUD router, and invite code management router with RBAC enforcement**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T08:36:15Z
- **Completed:** 2026-04-04T08:40:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Full tRPC middleware stack: auth guard, org-scope injection (D-15), Upstash rate limiting (10/5/100 per min), ErrorWithCode conversion
- Org router with create (auto-active-org per pitfall 2), getCurrent with settings, getMembers
- Invite router with create (D-14 RBAC), lookup preview (D-05), join with expiry/usage/single-org validation (D-12), list, revoke (owner-only)

## Task Commits

Each task was committed atomically:

1. **Task 1: tRPC Core - Init, Context, and Middleware Stack** - `fae337e` (feat)
2. **Task 2: tRPC Routers - Organization and Invite Code Management** - `9d9da20` (feat)

## Files Created/Modified
- `packages/api/package.json` - Package config with tRPC, Upstash deps
- `packages/api/tsconfig.json` - Extends library preset
- `packages/api/vitest.config.ts` - Test project config
- `packages/api/src/trpc.ts` - tRPC init, context with Better Auth session, IP extraction
- `packages/api/src/root.ts` - appRouter merging org + invite routers
- `packages/api/src/middleware/auth.ts` - isAuthed middleware, protectedProcedure
- `packages/api/src/middleware/org-scope.ts` - withOrgScope middleware, orgProcedure
- `packages/api/src/middleware/rate-limit.ts` - Upstash Redis rate limiters (auth/token/general)
- `packages/api/src/middleware/error-converter.ts` - ErrorWithCode to TRPCError conversion
- `packages/api/src/routers/org.router.ts` - Organization CRUD procedures
- `packages/api/src/routers/invite.router.ts` - Invite code management procedures

## Decisions Made
- orgId exclusively from session.activeOrganizationId (D-15) -- never accepted from client input, enforced at middleware level
- Defensive null check in withOrgScope for TypeScript type narrowing since TS cannot infer narrowing across separate middleware definitions
- Better Auth server-side API calls receive headers to resolve the authenticated session
- D-14 enforcement: managers restricted to inviting technicians only, owners can invite any role

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused TRPCError import in trpc.ts**
- **Found during:** Task 1
- **Issue:** TRPCError imported but not used in trpc.ts, causing TS6133 error
- **Fix:** Removed unused import
- **Files modified:** packages/api/src/trpc.ts
- **Committed in:** fae337e

**2. [Rule 1 - Bug] Added defensive null check in withOrgScope middleware**
- **Found during:** Task 1
- **Issue:** TypeScript TS18047 error -- ctx.session possibly null in withOrgScope despite being chained via protectedProcedure
- **Fix:** Added explicit null check for session before accessing activeOrganizationId
- **Files modified:** packages/api/src/middleware/org-scope.ts
- **Committed in:** fae337e

**3. [Rule 1 - Bug] Removed unused z import from org.router.ts**
- **Found during:** Task 2
- **Issue:** Zod z imported but not used directly (CreateOrgInput already imported as schema)
- **Fix:** Removed unused import
- **Files modified:** packages/api/src/routers/org.router.ts
- **Committed in:** 9d9da20

---

**Total deviations:** 3 auto-fixed (3 Rule 1 - Bug)
**Impact on plan:** All auto-fixes were necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None -- plan executed smoothly after fixing compilation issues.

## User Setup Required

**External services require manual configuration.** Upstash Redis is required for rate limiting:
- `UPSTASH_REDIS_REST_URL` - from Upstash Console -> Database -> REST API
- `UPSTASH_REDIS_REST_TOKEN` - from Upstash Console -> Database -> REST API
- Create a Redis database in EU region (Frankfurt or Ireland)

## Next Phase Readiness
- API layer fully operational, ready for mobile app integration
- Mobile auth screens (plan 05) can call org.create, invite.lookup, invite.join
- All org-scoped procedures enforce D-15 at the middleware level

## Self-Check: PASSED

All 11 created files verified present. Both task commits (fae337e, 9d9da20) verified in git history.

---
*Phase: 01-foundation-and-auth*
*Completed: 2026-04-04*
