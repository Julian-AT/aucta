# Aucta V2 Technical Specification

> **Generated:** 2026-04-11
> **Branch:** `clean/v2-foundation`
> **Base Commit:** `3d936f9` (reset to v1 foundation)
> **Purpose:** Complete blueprint for V2 development milestones

---

## Table of Contents

1. [Post-Reset Repo State](#1-post-reset-repo-state)
2. [Build Results](#2-build-results)
3. [Cal.com Gap Analysis](#3-calcom-gap-analysis)
4. [Refactoring Plan](#4-refactoring-plan)
5. [UI Component Strategy](#5-ui-component-strategy)
6. [Creation Plan](#6-creation-plan)
7. [Dashboard Auth Architecture](#7-dashboard-auth-architecture)
8. [Milestone Task Plan](#8-milestone-task-plan)
9. [CLAUDE.md Improvement Plan](#9-claudemd-improvement-plan)
10. [AGENTS.md Improvement Plan](#10-agentsmd-improvement-plan)
11. [Definition of Done](#11-definition-of-done)
12. [GDPR & Security](#12-gdpr--security)
13. [Observability](#13-observability)
14. [Database Strategy](#14-database-strategy)
15. [Offline Resilience](#15-offline-resilience)
16. [CI/CD Pipeline](#16-cicd-pipeline)
17. [Scalability](#17-scalability)

---

## 1. Post-Reset Repo State

### What Was Removed

All planning sprawl from V1 development was removed during the reset. The branch was restored to the `v1.0` tag state, then stale root-level documents were removed:

- `.planning/` -- entire directory (research, specs, state files)
- `_v2-workspace/` -- entire directory
- `~/` -- home directory artifacts
- `AUCTA-CONTEXT.md` -- superseded by CLAUDE.md
- `AUDIT-REPORT.md` -- one-time audit output
- `STANDARDS.md` -- merged into AGENTS.md rules
- `SPEC-WORKFLOW.md` -- spec-driven workflow (integrated into AGENTS.md)
- `STATE.md` -- ephemeral state tracking

### What Remains

```
aucta/
  .claude/                    # AI agent configuration (rules + skills symlinks)
  .cursor/                    # Cursor AI configuration (rules symlink)
  .github/workflows/ci.yml   # Basic CI pipeline
  agents/                     # Centralized agent rules (14 rules + 3 docs)
    rules/                    # 14 categorized rule files
    README.md                 # Rule index
    commands.md               # CLI command reference
    knowledge-base.md         # Domain knowledge (HVAC, sessions, Gemini)
  apps/
    mobile/                   # Expo SDK 55 mobile app (14 routes, 16 components)
    server/                   # Bun HTTP server (83 lines, routes to tRPC/Auth/Inngest)
    web/                      # Empty placeholder (Next.js dashboard -- later milestone)
  packages/
    ai/                       # AI pipeline: tools (3 of 10), prompts, knowledge base
    api/                      # tRPC routers (22 procedures), middleware (4), Inngest jobs (4)
    auth/                     # Better Auth config (3-role RBAC)
    config/                   # Shared tsconfig files (base, library, app)
    db/                       # Drizzle schema (16 tables), client, repositories (9)
    shared/                   # Zod schemas (10), constants (3), utils (3)
  specs/_templates/           # Spec-driven development templates (5)
  biome.json                  # Biome 2.4.10 config
  turbo.json                  # Turborepo pipeline
  vitest.config.ts            # Root test config
  package.json                # Bun 1.3.8, workspaces, dev scripts
  bun.lock                    # Lockfile
  eas.json                    # EAS Build profiles (dev/preview/prod)
  CLAUDE.md                   # Agent instructions (tech stack, conventions)
  AGENTS.md                   # Development guide (do/don't, boundaries, examples)
  TECH-SPEC.md                # V1 technical specification (reference)
  LEGAL-ADMIN.md              # Business/regulatory documentation
```

### Codebase Statistics

| Metric | Count |
|--------|-------|
| Total TypeScript source lines | ~9,516 (non-test) |
| Test files | 43 |
| Tests (all passing) | 192+ |
| Database tables | 16 |
| tRPC procedures | 22 |
| Inngest background jobs | 4 |
| AI tools (implemented / planned) | 3 / 10 |
| Mobile routes | 14 |
| Mobile components | 16 |
| RBAC roles | 3 (owner, manager, technician) |
| Agent rules | 14 |

### Git State

| Item | Value |
|------|-------|
| Branch | `clean/v2-foundation` |
| Base tag | `v1.0` |
| Reset commit | `3d936f9` |
| Snapshot tag | `pre-reset-snapshot` |
| Foundation tag | `v2-foundation` |

---

## 2. Build Results

### Typecheck Results

| Package | Status | Notes |
|---------|--------|-------|
| `@aucta/shared` | PASS | Clean |
| `@aucta/db` | PASS | Clean |
| `@aucta/ai` | PASS | Clean |
| `@aucta/api` | PASS | Clean |
| `@aucta/auth` | N/A | No typecheck script |
| `@aucta/config` | N/A | Config-only package |
| `@aucta/server` | **FAIL** | 3 errors (see below) |
| `mobile` | PASS | Uses TS ~5.9.2 for Expo compat |
| `web` | EMPTY | No source files |

### Server Typecheck Failures

```
apps/server/src/index.ts:
  1. `import.meta.dir` -- Property 'dir' does not exist on type 'ImportMeta'
  2. `Bun.serve()` -- Cannot find name 'Bun'
  3. Import attributes syntax -- Requires `module: "esnext"` or `"nodenext"`
```

**Fix:** Add `@types/bun` as devDependency and update tsconfig to support import attributes.

### Test Results

| Package | Status | Test Files | Tests |
|---------|--------|-----------|-------|
| `@aucta/shared` | PASS | 5 | ~25 |
| `@aucta/db` | PASS | 6 | ~30 |
| `@aucta/ai` | PASS | 16 | ~80 |
| `@aucta/api` | PASS | 7 | ~35 |
| `mobile` | PASS | 9 | ~22 |
| **Total** | **PASS** | **43** | **192+** |

### Lint Results

Biome check passes across the monorepo (formatter + linter + import organization).

### Version Discrepancies

| Technology | TECH-SPEC Version | Actual | Impact |
|------------|-------------------|--------|--------|
| TypeScript | ^6.0.0 | ~5.9.2 (mobile) | Expected: Expo SDK 55 pins TS to 5.9.x |
| Tailwind CSS | 4.2.x | 3.4.17 (mobile) | Expected: NativeWind v4 requires TW v3 |
| NativeWind | 4.2.3 or 5.0-preview | 4.2.3 | Correct per spec recommendation |

---

## 3. Cal.com Gap Analysis

Research source: analysis of `github.com/calcom/cal.com` main branch (April 2026).

### CRITICAL Priority Gaps

| # | Pattern | Cal.com | Aucta V1 Gap | V2 Action |
|---|---------|---------|--------------|-----------|
| 1 | **Service layer** | Strict Router -> Service -> Repository. Controllers handle ONLY HTTP concerns. | Business logic lives directly in tRPC router handlers (e.g., `session.router.ts` at 258 lines). | Extract service classes for each domain: `SessionService`, `KnowledgeService`, `OrgService`, `InviteService`. Routers become thin: parse input, call service, return result. |
| 2 | **Repository isolation** | All DB access through Repository classes. ORM (Prisma) knowledge stays in repositories only. | Repositories exist but Drizzle imports leak into router files. No BaseTenantRepository. | Create `BaseTenantRepository` base class. All queries go through repositories. Drizzle types never appear in services or routers. |
| 3 | **DTO boundaries** | `packages/lib/dto/` with Zod validation. Database types never reach frontend. | DTOs exist in `@aucta/shared` but inconsistently enforced. Router code directly uses DB types. | Enforce DTO validation on repository output. Services accept/return DTOs only. Add Biome rule to ban Drizzle type imports outside `@aucta/db`. |
| 4 | **ErrorWithCode** | `ErrorWithCode` in services/repos/utils. `TRPCError` only in routers. Auto-conversion middleware. | `ErrorWithCode` class exists in `@aucta/shared/utils/errors.ts`. Error converter middleware exists. Not consistently used -- routers still throw `TRPCError` directly. | Enforce: services throw `ErrorWithCode` exclusively. Routers rely on `error-converter.ts` middleware. Add lint rule. |
| 5 | **Anti-barrel imports** | Explicit rule, enforced via Biome `noRestrictedImports`. Direct path imports everywhere. | `packages/db/src/schema/index.ts` is a barrel file. Other packages use barrel exports. | Remove barrel files. Configure Biome `noRestrictedImports` to warn on `@aucta/*/index` imports. Use direct path imports. |

### HIGH Priority Gaps

| # | Pattern | Cal.com | Aucta V1 Gap | V2 Action |
|---|---------|---------|--------------|-----------|
| 6 | **turbo.json env management** | 200+ env vars in `globalEnv`, per-task `env` arrays, `inputs` for cache keys. | Minimal turbo.json with no env configuration. Cache invalidation is unreliable. | Add `globalEnv` for DATABASE_URL, NODE_ENV, SENTRY_DSN. Add per-task env for build-affecting vars. |
| 7 | **Dependency boundary enforcement** | Biome `noRestrictedImports` prevents circular deps between packages. | No import restrictions. `@aucta/api` imports from all packages without boundaries. | Add Biome overrides: `@aucta/shared` cannot import from other @aucta packages. `@aucta/db` cannot import from `@aucta/api`. |
| 8 | **Constructor injection + DI** | `@evyweb/ioctopus` with token-based DI. Feature-level `di/` directories. | Repositories instantiated at module level in router files (`const repo = new SessionRepository(db)`). No DI container. | Adopt constructor injection. Services receive repository dependencies in constructor. Use manual factory functions (`createServices()`) per-request in tRPC context. No DI container — manual factories are simpler and sufficient at this scale. |
| 9 | **Shared tsconfig package** | `@calcom/tsconfig` with base, nextjs, react-library configs. | `@aucta/config` has base, library, app configs but is underutilized. No Expo-specific or Next.js-specific configs. | Add `tsconfig.expo.json` and `tsconfig.nextjs.json` to `@aucta/config`. |
| 10 | **Pre-commit hooks** | Husky 9.x + lint-staged. Biome formatting on staged files. | No pre-commit hooks. Formatting relies on manual `bun run format`. | Set up Husky + lint-staged. Run Biome format on staged TS/TSX files. |

### MEDIUM Priority Gaps

| # | Pattern | V2 Action |
|---|---------|-----------|
| 11 | **env-check root tasks** | Add `dotenv-checker` validation, Turbo root task before `dev`. |
| 12 | **Repository method naming** | Document convention: `findById()` not `findSessionById()`, `findByIdIncludeFindings()` for relations. |
| 13 | **dx command** | Create `bun run dx` that chains DB push -> seed -> dev. |
| 14 | **Function length limit** | Add `noExcessiveLinesPerFunction` at 100 lines to Biome config. |
| 15 | **Agent rule frontmatter** | Adopt `title`, `impact`, `tags` frontmatter in all `agents/rules/*.md` files. |
| 16 | **PR size limits** | Enforce <500 lines, <10 files. Already in AGENTS.md but not CI-enforced. |
| 17 | **Import ordering** | Configure Biome `organizeImports` with group ordering: mocks -> packages -> @aucta -> relative. |
| 18 | **sideEffects: false** | Add to all `@aucta/*` package.json files for tree-shaking. |
| 19 | **TZ=UTC for tests** | Prefix all test scripts with `TZ=UTC` for timezone consistency. |
| 20 | **clean command** | Add `"clean": "find . -name node_modules -o -name .turbo -o -name dist -type d -prune | xargs rm -rf"`. |

---

## 4. Refactoring Plan

### Phase 1: Architecture Foundation (must do before any feature work)

#### 4.1 Service Layer Extraction

**Current state:** Business logic in tRPC router handlers.
**Target state:** Router -> Service -> Repository (Cal.com pattern).

Files to refactor:

| Router | Lines | Service to Create | Key Logic to Extract |
|--------|-------|-------------------|---------------------|
| `session.router.ts` | 258 | `SessionService` | Ephemeral token creation, tool dispatch, session lifecycle, feedback, summary retrieval |
| `knowledge.router.ts` | ~200 | `KnowledgeService` | Article CRUD with embedding, verification workflow, health check delegation |
| `invite.router.ts` | ~150 | `InviteService` | Code generation, lookup with org enrichment, join flow with auth |
| `org.router.ts` | ~80 | `OrgService` | Org creation with settings, member listing |

Target directory structure:
```
packages/api/src/
  routers/          # Thin tRPC handlers (parse input, call service, return)
  services/         # Business logic, orchestration
  middleware/       # Auth, rate-limit, org-scope, error-converter, audit
```

#### 4.2 BaseTenantRepository

Create a generic base class that injects `organizationId` into every query:

```
packages/db/src/repositories/
  base-tenant.repository.ts    # Abstract base with tenantWhere()
  session.repository.ts        # Extends BaseTenantRepository
  knowledge-article.repository.ts
  ... (all tenant-scoped repos)
```

Constructor signature: `constructor(db: DrizzleClient, ctx: TenantContext)`
where `TenantContext = { organizationId: string; userId: string }`.

#### 4.3 DI Wiring — Manual Factory Functions

**Decision:** Manual factory functions. No DI container library.

**Rationale:** Manual factories are simpler to read and debug, easier for LLMs to work with (no magic binding resolution), and appropriate for a codebase of this size (~20 services). A DI container adds indirection without proportional value here.

Factory definition:

```typescript
// packages/api/src/factories.ts
import type { DrizzleClient } from '@aucta/db/client';
import type { TenantContext } from '@aucta/db/repositories/base-tenant.repository';

export function createRepositories(db: DrizzleClient, ctx: TenantContext) {
  return {
    session: new SessionRepository(db, ctx),
    knowledge: new KnowledgeArticleRepository(db, ctx),
    invite: new InviteRepository(db, ctx),
    org: new OrgRepository(db, ctx),
  };
}

export function createServices(db: DrizzleClient, ctx: TenantContext) {
  const repos = createRepositories(db, ctx);
  return {
    session: new SessionService(repos.session),
    knowledge: new KnowledgeService(repos.knowledge),
    invite: new InviteService(repos.invite),
    org: new OrgService(repos.org),
  };
}
```

tRPC context wiring:

```typescript
// packages/api/src/trpc.ts -- in createTRPCContext()
const tenantCtx = { organizationId: session.activeOrganizationId, userId: session.userId };
return {
  session, headers, ip,
  services: createServices(db, tenantCtx),
};
```

Router usage (thin controller):

```typescript
// packages/api/src/routers/session.router.ts
export const sessionRouter = router({
  create: protectedProcedure
    .input(createSessionSchema)
    .mutation(({ ctx, input }) => ctx.services.session.create(input)),
  list: protectedProcedure
    .query(({ ctx }) => ctx.services.session.list()),
});
```

#### 4.4 Barrel File Removal

Remove `packages/db/src/schema/index.ts` barrel exports. Update all imports to use direct paths:
```typescript
// Before: import { sessions } from '@aucta/db/schema';
// After:  import { sessions } from '@aucta/db/schema/ai-sessions';
```

Add Biome `noRestrictedImports` override to enforce.

### Phase 2: DX & Tooling

- Husky + lint-staged setup
- turbo.json env management
- dx command
- env-check validation
- Biome rules (function length, import boundaries, import ordering)
- sideEffects: false on all packages

### Phase 3: Server Fixes

- Add `@types/bun` to `@aucta/server`
- Fix tsconfig for import attributes
- Add structured logging (Pino)
- Add health check endpoint
- Add graceful shutdown handler

---

## 5. UI Component Strategy

### Research Finding: Gluestack UI v4 is ALPHA -- NOT Stable

| Version | Status | npm Tag | Risk |
|---------|--------|---------|------|
| v3 | **Stable (production)** | `latest` | LOW |
| v4 | Alpha (3 releases, Jan 2026) | _(none)_ | HIGH |
| v5 | Alpha (12 releases, Mar-Apr 2026) | `alpha` | VERY HIGH |

Key findings:
- v4 may be superseded by v5 before reaching stable
- Neither v4 nor v5 supports Tailwind CSS v4 (both require TW v3 via NativeWind v4)
- v4 dropped `@legendapp/motion` for most components in favor of `react-native-reanimated`
- v4 aligns token names with shadcn/ui (background, foreground, primary, muted, destructive, etc.)

### Tailwind CSS Version Gap

| Platform | Required TW Version | Reason |
|----------|-------------------|--------|
| Mobile (NativeWind v4) | Tailwind CSS **v3** | NativeWind v4 compiles TW v3 classes to StyleSheet |
| Web (Next.js 16) | Tailwind CSS **v4** | CSS-first config, Oxide engine |

This is an inherent split. NativeWind v5 (which would support TW v4) is preview/unstable. Accept TW v3 for mobile.

### Recommended Strategy

| Platform | Component Library | Styling | Status |
|----------|------------------|---------|--------|
| **Mobile** | React Native Reusables + custom components | NativeWind v4.2.3 (TW v3) | Ready |
| **Web Dashboard** | shadcn/ui (Radix primitives) | Tailwind CSS v4.2.x | Ready |
| **Shared tokens** | CSS custom properties (`--primary`, `--background`, etc.) | Shared `config.ts` | Design |

### Design Token Sharing

Use the shadcn/ui semantic token convention across both platforms:

```
--background / --foreground
--primary / --primary-foreground
--secondary / --secondary-foreground
--muted / --muted-foreground
--accent / --accent-foreground
--destructive
--border, --input, --ring
```

Mobile: defined in NativeWind `vars()` config.
Web: defined as CSS custom properties in `globals.css`.

### Gluestack Upgrade Path

Monitor v5 development. If v5 reaches stable with Tailwind v4 support, evaluate migrating mobile components to Gluestack v5 for universal rendering. Until then, the split strategy (RN Reusables for mobile, shadcn for web) is the pragmatic choice.

---

## 6. Creation Plan

### New Packages to Create

| Package | Purpose | Priority |
|---------|---------|----------|
| `@aucta/email` | React Email templates + Resend transport | M2 |
| `@aucta/i18n` | Shared i18n configuration (7 languages) | M1 |
| `@aucta/testing` | Shared test utilities, factories, mocks | M1 |

### New Files to Create (Milestone 1)

| File | Purpose |
|------|---------|
| `packages/api/src/services/session.service.ts` | Session business logic |
| `packages/api/src/services/knowledge.service.ts` | Knowledge base business logic |
| `packages/api/src/services/invite.service.ts` | Invite code business logic |
| `packages/api/src/services/org.service.ts` | Organization business logic |
| `packages/db/src/repositories/base-tenant.repository.ts` | Tenant-scoped query base class |
| `packages/db/src/seed/dev.ts` | Development seed data (faker) |
| `packages/db/src/seed/ci.ts` | Minimal CI test fixtures |
| `packages/shared/src/env.ts` | Zod-validated environment variables |
| `.husky/pre-commit` | Lint-staged hook |
| `.lintstagedrc.json` | Staged file formatting config |
| `renovate.json` | Dependency update automation |
| `.github/dependabot.yml` | Security vulnerability alerts |

### New Files to Create (Milestone 2+)

| File | Purpose | Milestone |
|------|---------|-----------|
| `apps/web/` (full Next.js app) | Manager/owner dashboard | M2 |
| `packages/email/` (React Email) | Transactional email templates | M2 |
| `.github/workflows/pr.yml` | PR pipeline (lint, test, build, migration check) | M1 |
| `.github/workflows/deploy.yml` | Deploy pipeline (staging -> E2E -> production) | M2 |
| `.github/workflows/mobile.yml` | EAS Build + OTA updates | M2 |
| `.github/workflows/security.yml` | CodeQL + Semgrep SAST | M1 |
| `packages/db/drizzle.config.ts` | Drizzle Kit migration config | M1 |

---

## 7. Dashboard Auth Architecture

### 7.1 Sign-Up Flow

Business owner signs up on the web dashboard. Organization creation is a separate step after registration (better-auth's organization plugin does not bundle org creation into sign-up).

**Sequence:**

1. Owner visits `/signup` → enters email + password → `authClient.signUp.email()`
2. After sign-up, redirected to `/onboarding/create-org`
3. Owner enters org name + slug → `authClient.organization.create({ name, slug })`
4. Owner gets `owner` role automatically (creator = owner)
5. Redirected to `/dashboard` with active organization set

```typescript
// Step 1: Sign up
const { data, error } = await authClient.signUp.email({
  email: "owner@company.com",
  password: "...",
  name: "Jane Owner",
});

// Step 2: Create organization (after redirect to onboarding)
const { data: org } = await authClient.organization.create({
  name: "HVAC Solutions GmbH",
  slug: "hvac-solutions",
});
// Creator automatically gets 'owner' role. Org is set as active.
```

### 7.2 Sign-In Flow

Cookie-based sessions for web (not JWT). better-auth uses `httpOnly` cookies by default with Next.js.

```typescript
// Client-side sign in
const { data, error } = await authClient.signIn.email({
  email: "owner@company.com",
  password: "...",
});
// Sets httpOnly session cookie automatically
```

Server-side session access (Next.js Server Component or Route Handler):

```typescript
// In a Server Component or Route Handler
import { auth } from '@aucta/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({
  headers: await headers(),
});
// session.user, session.session, session.session.activeOrganizationId
```

### 7.3 Organization Switching

If a user belongs to multiple organizations, the dashboard provides an org switcher. better-auth tracks the active organization on the session.

```typescript
// Client: list user's organizations
const { data: orgs } = await authClient.organization.list();

// Client: switch active organization
const { data } = await authClient.organization.setActive({
  organizationId: "org-id-2",
});
// Updates session cookie with new activeOrganizationId
```

All org-scoped API calls read `activeOrganizationId` from the session. The tRPC context factory (Section 4.3) uses this to construct the `TenantContext`.

### 7.4 Invite Flow (Dashboard → Mobile)

Owner generates invite on dashboard → technician enters code in mobile app.

**Dashboard side (owner):**

```typescript
// Owner invites a technician by email
const { data, error } = await authClient.organization.inviteMember({
  email: "tech@example.com",
  role: "technician",   // Aucta role: owner | manager | technician
  organizationId: activeOrg.id,
});
// Returns invitation with ID. Email sent via @aucta/email.
```

**Mobile side (technician):**

```typescript
// Technician accepts invitation (after signing up/in on mobile)
const { data, error } = await authClient.organization.acceptInvitation({
  invitationId: "invitation-id",
});
// Technician joins org with 'technician' role. Org set as active.
```

**Alternative — invite code flow:** If using a short code (e.g., 6-char alphanumeric) instead of email-based invites, implement a custom tRPC endpoint that:
1. Looks up invitation by code
2. Calls `auth.api.addMember()` server-side to add the technician
3. Returns success → mobile sets active organization

### 7.5 Next.js Session Middleware

Cookie-based middleware redirects unauthenticated users. This is an optimistic check — full session validation happens in server components/route handlers.

```typescript
// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (sessionCookie && ['/login', '/signup'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to login
  if (!sessionCookie && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup', '/onboarding/:path*'],
};
```

Org-scoped route protection (in server components, not middleware):

```typescript
// apps/web/src/app/dashboard/layout.tsx
import { auth } from '@aucta/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  if (!session.session.activeOrganizationId) redirect('/onboarding/create-org');
  return <>{children}</>;
}
```

### 7.6 Expo / React Native Integration

Mobile app uses `@better-auth/expo` with `expo-secure-store` for token storage.

```typescript
// apps/mobile/src/lib/auth.ts
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { organizationClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      scheme: 'aucta',
      storagePrefix: 'aucta',
      storage: SecureStore,
    }),
    organizationClient(),
  ],
});
```

Session tokens stored in iOS Keychain / Android Keystore via `expo-secure-store`. No cookies on mobile — the Expo plugin handles token persistence automatically.

---

## 8. Milestone Task Plan

### Milestone 1a: Architecture (Foundation Refactor)

**Goal:** Refactor V1 code to match Cal.com patterns. Fix all build issues. No new features.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 1a.1 | Extract service layer from routers | CRITICAL | L | -- |
| 1a.2 | Create BaseTenantRepository | CRITICAL | M | -- |
| 1a.3 | Wire DI via manual factory functions | CRITICAL | M | 1a.1, 1a.2 |
| 1a.4 | Remove barrel files, enforce direct imports | HIGH | S | -- |
| 1a.5 | Fix @aucta/server typecheck (add @types/bun) | HIGH | S | -- |
| 1a.6 | Add Husky + lint-staged | HIGH | S | -- |
| 1a.7 | Enhance turbo.json (globalEnv, per-task env) | HIGH | S | -- |
| 1a.8 | Add Biome rules (function length, import boundaries) | HIGH | S | 1a.4 |

**M1a exit criteria:**
- All routers refactored to service-repository pattern (thin controllers, < 50 lines)
- All packages typecheck
- No Drizzle imports outside `@aucta/db`
- No business logic in repository classes
- Factory function (`createServices()`) creates all services in tRPC context
- Biome import boundary rules enforced
- Pre-commit hooks run on staged files

### Milestone 1b: DX & Tooling (can be parallelized with M1a)

**Goal:** Establish developer experience tooling, testing infrastructure, and CI. Can proceed independently of M1a.

| # | Task | Priority | Effort | Dependencies |
|---|------|----------|--------|-------------|
| 1b.1 | Create @aucta/testing package (factories, mocks) | MEDIUM | M | -- |
| 1b.2 | Create seed data scripts (dev + CI) | MEDIUM | M | -- |
| 1b.3 | Add env validation (Zod schema at startup) | MEDIUM | S | -- |
| 1b.4 | Create @aucta/i18n package, wire into mobile | MEDIUM | M | -- |
| 1b.5 | Add Pino structured logging to server | MEDIUM | S | -- |
| 1b.6 | Add health check endpoint | MEDIUM | S | 1b.5 |
| 1b.7 | Generate initial Drizzle migration files | HIGH | S | -- |
| 1b.8 | Add PR pipeline (`.github/workflows/pr.yml`) | HIGH | M | -- |
| 1b.9 | Add security scanning (CodeQL + Semgrep) | MEDIUM | S | -- |
| 1b.10 | Add renovate.json + dependabot.yml | MEDIUM | S | -- |
| 1b.11 | Add dx command (DB push + seed + dev) | MEDIUM | S | 1b.2 |
| 1b.12 | Add auth package typecheck + basic tests | MEDIUM | S | -- |

**M1b exit criteria:**
- CI pipeline runs on PRs (lint, typecheck, test, migration check)
- Seed data works (`bun run db:seed:dev`)
- Dev setup is one command (`bun run dx`)
- Env validation fails fast on missing secrets
- Structured logging in server

### Milestone 2: Dashboard & Infrastructure

**Goal:** Build the Next.js web dashboard. Add observability. Set up deployment pipelines.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 2.1 | Scaffold apps/web (Next.js 16 + shadcn/ui + tRPC) | CRITICAL | L |
| 2.2 | Dashboard auth (Better Auth + org switching) | CRITICAL | M |
| 2.3 | Dashboard pages: sessions list, session detail, analytics | HIGH | L |
| 2.4 | Dashboard pages: team management, invite codes | HIGH | M |
| 2.5 | Dashboard pages: knowledge base CRUD + verification | HIGH | L |
| 2.6 | Add Sentry (web + mobile + server) | HIGH | M |
| 2.7 | Add PostHog analytics | MEDIUM | S |
| 2.8 | Create @aucta/email package (React Email + Resend) | MEDIUM | M |
| 2.9 | Add deploy pipeline (staging -> E2E -> production) | HIGH | M |
| 2.10 | Add EAS Build + OTA update pipeline | HIGH | M |
| 2.11 | Add Vercel + Neon preview environments | MEDIUM | M |
| 2.12 | Add OpenTelemetry instrumentation | MEDIUM | M |

### Milestone 3: AI Enhancement & Mobile Polish

**Goal:** Complete the AI tool suite. Add remaining mobile features. Offline mode.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 3.1 | Implement remaining 7 AI tools | CRITICAL | XL |
| 3.2 | Session chaining (2-min video+audio limit) | CRITICAL | L |
| 3.3 | Full i18n implementation (7 languages) | HIGH | L |
| 3.4 | Offline queue + sync manager | HIGH | M |
| 3.5 | Landscape mode optimization | MEDIUM | M |
| 3.6 | Push notifications (expo-notifications) | MEDIUM | M |
| 3.7 | GDPR deletion pipeline (Inngest) | HIGH | M |
| 3.8 | GDPR data export | HIGH | M |
| 3.9 | Audit log retention/archival job | MEDIUM | S |
| 3.10 | E2E tests (Playwright for web, Maestro for mobile) | HIGH | L |
| 3.11 | MSW WebSocket mocks for Gemini protocol testing | HIGH | M |

### Milestone 4: Scale & Launch

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 4.1 | Load testing (k6 for API, session simulation) | HIGH | M |
| 4.2 | Cost monitoring and alerts (Gemini API) | HIGH | M |
| 4.3 | RevenueCat payments integration | HIGH | L |
| 4.4 | ColPali Python sidecar for document retrieval | MEDIUM | L |
| 4.5 | Database partitioning (session_events) | MEDIUM | M |
| 4.6 | Production hardening (CSP headers, rate limit tuning) | HIGH | M |
| 4.7 | App Store / Play Store submission | CRITICAL | L |

---

## 9. CLAUDE.md Improvement Plan

### Current State

CLAUDE.md is comprehensive (~81KB from TECH-SPEC inclusion) but has several issues:

1. **Too long:** The full tech stack table, alternatives, and installation sections are duplicated from TECH-SPEC.md. CLAUDE.md should reference TECH-SPEC.md instead of duplicating.
2. **Missing conventions:** "Conventions not yet established" placeholder.
3. **Missing architecture:** "Architecture not yet mapped" placeholder.
4. **GSD workflow enforcement:** Correctly present, keep as-is.
5. **No developer profile:** Placeholder present.

### Recommended Changes

| Section | Action |
|---------|--------|
| **Technology Stack** | Replace the full tech stack dump with a concise summary table (15-20 rows max) and a pointer to TECH-SPEC.md for details. Keep version pins and critical gotchas inline. |
| **Conventions** | Populate with established patterns: service-repository pattern, DTO boundaries, ErrorWithCode usage, import style, file organization, naming conventions. |
| **Architecture** | Add a concise architecture diagram showing the data flow: Mobile -> Gemini (direct WebSocket), Mobile -> Server -> tRPC -> Service -> Repository -> Neon. Dashboard -> Server (same API). |
| **Constraints** | Good as-is. Keep the pinned versions, EU data residency, architecture rules. |
| **Gotchas** | Consolidate: keep only the 5 most critical gotchas inline. Move the rest to TECH-SPEC.md. |
| **What NOT to Use** | Good as-is. Keep the banned technology list. |

### Size Target

Reduce CLAUDE.md from ~81KB to ~15-20KB. The agent context window benefits from a focused, dense instruction set rather than exhaustive documentation.

---

## 10. AGENTS.md Improvement Plan

### Current State

AGENTS.md (229 lines) is well-structured and already closely aligned with Cal.com patterns. It includes:
- Do/Don't lists (14 items)
- PR size guidelines (<500 lines, <10 files)
- Boundaries (Always/Ask/Never)
- Project structure
- Tech stack summary
- Code examples (ErrorWithCode, Drizzle, imports)

### Gaps vs Cal.com

| Gap | Cal.com Pattern | Recommended Action |
|-----|----------------|-------------------|
| **Rule frontmatter** | Every rule has `title`, `impact`, `impactDescription`, `tags` | Add frontmatter to all 14 `agents/rules/*.md` files |
| **Knowledge base triggers** | "When working with..." section headers for contextual activation | Add "When..." triggers to `knowledge-base.md` for Gemini sessions, HVAC domain, auth flows |
| **Skills directory** | `agents/skills/` with deep reference material | Create `agents/skills/` with Gemini API patterns, Drizzle patterns, tRPC patterns |
| **Missing rules** | Cal.com has 43 rules vs Aucta's 14 | Add rules for: API rate limiting, WebSocket patterns, mobile performance, i18n, background jobs |
| **Symlink consolidation** | `.claude/rules` and `.cursor/rules` symlink to `agents/rules` | Currently text files with path references (Windows limitation). Document the convention. |
| **Repository naming convention** | Documented as a rule file | Add `data-repository-methods.md` rule with naming convention |

### Recommended New Rules

| Rule | Impact | Category |
|------|--------|----------|
| `api-rate-limiting.md` | HIGH | API |
| `architecture-websocket-patterns.md` | HIGH | Architecture |
| `performance-mobile-bundle.md` | MEDIUM | Performance |
| `data-repository-methods.md` | HIGH | Data Layer |
| `quality-barrel-file-ban.md` | CRITICAL | Quality |
| `quality-function-length.md` | MEDIUM | Quality |
| `security-gemini-tokens.md` | HIGH | Security |
| `i18n-patterns.md` | MEDIUM | Patterns |

---

## 11. Definition of Done

### Per-Task DoD

Every task is complete when ALL of the following are true:

- [ ] Code compiles (`bun run typecheck` passes for affected packages)
- [ ] All existing tests pass (`bun run test`)
- [ ] New code has tests (minimum 80% coverage for new files)
- [ ] Biome check passes (`bun run check`)
- [ ] No hardcoded secrets or credentials
- [ ] ErrorWithCode used in services/repos (not TRPCError)
- [ ] DTOs validated at boundaries (Zod parse on input/output)
- [ ] Repository pattern followed (no Drizzle imports outside @aucta/db)
- [ ] Functions < 100 lines, files < 800 lines
- [ ] Immutable patterns used (no mutation of arguments)
- [ ] Error handling is explicit (no swallowed errors)
- [ ] PR < 500 lines of code, < 10 files

### Per-Milestone DoD

| Milestone | Additional Exit Criteria |
|-----------|------------------------|
| **M1a** | All routers refactored to service-repository. No Drizzle imports outside `@aucta/db`. No business logic in repository classes. All routers under 50 lines (thin controllers). Factory function creates all services in tRPC context. All packages typecheck. |
| **M1b** | CI pipeline runs on PRs. Seed data works. Dev setup is one command (`bun run dx`). Env validation fails fast. Structured logging active. |
| **M2** | Dashboard renders and is navigable. Sentry reports errors. Preview environments work. |
| **M3** | All 10 AI tools functional. i18n covers all 7 languages. Offline queue syncs correctly. E2E tests pass. |
| **M4** | Load test passes at 100 concurrent sessions. App Store submission accepted. GDPR deletion pipeline tested. |

### Security Gate (before any deploy to staging/production)

- [ ] No secrets in codebase (git-secrets scan)
- [ ] Dependencies audited (`bun audit`)
- [ ] CSP headers configured
- [ ] Rate limiting active on all endpoints
- [ ] Auth/authz verified on all protected routes
- [ ] CORS properly scoped
- [ ] EU AI Act disclosures in place (non-dismissible AI indicator)
- [ ] Privacy policy updated for Gemini data processing

---

## 12. GDPR & Security

### 12.1 Gemini API GDPR Compliance

**Key finding:** The Gemini API (ai.google.dev) does NOT support EU region restriction. Data may transit non-EU facilities for safety monitoring.

| Requirement | Status | Action |
|-------------|--------|--------|
| Use paid Gemini API only (EU users) | Required | Google DPA applies. No training on prompts/responses. |
| EU region pinning | Not available | Accept for MVP. Plan Vertex AI migration path for strict data residency. |
| Privacy policy disclosure | Required | Disclose: real-time audio/video sent to Google, Google as data processor, data may transit outside EU. |
| EU AI Act compliance | Required | Non-dismissible AI indicator, "AI-generated content" labels, camera/audio disclosure. |
| User consent | Required | Explicit consent before first session (GDPR Art. 6(1)(a)). Right to delete session data. |

### 12.2 Multi-Tenancy & Row-Level Security

**Pattern:** Shared database with `organization_id` foreign key on all tenant-scoped tables.

**Primary enforcement:** `BaseTenantRepository` base class with mandatory `organizationId` in every query.
**Defense-in-depth:** Postgres RLS policies via Drizzle `pgPolicy()`. Set `app.organization_id` per-request in transaction.

Tenant-scoped tables: sessions, session_events, knowledge_articles, knowledge_embeddings, feedback, invitations, members, audit_logs, org_settings.

Global tables: error_codes, equipment_models, subscription_plans, system_config.

### 12.3 Audit Logging

Two layers:
1. **Better Auth dash() plugin** -- automatic auth event logging (sign-in, sign-out, password changes, org/member events).
2. **Custom audit_logs table** -- business events via tRPC `createAuditMiddleware()`. Logs all mutations with actor, resource, changes, IP, request ID.

### 12.4 Data Retention & GDPR Deletion

Retention policy:
- Session metadata: 90 days
- Session summaries: 1 year
- Raw audio/video: Never stored (ephemeral, streamed directly to Gemini)
- Audit logs: 2 years (anonymize actor fields after 1 year)
- Knowledge articles: Until org deletion

Deletion pipeline (Inngest step function):
1. Verify requester is org owner
2. Soft-delete org (30-day grace period for undo)
3. After grace period: cascade delete sessions, knowledge articles, Qdrant collection, members, anonymize audit logs, clear Redis cache, hard-delete org
4. Send confirmation email

### 12.5 Rate Limiting

| Endpoint | Algorithm | Limit | Window | Identifier |
|----------|-----------|-------|--------|------------|
| Auth: Sign-in | Sliding window | 5 | 15 min | IP |
| Auth: Sign-up | Fixed window | 3 | 1 hour | IP |
| tRPC: Queries | Sliding window | 100 | 1 min | User ID |
| tRPC: Mutations | Sliding window | 30 | 1 min | User ID |
| WebSocket: Session create | Fixed window | 5 | 1 hour | User ID |
| Ephemeral token: Request | Token bucket | 10 tokens, refill 2/min | -- | Org ID |

Implementation: `@upstash/ratelimit` with Upstash Redis (EU).

### 12.6 Secret Management

| Environment | Method |
|-------------|--------|
| Local dev | `.env.local` (gitignored) |
| CI | GitHub Actions Secrets |
| Preview/Staging/Prod | Vercel Environment Variables |
| Mobile builds | EAS Secrets (`eas secret:create`) |

Startup validation: Zod schema parse of `process.env` in `packages/shared/src/env.ts`. Fail-fast if required secrets are missing.

### 12.7 CSP Headers

For the Next.js dashboard (apps/web), use `proxy.ts` with nonces:
- `connect-src`: include `wss://generativelanguage.googleapis.com` for Gemini WebSocket
- `frame-ancestors: 'none'`
- `upgrade-insecure-requests`
- Additional headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, Referrer-Policy

---

## 13. Observability

### 13.1 Stack

| Tool | Purpose | Scope |
|------|---------|-------|
| **Sentry** | Error tracking + performance | Web (@sentry/nextjs), Mobile (@sentry/react-native), Server |
| **Axiom** | Log aggregation + traces (OTLP) | Server-side. Free tier: 500GB/mo ingest, 30-day retention. |
| **PostHog** | Product analytics + feature flags | Web + Mobile. Self-hostable. |
| **Pino** | Structured logging | Server-side. JSON logs with request ID propagation. |
| **@vercel/otel** | OpenTelemetry for Next.js | Dashboard. Auto-instrumented on Vercel. |

### 13.2 Structured Logging

Use Pino with:
- Service-scoped loggers (`createLogger('aucta-api')`)
- Per-request child loggers with correlation ID
- PII redaction: `authorization`, `cookie`, `password`, `token`, `apiKey`, `email`
- JSON format in production, pretty-print in development

### 13.3 Custom Spans

Instrument the tRPC -> Service -> Repository chain with OpenTelemetry spans:
- `withSpan('session.create', attributes, fn)` in services
- `withSpan('db.session.insert', attributes, fn)` in repositories

### 13.4 Gemini Session Monitoring

Track per-session:
- Connection latency, reconnection count, disconnection count
- Audio input/output chunks, dropped chunks, latency P50/P95
- Tool call count and latency
- Token usage (input/output), estimated cost
- Error count, safety filter triggers

Flush metrics to database at session end for analytics dashboard.

### 13.5 Health Check

`/api/health` endpoint checking:
- Postgres (Neon) -- `SELECT 1`
- Redis (Upstash) -- `PING`
- Gemini API -- discovery endpoint reachability
- Qdrant -- `/healthz`

Returns `{ status: 'healthy' | 'degraded' | 'unhealthy', checks: {...}, timestamp, version }`.

### 13.6 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API error rate | >1% / 5 min | >5% / 5 min |
| P95 API latency | >2s / 5 min | >5s / 5 min |
| Gemini disconnect rate | >10% of sessions | >25% of sessions |
| Gemini session cost | Single session > $1 | Single session > $3 |
| Health check failure | 1 component down | 2+ components down |
| Auth failure rate | >5/min from 1 IP | >20/min from 1 IP |

---

## 14. Database Strategy

### 14.1 Migration Workflow

**Approach:** Codebase-first with generated SQL migrations (Drizzle Kit).

1. Schema defined in TypeScript (`packages/db/src/schema/*.ts`) -- source of truth
2. `bunx drizzle-kit generate` produces SQL migration files
3. `bunx drizzle-kit migrate` applies them to the database
4. Migration files committed to git and verified in CI

**Zero-downtime migrations:** Use expand-and-contract pattern for breaking schema changes. Add new column (nullable) -> backfill -> deploy new code -> drop old column.

**CI verification:**
- `drizzle-kit generate` in dry-run mode
- Check for uncommitted migration files (fail if schema changed but migrations not generated)
- Apply migrations to Neon preview branch
- Schema diff comment on PR (via `neondatabase/schema-diff-action`)

### 14.2 Connection Strategy

| Context | Driver | Connection | Reason |
|---------|--------|------------|--------|
| tRPC routes (serverless) | `neon-http` | Pooler endpoint | HTTP-based, stateless, no connection overhead |
| Drizzle Kit migrations | `neon-http` or `postgres-js` | Direct endpoint | DDL may not work through pgBouncer |
| Inngest jobs | `neon-http` | Pooler endpoint | Serverless functions |
| Development | `postgres-js` | Direct endpoint | Full TCP for Drizzle Studio |

### 14.3 Seed Data

Three tiers:
- `packages/db/src/seed/dev.ts` -- Rich fake data with faker (3 orgs, 15 users, 20 sessions, 50 articles)
- `packages/db/src/seed/ci.ts` -- Minimal deterministic fixtures (1 org, 2 users, 1 session, known IDs)
- `packages/db/src/seed/staging.ts` -- Anonymized production-like data

Scripts: `db:seed:dev`, `db:seed:ci`, `db:reset` (push + seed).

### 14.4 Database Branching

Neon branch-per-PR for preview deployments:
- On PR open: Create Neon branch (instant, copy-on-write), run migrations, inject DATABASE_URL into Vercel preview
- On PR close: Delete Neon branch
- Alternative: Use Neon Vercel integration for automatic branch management

### 14.5 Backup & Recovery

- **Neon PITR:** Continuous WAL archiving. Free plan: 24h retention. Scale plan: 30 days.
- **Weekly pg_dump:** To encrypted S3 EU Frankfurt bucket via GitHub Actions cron.
- **Pre-migration snapshots:** Named Neon branch before destructive migrations.
- **RPO:** Effectively zero within retention window. 1 week beyond.
- **RTO:** ~2 minutes (create branch + switch connection string).

### 14.6 Session Events Partitioning (at scale)

When `session_events` table grows large (>10M rows), partition by month:
- Use Postgres range partitioning on `created_at`
- Drizzle ORM doesn't natively support partitioning -- use raw SQL migrations
- Monthly partition creation via Inngest cron job

---

## 15. Offline Resilience

### 15.1 Connectivity Detection

Use `@react-native-community/netinfo` (already in mobile dependencies):
- Event listener for real-time connection state changes
- Zustand store: `useConnectivity` with `isConnected`, `isInternetReachable`, `connectionType`, `effectiveType`
- Configure reachability check against Aucta's own `/api/health` endpoint
- `isOnline()` utility for pre-operation checks

### 15.2 Gemini WebSocket Resilience

**Session Resumption:**
- Server sends `SessionResumptionUpdate` with `newHandle` and `resumable` flag
- Store latest handle in MMKV for crash recovery
- On disconnect: exponential backoff (1s base, 30s max, 5 max attempts) with jitter
- If resumable + handle available: resume existing session
- If not resumable: start fresh session, emit `contextLost` event

**Session Chaining (CRITICAL — video mode only, see Section 17.1):**
- Video+audio sessions limited to **2 minutes** by Gemini API
- Audio-only sessions have a **15-minute** limit (no chaining needed)
- Must implement automatic session chaining before timeout when video is active
- Server sends `GoAway` notification 60 seconds before session end
- On GoAway: request new ephemeral token, open new WebSocket with session resumption handle, swap connections

**Mid-sentence disconnect:**
- `interrupted` flag on server content indicates model was mid-response
- Stop playing current audio buffer
- On reconnection: model resumes from last resumable point or client sends conversation summary

### 15.3 Offline Queue

MMKV-backed queue with idempotency keys:
- Item types: `session_meta`, `feedback`, `log`, `knowledge_update`
- Max 5 retries with exponential backoff
- Sync triggered on connectivity restoration (Zustand subscription)
- Server-side idempotency via `idempotencyKey` in mutation payloads
- Prune items that exceed max retries (log to Sentry)

### 15.4 What Works Offline

| Feature | Offline | Implementation |
|---------|---------|----------------|
| Session history (recent) | Yes | MMKV cache after fetch |
| Favorited knowledge articles | Yes | MMKV cache |
| App settings (language, theme) | Yes | MMKV, sync when online |
| Equipment error codes | Yes | Pre-cached global DB in MMKV |
| Submit feedback (past sessions) | Queued | Offline queue |

### 15.5 What Requires Connectivity

| Feature | Reason |
|---------|--------|
| Live AI session | WebSocket to Gemini |
| Knowledge base search | Qdrant vector search |
| Dashboard analytics | Real-time Postgres |
| Team management | Server auth verification |
| Sign in / sign up | Auth flow |

### 15.6 Background Handling

- **iOS:** `UIBackgroundModes: ["audio"]` for continued recording. WebSocket drops after ~30s in background. Reconnect on foreground.
- **Android:** Foreground service via `@notifee/react-native` for sustained audio. WebSocket stays alive in foreground service.
- **expo-keep-awake:** Prevent screen dimming during active sessions.

---

## 16. CI/CD Pipeline

### 16.1 Current State

Single `.github/workflows/ci.yml`:
- Checkout -> Setup Bun 1.3 -> Install (frozen lockfile) -> Biome check -> Typecheck -> Test
- Concurrency: cancel-in-progress per branch
- Timeout: 15 minutes

### 16.2 Target PR Pipeline

```
PR opened/updated
  |
  +-- quality (parallel):
  |     |-- Biome lint + format check
  |     |-- TypeScript typecheck (--affected)
  |
  +-- test (after quality):
  |     |-- Unit + integration tests (--affected)
  |     |-- Upload coverage to Codecov
  |
  +-- build (after quality, parallel with test):
  |     |-- Build all affected packages
  |
  +-- migration-check (after quality, parallel with test):
        |-- drizzle-kit generate (dry run)
        |-- Check for uncommitted migrations
```

Key additions vs current:
- `--affected` flag for Turborepo (only check changed packages)
- Migration dry-run check
- Codecov integration
- Separate jobs for parallel execution
- `fetch-depth: 0` for `--affected` support

### 16.3 Target Deploy Pipeline (Merge to Main)

```
Push to main
  |
  +-- build-and-test:
  |     |-- Full build + test suite
  |
  +-- migrate (after build, staging environment):
  |     |-- Run Drizzle migrations on staging DB
  |
  +-- Vercel auto-deploy to staging
  |
  +-- e2e (after migrate):
  |     |-- Playwright E2E tests against staging URL
  |
  +-- promote-to-production (after e2e, production environment):
        |-- Run migrations on production DB
        |-- Vercel promote deployment
```

### 16.4 Mobile Pipeline

Trigger: Push to main with changes in `apps/mobile/`, `packages/shared/`, `packages/ai/`.

- EAS Build: triggered via `eas build --non-interactive`
- OTA Update: `eas update --branch preview` for JS-only changes
- Channels: development (never auto-update), preview (on app open), production (background download)

### 16.5 Remote Caching

Turborepo remote cache via Vercel:
- `TURBO_TOKEN` from vercel.com/account/tokens
- `TURBO_TEAM` set to Vercel team slug
- Both set as GitHub Actions secrets/variables

### 16.6 Preview Environments

Vercel preview deploys + Neon database branches:
- Automatic via Neon Vercel integration
- `DATABASE_URL` auto-injected into preview env
- Branch deleted when PR is closed/merged

### 16.7 Dependency Management

**Renovate** for version updates:
- Weekly schedule (Monday before 7am Vienna time)
- Pin strategy for reproducibility
- Group: Expo + React Native (monthly, manual review)
- Pin: Drizzle ORM to `^0.45.0` (block v1 beta)
- Pin: NativeWind to `^4.0.0` (block v5 preview)
- Auto-merge: dev dependency patches/minors

**Dependabot** for security:
- Weekly schedule, Monday 6am UTC
- Separate from Renovate (Dependabot handles security alerts, Renovate handles version updates)

### 16.8 Security Scanning

- **GitHub CodeQL:** SAST for JavaScript/TypeScript (free for public repos, included with GitHub Advanced Security)
- **Semgrep:** SAST with custom rules (free OSS)
- **bun audit:** Dependency vulnerability check (best-effort, combined with Dependabot)
- Schedule: On push/PR to main + weekly Monday cron

---

## 17. Scalability

### 17.1 Session Mode Architecture

**Decision:** Sessions start audio-only by default. Video is activated on explicit technician request.

**Rationale:**
- **Cost:** Audio-only is ~6x cheaper than audio+video ($0.03 vs $0.16-$0.61 per 10-min session)
- **Session limits:** Audio-only sessions get a **15-minute** Gemini limit vs **2 minutes** for video+audio, eliminating the need for session chaining in most cases
- **Simplicity:** No session chaining logic needed for the majority of field calls (many HVAC issues are diagnosable by audio description alone)

**Implications:**

| Concern | Audio-Only Default | Video Activated |
|---------|-------------------|-----------------|
| **Mobile UI** | Camera preview OFF, mic active | Camera preview ON via button or voice command ("show me") |
| **Gemini setup** | `responseModalities: ["AUDIO"]`, no video input | Add video input stream, keep `responseModalities: ["AUDIO"]` |
| **Session limit** | 15 minutes (no chaining needed) | 2 minutes (session chaining required) |
| **Ephemeral token** | 1 token per session | 1 token per 2-min chain segment |
| **Activation triggers** | — | Tap camera button, voice command ("look at this", "show me"), technician gesture |

**Session chaining is only needed when video is active.** This dramatically simplifies M1-M2 implementation — audio-only sessions work end-to-end without chaining logic. Session chaining (M3, task 3.2) becomes a video-specific concern.

### 17.2 Gemini API Cost Model

**Per-session cost (10-minute session):**

| Model | Mode | Per-Session Cost | Notes |
|-------|------|-----------------|-------|
| Gemini 2.5 Flash Live | Audio + Video (1 FPS) | ~$0.61 | 5 chained 2-min sessions |
| Gemini 2.5 Flash Live | **Audio-only** | **~$0.10** | Single 10-min session, no chaining |
| Gemini 3.1 Flash Live Preview | Audio + Video (1 FPS) | ~$0.16 | 5 chained 2-min sessions |
| Gemini 3.1 Flash Live Preview | **Audio-only** | **~$0.03** | Single 10-min session, no chaining |

**Video+audio sessions are limited to 2 minutes.** A 10-minute field session requires 5 chained sessions, each needing a new ephemeral token.

**Monthly projections (10-min avg session, Gemini 2.5 Flash Live):**

| Daily Sessions | Audio-Only | Mixed (50% video) | Full Video |
|----------------|-----------|-------------------|------------|
| 100 | ~$300/mo | ~$1,065/mo | ~$1,830/mo |
| 1,000 | ~$3,000/mo | ~$10,650/mo | ~$18,300/mo |
| 10,000 | ~$30,000/mo | ~$106,500/mo | ~$183,000/mo |

With audio-only default and Gemini 3.1 Flash Live, costs drop further to ~$90/mo at 100 daily sessions.

### 17.3 Cost Optimization

1. **Use newest model:** Gemini 3.1 Flash Live Preview is ~4x cheaper. Monitor for GA.
2. **Audio-only default:** Sessions start audio-only (15-min limit, no chaining). See Section 17.1. This is the single biggest cost lever.
3. **Adaptive frame rate:** When video is active, default 0.5 FPS, increase to 1 FPS on voice command ("look at this").
4. **Context window compression:** Use `ContextWindowCompressionConfig` with `SlidingWindow` to prevent token bloat.
5. **Session duration caps:** 10-15 minute max. Most HVAC diagnostics resolve within this window.

### 17.4 Backend Scaling

The ephemeral token model means mobile clients connect directly to Gemini. The backend handles:
- Token exchange: ~0.06 RPS at 1,000 daily sessions
- Session logging: ~0.02 RPS at 1,000 daily sessions
- Total: ~0.08 RPS -- trivially small for Vercel serverless

Bottleneck will be Gemini API rate limits, not Aucta infrastructure.

### 17.5 Database Scaling

| Scale | Strategy |
|-------|----------|
| < 1,000 daily sessions | Single Neon endpoint, HTTP driver |
| 1,000 - 10,000 | Neon autoscaling (up to 8 CU) + read replicas for analytics |
| > 10,000 | Read replicas + session_events partitioning + consider OLAP for analytics |

Connection limits are a non-issue with `neon-http` driver (stateless HTTP queries, no connection pool).

### 17.6 Mobile Performance

**Bundle size targets:**
| Target | Budget |
|--------|--------|
| Initial JS bundle | < 2 MB compressed (Hermes bytecode) |
| OTA update | < 5 MB (delta only) |
| iOS app binary | < 50 MB |
| Android AAB | < 40 MB |

**Optimizations:**
- `zod/mini` for mobile (tree-shakable)
- Lazy imports for non-initial screens
- Translation file splitting (load only active language)
- Metro inlineRequires for reduced startup time
- Aggressive audio buffer cleanup during sessions (send immediately, don't accumulate)
- Limit in-memory session events to 100 (older events flushed to MMKV)

### 17.7 Load Testing Strategy

Use k6 to simulate:
1. Concurrent ephemeral token requests (ramp to 100 VUs)
2. Concurrent session metadata writes
3. Concurrent knowledge base searches (Qdrant)

Target: P95 < 500ms for token exchange, P95 < 1s for knowledge search, zero 5xx errors at 100 concurrent users.

---

## Appendix: Open Questions

| # | Question | Impact | When to Decide |
|---|----------|--------|---------------|
| 1 | Gemini 3.1 Flash Live Preview -- production-ready? | Cost (4x difference) | M1 |
| 2 | Video+audio 2-min limit -- can context window compression extend it? | Session UX | M3 (session chaining) |
| 3 | ColPali sidecar vs Gemini document understanding for KB | Architecture complexity | M3 (AI tools) |
| 4 | Vertex AI migration for strict EU data residency | Compliance | If customer requires it |
| 5 | expo-audio vs expo-av for PCM 16kHz recording | Mobile audio capture | M1 (test on dev build) |
| 6 | NativeWind v5 timeline to stable | TW v4 unification | Monitor quarterly |
