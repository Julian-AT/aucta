---
phase: 01-foundation-and-auth
plan: 02
subsystem: database, auth
tags: [drizzle, neon, better-auth, rbac, postgres, repository-pattern]

requires:
  - phase: 01-01
    provides: "Turborepo monorepo, packages/shared (Zod schemas, constants, utils)"
provides:
  - "Drizzle ORM client connected to Neon Postgres via DATABASE_URL"
  - "Custom tables: invite_codes, org_settings, audit_log"
  - "Repository classes: InviteRepository, OrgSettingsRepository, AuditRepository"
  - "Better Auth server with emailAndPassword and organization plugin"
  - "RBAC permissions: owner, manager, technician roles"
  - "Shared base auth client with organizationClient plugin"
affects: [01-03, 01-04, 01-05, 01-06]

tech-stack:
  added: [drizzle-orm@^0.45.0, "@neondatabase/serverless@^1.0.0", drizzle-kit@^0.31.0, better-auth@^1.5.0]
  patterns: [repository-pattern, constructor-injection, dto-boundaries, zod-validation]

key-files:
  created:
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/drizzle.config.ts
    - packages/db/src/client.ts
    - packages/db/src/schema/invite-codes.ts
    - packages/db/src/schema/org-settings.ts
    - packages/db/src/schema/audit-log.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/repositories/invite.repository.ts
    - packages/db/src/repositories/org-settings.repository.ts
    - packages/db/src/repositories/audit.repository.ts
    - packages/db/vitest.config.ts
    - packages/auth/package.json
    - packages/auth/tsconfig.json
    - packages/auth/src/server.ts
    - packages/auth/src/client.ts
    - packages/auth/src/permissions.ts
  modified:
    - bun.lock

key-decisions:
  - "No FK constraints from custom tables to Better Auth tables to avoid schema management conflicts"
  - "Drizzle pinned to ^0.45.0 to avoid v1.0.0-beta trap"
  - "Base auth client uses better-auth/client (not better-auth/react) to stay framework-agnostic"
  - "OrgSettingsDTO defined locally in repository since it is db-specific, not shared across boundaries yet"

patterns-established:
  - "Repository pattern: DrizzleClient injected via constructor, queries in repository only"
  - "DTO boundaries: repositories parse results through Zod schemas before returning"
  - "Access control: createAccessControl with statement-based permissions, newRole per tier"

requirements-completed: [INFRA-05, AUTH-01, AUTH-06]

duration: 3min
completed: 2026-04-03
---

# Phase 01 Plan 02: Database & Auth Package Summary

**Drizzle ORM with Neon Postgres client, 3 custom tables with repository pattern, and Better Auth with 3-tier RBAC organization plugin**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T21:55:22Z
- **Completed:** 2026-04-03T21:58:13Z
- **Tasks:** 2/2
- **Files created:** 17

## Accomplishments

### Task 1: packages/db - Drizzle Client, Schema, and Repositories
- Created Drizzle client with Neon HTTP driver reading DATABASE_URL
- Defined 3 custom tables: `invite_codes` (with pgEnum for role), `org_settings`, `audit_log`
- Built InviteRepository with CRUD + usage increment, returning Zod-validated InviteCodeDTO
- Built OrgSettingsRepository with upsert (onConflictDoUpdate) and find
- Built AuditRepository with log insert and org-scoped find with ordering
- All repositories use constructor injection of DrizzleClient
- No FK constraints to Better Auth tables (application-layer referential integrity)
- Vitest config prepared for db package tests

### Task 2: packages/auth - Better Auth Server, Permissions, Client
- Configured Better Auth with Drizzle adapter pointing to db client
- Enabled emailAndPassword authentication
- Set up organization plugin with 3-tier RBAC:
  - **Owner:** full control (org, members, invites, settings)
  - **Manager:** create invites, view team, create members
  - **Technician:** view team only
- organizationLimit: 1 (single org per user, per D-12)
- creatorRole: "owner" (org creator becomes owner, per D-13)
- Created framework-agnostic base auth client with organizationClient plugin
- Session: 30-day expiry, daily refresh

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 276e116 | feat(01-02): add packages/db with Drizzle ORM, schema, and repositories |
| 2 | 480436c | feat(01-02): add packages/auth with Better Auth, RBAC, and client |

## Verification

- `bun run --filter @aucta/db typecheck` -- passed
- `bun run --filter @aucta/auth typecheck` -- passed
- `bun run typecheck` (full monorepo) -- 3/3 packages passed, 1 cached
- No tRPC imports in packages/db or packages/auth
- No Drizzle imports leaking outside packages/db
- drizzle-orm pinned to ^0.45.0 (not v1.0.0-beta)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all code is functional (repositories query real tables, auth server fully configured).

## Self-Check: PASSED

- All 17 created files verified present on disk
- Both commit hashes (276e116, 480436c) verified in git log
