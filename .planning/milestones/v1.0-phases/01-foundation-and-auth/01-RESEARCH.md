# Phase 1: Foundation and Auth - Research

**Researched:** 2026-04-03
**Domain:** Monorepo setup, authentication, mobile app shell, CI/CD
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield monorepo bootstrapping phase that establishes the Turborepo workspace with Bun, creates the Expo SDK 55 mobile app shell, sets up Better Auth with the organization plugin for RBAC and invite codes, configures Drizzle ORM with Neon Postgres (EU Frankfurt), wires Upstash Redis for rate limiting, and builds the CI pipeline. There is zero existing code -- every file is new.

The critical integration points are: (1) Better Auth with Drizzle adapter using Neon Postgres, (2) the `@better-auth/expo` client plugin with `expo-secure-store` for session persistence, (3) tRPC 11 middleware for org-scoped access control and rate limiting via `@upstash/ratelimit`, and (4) NativeWind v4 (NOT v5) for mobile styling. The most complex piece is the custom invite code system -- Better Auth's built-in invitation system uses email-based invites, but the user decisions require 6-character alphanumeric codes that are speakable and case-insensitive. This requires a custom `invite_codes` table alongside Better Auth's built-in org tables.

**Primary recommendation:** Bootstrap the monorepo first, then packages/shared and packages/db (schema + repositories), then packages/auth and packages/api (tRPC + middleware), then apps/mobile (shell + auth screens), and finally CI/CD. This order ensures each layer has its dependencies ready.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Split path after sign-up -- user chooses "Create organization" or "Join with invite code". Both paths lead to the main app with org context.
- **D-02:** Sign-up collects minimal data: name, email, password. No phone or language preference at sign-up.
- **D-03:** Org creation collects: company name, industry type, and location.
- **D-04:** 6-character alphanumeric codes, case-insensitive. Easy to read aloud on job sites and type with gloves.
- **D-05:** Join flow shows a preview screen with org name and assigned role before the user confirms. No auto-join.
- **D-06:** Default invite code expiry is 7 days. Owner can set custom expiry when creating a code.
- **D-07:** Invite sharing supports three methods: manual code entry, QR code scanning (device camera), and shareable deep links (for WhatsApp, SMS, messaging apps).
- **D-08:** Bottom tab bar navigation. Tabs to be determined during planning, but minimum Home + Settings/More.
- **D-09:** Home screen is session-first: one dominant "Start Session" CTA button with minimal chrome. Org name displayed at top. Instructional text below the button. (Session button leads to a placeholder until Phase 3.)
- **D-10:** Phase 1 screens: Login, Sign-up, Org choice (create/join), Org creation form, Join org (code entry + QR scan), Home, Settings/Profile. No session history or analytics placeholders.
- **D-11:** Visual theme: support both light and dark themes. Light (white) is the default. Theme toggle available in settings. Both themes must meet WCAG AAA contrast ratios.
- **D-12:** Single org membership per user. A user belongs to exactly one organization.
- **D-13:** Single owner per org with ownership transfer capability.
- **D-14:** Clear three-tier hierarchy: Owner (full control), Manager (invite technicians, view team), Technician (use app, view own profile).
- **D-15:** Org-scoped tRPC middleware enforces org_id on every query -- no cross-org data access possible at the API layer.

### Claude's Discretion
- Tab bar icon and label choices (Home, Settings, etc.)
- Specific form validation rules and error messages
- Database schema column details beyond what decisions above require
- CI pipeline configuration specifics (GitHub Actions workflow structure)
- Better Auth plugin configuration details
- Loading states, transitions, and micro-interactions

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Turborepo monorepo with Bun, TypeScript 6 strict, Biome | Turborepo 2.9.3 + Bun 1.3.x setup verified; Biome 2.4.10 available; TS 6.0.2 confirmed |
| INFRA-02 | Shared packages structure with correct import boundaries | Directory structure from TECH-SPEC.md; import direction rules from architecture rules |
| INFRA-03 | EAS development builds for physical device testing | Expo SDK 55 confirmed; expo-camera and expo-secure-store require dev builds |
| INFRA-04 | CI pipeline: Biome lint, TS typecheck, Vitest tests, Turborepo build | Vitest 4.1.2 workspace config documented; Biome CI command available |
| INFRA-05 | Neon Postgres (EU Frankfurt) with Drizzle ORM | Drizzle 0.45.2 + @neondatabase/serverless 1.0.2 setup documented |
| INFRA-06 | Upstash Redis for rate limiting and caching | @upstash/ratelimit 2.0.8 with fixed/sliding/token-bucket algorithms |
| AUTH-01 | Email/password account creation via Better Auth | Better Auth 1.5.6 emailAndPassword plugin documented |
| AUTH-02 | Session persistence across app restarts | @better-auth/expo with expo-secure-store; cookie caching documented |
| AUTH-03 | Organization creation with owner role | Better Auth organization plugin; createOrganization API documented |
| AUTH-04 | Invite codes with role assignment and expiry | Custom invite_codes table needed -- Better Auth invitations are email-based, not code-based |
| AUTH-05 | Join org by invite code or QR scan | Custom tRPC procedures for code lookup + join; expo-camera for QR |
| AUTH-06 | RBAC: owner, manager, technician | Better Auth createAccessControl + custom roles; permission checks documented |
| AUTH-07 | Org-scoped tRPC middleware | tRPC middleware pattern with context extension; activeOrganizationId from session |
| AUTH-08 | Rate limiting on auth and API routes | @upstash/ratelimit strategies mapped to endpoint types |
</phase_requirements>

## Standard Stack

### Core (Phase 1 specific)

| Library | Version (Verified) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| Turborepo | 2.9.3 | Build orchestrator | Vercel-native, Bun workspace auto-detection |
| Bun | 1.3.8 (installed) | Package manager + runtime | 25-30x faster installs, transparent node_modules |
| TypeScript | 6.0.2 | Language | Strict mode, latest stable before Go rewrite |
| Expo SDK | 55.0.11 | Mobile framework | New Architecture default, managed workflow |
| Expo Router | 55.0.10 | Navigation | File-based routing, typed routes, Stack.Protected guards |
| NativeWind | 4.2.3 | Mobile styling | Latest stable v4 -- v5 is preview only |
| Tailwind CSS | 4.2.2 | Design tokens | CSS-first config, shared tokens web + mobile |
| Better Auth | 1.5.6 | Auth framework | Self-hosted, org plugin, Expo plugin, Drizzle adapter |
| @better-auth/expo | 1.5.6 | Expo integration | SecureStore session caching, deep link handling |
| tRPC | 11.16.0 | API layer | End-to-end type safety, middleware for org-scoping |
| Zod | 4.3.6 | Validation | Schema validation at all boundaries |
| Drizzle ORM | 0.45.2 | ORM | 7.4KB, serverless-optimized, pinned to avoid v1 beta |
| drizzle-kit | 0.31.10 | Migration tool | Schema generation and migration management |
| @neondatabase/serverless | 1.0.2 | Postgres driver | HTTP-based serverless driver for Neon |
| @upstash/redis | 1.37.0 | Redis client | HTTP-based, serverless-compatible |
| @upstash/ratelimit | 2.0.8 | Rate limiting | Fixed window, sliding window, token bucket algorithms |
| Zustand | 5.0.12 | Client state | getState/setState outside React for callbacks |
| @tanstack/react-query | 5.96.2 | Server state | Required by tRPC 11, isPending replaces isLoading |
| react-native-mmkv | 4.3.0 | Local storage | 30x faster than AsyncStorage, synchronous |
| expo-secure-store | 55.0.11 | Credential storage | iOS Keychain / Android Keystore for auth tokens |
| expo-camera | 55.0.13 | Camera access | QR code scanning for invite codes |
| Biome | 2.4.10 | Lint + format | Single tool, 35x faster than ESLint + Prettier |
| Vitest | 4.1.2 | Testing | Workspace support, Vite-native |
| react-i18next | 17.0.2 | i18n | Cross-platform, TypeScript key autocomplete |
| expo-localization | 55.0.11 | Device locale | Detect device language for i18n |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-reusables/cli | 0.7.1 | Mobile component scaffolding | shadcn-like CLI for adding React Native components |
| superjson | latest | Data serialization | If tRPC needs Date/BigInt transport (optional) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| NativeWind v4 | NativeWind v5 preview | v5 has Tailwind v4 support but is unstable; v4.2.3 is production-ready |
| Custom invite codes | Better Auth invitations | Better Auth invitations are email-based; need speakable 6-char codes for job sites |
| expo-camera for QR | expo-barcode-scanner | expo-barcode-scanner deprecated in SDK 49+; expo-camera handles QR natively |

**Installation (root):**
```bash
bun add -d turbo typescript@6 @biomejs/biome vitest
```

**Installation (packages/db):**
```bash
bun add drizzle-orm @neondatabase/serverless zod
bun add -d drizzle-kit
```

**Installation (packages/auth):**
```bash
bun add better-auth
```

**Installation (packages/api):**
```bash
bun add @trpc/server zod @upstash/redis @upstash/ratelimit
```

**Installation (packages/shared):**
```bash
bun add zod
```

**Installation (apps/mobile):**
```bash
bun add expo-router expo-camera expo-secure-store expo-localization react-i18next \
  @react-native-community/netinfo react-native-mmkv zustand @trpc/client \
  @tanstack/react-query zod @better-auth/expo nativewind@4.2.3 tailwindcss@4 \
  react-native-reanimated
```

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)
```
aucta/
├── apps/
│   └── mobile/                              # Expo SDK 55
│       ├── app/                             # Expo Router file-based routes
│       │   ├── _layout.tsx                  # Root layout: SessionProvider + TRPCProvider
│       │   ├── (auth)/                      # Auth route group (unprotected)
│       │   │   ├── _layout.tsx              # Stack layout for auth screens
│       │   │   ├── login.tsx
│       │   │   ├── sign-up.tsx
│       │   │   ├── org-choice.tsx           # "Create org" vs "Join org"
│       │   │   ├── create-org.tsx
│       │   │   └── join-org.tsx             # Code entry + QR scan
│       │   └── (app)/                       # Authenticated route group (protected)
│       │       ├── _layout.tsx              # Bottom tab layout
│       │       ├── (tabs)/
│       │       │   ├── index.tsx            # Home: session-first CTA
│       │       │   └── settings.tsx         # Profile + settings
│       │       └── join-preview.tsx         # Org preview before confirming join
│       ├── lib/
│       │   ├── auth-client.ts               # Better Auth + expo plugin client
│       │   ├── api.ts                       # tRPC client setup
│       │   └── storage.ts                   # SecureStore helper
│       ├── providers/
│       │   ├── session-provider.tsx          # Auth context wrapping Better Auth
│       │   └── trpc-provider.tsx            # TRPCProvider + QueryClient
│       ├── components/
│       │   ├── auth/                        # Auth form components
│       │   └── common/                      # Shared UI components
│       ├── constants/
│       │   └── theme.ts                     # Light/dark theme tokens
│       └── package.json
│
├── packages/
│   ├── shared/                              # Zero-dependency types + schemas
│   │   └── src/
│   │       ├── schemas/                     # Zod schemas (single source of truth)
│   │       │   ├── user.schema.ts
│   │       │   ├── org.schema.ts
│   │       │   ├── invite.schema.ts
│   │       │   └── auth.schema.ts
│   │       ├── constants/
│   │       │   ├── roles.ts                 # owner, manager, technician
│   │       │   └── limits.ts               # rate limits, invite defaults
│   │       └── utils/
│   │           ├── errors.ts               # ErrorWithCode class
│   │           └── id.ts                   # Prefixed ID generation (org_, usr_, inv_)
│   │
│   ├── db/                                  # Drizzle ORM
│   │   └── src/
│   │       ├── client.ts                    # Neon HTTP driver
│   │       ├── schema/
│   │       │   ├── invite-codes.ts          # Custom invite_codes table
│   │       │   ├── org-settings.ts
│   │       │   ├── audit-log.ts
│   │       │   └── index.ts                # Re-exports all schemas
│   │       ├── repositories/
│   │       │   ├── invite.repository.ts
│   │       │   ├── org.repository.ts
│   │       │   └── audit.repository.ts
│   │       └── drizzle.config.ts
│   │
│   ├── auth/                                # Better Auth config
│   │   └── src/
│   │       ├── server.ts                    # betterAuth() with org plugin + Drizzle adapter
│   │       ├── client.ts                    # createAuthClient() (shared base)
│   │       ├── permissions.ts               # createAccessControl() + custom roles
│   │       └── index.ts
│   │
│   ├── api/                                 # tRPC router definitions
│   │   └── src/
│   │       ├── root.ts                      # Merged appRouter
│   │       ├── trpc.ts                      # initTRPC, context, middleware
│   │       ├── middleware/
│   │       │   ├── auth.ts                  # isAuthed middleware
│   │       │   ├── org-scope.ts             # org_id enforcement
│   │       │   ├── rate-limit.ts            # @upstash/ratelimit middleware
│   │       │   └── error-converter.ts       # ErrorWithCode -> TRPCError
│   │       └── routers/
│   │           ├── org.router.ts            # Org CRUD + invite management
│   │           └── invite.router.ts         # Invite code operations
│   │
│   └── config/                              # Shared configs
│       ├── tsconfig.base.json
│       └── biome.json                       # Root biome config
│
├── turbo.json
├── package.json                             # Bun workspaces
└── biome.json                               # Root-level biome config
```

### Pattern 1: Expo Router Auth with Stack.Protected

**What:** Use Expo Router's `Stack.Protected` guard to conditionally show auth or app routes based on session state.

**When to use:** Root layout to separate authenticated and unauthenticated route groups.

**Example:**
```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/providers/session-provider';
import { TRPCProvider } from '@/providers/trpc-provider';

export default function RootLayout() {
  return (
    <SessionProvider>
      <TRPCProvider>
        <RootNavigator />
      </TRPCProvider>
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
```

### Pattern 2: Better Auth Client for Expo

**What:** Configure Better Auth client with `@better-auth/expo` for secure session storage on mobile.

**When to use:** Mobile app auth client initialization.

**Example:**
```typescript
// apps/mobile/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { organizationClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      scheme: "aucta",
      storagePrefix: "aucta",
      storage: SecureStore,
    }),
    organizationClient(),
  ],
});
```

### Pattern 3: tRPC Org-Scoped Middleware

**What:** Middleware that extracts the active organization from the session and injects `orgId` into context for downstream procedures.

**When to use:** Every org-scoped tRPC procedure.

**Example:**
```typescript
// packages/api/src/middleware/org-scope.ts
import { TRPCError } from "@trpc/server";

export const withOrgScope = t.middleware(async (opts) => {
  const { ctx } = opts;

  if (!ctx.session?.activeOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active organization selected",
    });
  }

  return opts.next({
    ctx: {
      orgId: ctx.session.activeOrganizationId,
      userId: ctx.session.userId,
      userRole: ctx.session.member?.role,
    },
  });
});

export const orgProcedure = protectedProcedure.use(withOrgScope);
```

### Pattern 4: Rate Limiting Middleware

**What:** tRPC middleware that applies different rate limits per endpoint category.

**When to use:** Auth endpoints (10/min), token creation (5/min), general API (100/min).

**Example:**
```typescript
// packages/api/src/middleware/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "60 s"),
  prefix: "rl:auth",
});

const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.tokenBucket(100, "60 s", 100),
  prefix: "rl:general",
});

export function createRateLimitMiddleware(limiter: Ratelimit) {
  return t.middleware(async (opts) => {
    const identifier = opts.ctx.session?.userId ?? opts.ctx.ip ?? "anonymous";
    const { success } = await limiter.limit(identifier);

    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded",
      });
    }

    return opts.next();
  });
}
```

### Pattern 5: Better Auth Server with Drizzle + Org Plugin

**What:** Server-side Better Auth configuration with Drizzle adapter, organization plugin, and custom roles.

**When to use:** packages/auth/src/server.ts

**Example:**
```typescript
// packages/auth/src/server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "@aucta/db";
import { ac, owner, manager, technician } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ["aucta://"],
  plugins: [
    expo(),
    organization({
      ac,
      roles: { owner, manager, technician },
      membershipLimit: 100,
      organizationLimit: 1, // D-12: single org per user
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days default
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // 1 day
  },
});
```

### Pattern 6: Custom Invite Code System

**What:** Custom invite_codes table that generates 6-char alphanumeric codes, separate from Better Auth's email-based invitation system.

**When to use:** AUTH-04, AUTH-05 -- invite codes for job-site conditions.

**Example:**
```typescript
// packages/db/src/schema/invite-codes.ts
import { pgTable, varchar, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const inviteRoleEnum = pgEnum("invite_role", ["technician", "manager"]);

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id", { length: 30 }).primaryKey(), // inv_xxxx
  orgId: varchar("org_id", { length: 30 }).notNull(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  createdBy: varchar("created_by", { length: 30 }).notNull(),
  role: inviteRoleEnum("role").notNull(),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Anti-Patterns to Avoid

- **Drizzle in services/routers:** Drizzle calls must only appear in repository classes. Services use repositories via constructor injection.
- **TRPCError in packages/ai or packages/db:** Use ErrorWithCode. TRPCError only in tRPC router files. Middleware auto-converts.
- **Trusting client-side org selection:** The org_id must come from the authenticated session's activeOrganizationId, never from client input.
- **Using Better Auth's built-in invite for code-based flow:** The email-based invitation system doesn't support 6-char codes. Build a custom invite_codes table.
- **NativeWind v5:** It is preview-only (v5.0.0-preview.3). Use v4.2.3 which is stable.
- **Expo Go for testing:** Audio/camera require development builds. Set up EAS dev builds from day one.
- **Barrel files:** LLMs and bundlers work better with direct imports. No index.ts re-exports of everything.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT + token rotation | Better Auth sessions + expo-secure-store | Session refresh, cookie caching, secure storage all built-in |
| Rate limiting | Custom Redis counter logic | @upstash/ratelimit | Handles sliding windows, token buckets, analytics, edge cases |
| Org RBAC | Custom role/permission tables | Better Auth organization + createAccessControl | Built-in role management, permission checks, member lifecycle |
| Form validation | Manual checks | Zod schemas from packages/shared | Single source of truth, type inference, error messages |
| Auth state persistence | AsyncStorage + manual encryption | expo-secure-store via @better-auth/expo | iOS Keychain / Android Keystore, automatic cookie management |
| ID generation | uuid v4 | nanoid with prefixed IDs (org_, usr_, inv_) | Self-documenting in logs, shorter, no hyphens |
| Database migrations | Hand-written SQL | drizzle-kit generate + migrate | Type-safe, reversible, CI-integrated |

**Key insight:** Better Auth provides 80% of the auth infrastructure out of the box (user management, sessions, organizations, RBAC). The custom 20% is the invite code system, which is a single table + 3 tRPC procedures.

## Common Pitfalls

### Pitfall 1: Better Auth + Drizzle Schema Sync
**What goes wrong:** Better Auth manages its own tables (user, session, account, organization, member). Running `npx auth generate` creates Drizzle schema files, but they can conflict with your custom schema if you define users or organizations separately.
**Why it happens:** Better Auth's schema generator and Drizzle's migration generator operate independently.
**How to avoid:** Let Better Auth generate its schema files via `bunx auth generate`, then import and extend them. Never define your own `user` or `organization` table -- Better Auth owns those. Your custom tables (invite_codes, org_settings, audit_log) reference Better Auth tables via foreign keys.
**Warning signs:** Drizzle migration errors about duplicate table names; type mismatches between Better Auth types and your DTOs.

### Pitfall 2: Active Organization Not Set After Sign-Up
**What goes wrong:** A user signs up and creates an organization, but subsequent API calls fail because `session.activeOrganizationId` is null.
**Why it happens:** Creating an organization doesn't automatically set it as the active org in the session.
**How to avoid:** After org creation, explicitly call `authClient.organization.setActive({ organizationId })`. Similarly, after joining an org via invite code, set it active. Use `databaseHooks.session.create.before` to auto-set if the user has exactly one org.
**Warning signs:** tRPC org-scope middleware throwing "No active organization" after successful sign-up + org creation flow.

### Pitfall 3: NativeWind v4 + Tailwind v4 Incompatibility
**What goes wrong:** NativeWind v4.2.3 was built for Tailwind CSS v3. Tailwind CSS v4 has a completely new CSS-first configuration system that NativeWind v4 does not understand.
**Why it happens:** NativeWind v5 was designed for Tailwind v4, but v5 is preview-only.
**How to avoid:** Use NativeWind v4.2.3 with Tailwind CSS v3.x for the mobile app. The web dashboard can use Tailwind v4 independently. Design tokens can be shared via a common JSON/TS file that both Tailwind configs consume, not via Tailwind config sharing.
**Warning signs:** NativeWind styles not applying, PostCSS errors, "unknown utility" warnings.

### Pitfall 4: Drizzle v1.0 Beta Trap
**What goes wrong:** Package manager installs drizzle-orm v1.0.0-beta.x instead of v0.45.x because the beta has a higher version number.
**Why it happens:** Without explicit pinning, `bun add drizzle-orm` may resolve to the beta.
**How to avoid:** Pin explicitly: `"drizzle-orm": "^0.45.0"` in package.json. Verify after install with `bun pm ls drizzle-orm`.
**Warning signs:** Unfamiliar API, migration system changes, runtime errors from incompatible schema syntax.

### Pitfall 5: tRPC v11 API Changes from v10
**What goes wrong:** Following v10 tutorials/examples leads to type errors or runtime failures.
**Why it happens:** tRPC 11 has breaking changes: `createTRPCContext` from `@trpc/tanstack-react-query` replaces `createTRPCReact`, `httpBatchLink` replaces `httpBatchLink` with different options, transformers moved to links.
**How to avoid:** Use the v11 App Router setup pattern exclusively (documented in research). Key imports: `createTRPCContext` from `@trpc/tanstack-react-query`, `createTRPCClient` from `@trpc/client`.
**Warning signs:** "Cannot find name createTRPCReact" errors, hook API mismatches.

### Pitfall 6: Expo SDK 55 Removed expo-av from Expo Go
**What goes wrong:** Audio recording tests fail in Expo Go.
**Why it happens:** expo-av was removed from Expo Go in SDK 55. Replaced by expo-video and expo-audio.
**How to avoid:** Use EAS development builds from day one. Phase 1 needs expo-camera for QR scanning, which also requires dev builds.
**Warning signs:** "Module not found" errors when testing with Expo Go, crash on camera permission request.

### Pitfall 7: Zod v4 Breaking Changes
**What goes wrong:** Error customization patterns from Zod v3 tutorials don't work.
**Why it happens:** Zod 4 unified error parameter replaces `errorMap`, `message`, and `invalid_type_error`.
**How to avoid:** Use the unified `error` parameter for custom error messages. Use `z.toJSONSchema()` for built-in JSON Schema conversion.
**Warning signs:** TypeScript errors on `.refine()` or `.superRefine()` error parameters.

### Pitfall 8: Rate Limit Identifier for Unauthenticated Endpoints
**What goes wrong:** Auth endpoints (login, signup) can't use userId as rate limit identifier because the user isn't authenticated yet.
**Why it happens:** Rate limiting by userId doesn't work before authentication.
**How to avoid:** Use IP address as identifier for auth endpoints. tRPC context should extract the client IP from request headers. Use `x-forwarded-for` or request socket address.
**Warning signs:** All unauthenticated requests sharing a single rate limit bucket.

## Code Examples

### Drizzle + Neon Connection
```typescript
// packages/db/src/client.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });

export type DrizzleClient = typeof db;
```

### Better Auth Permissions (Custom Roles)
```typescript
// packages/auth/src/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";

const statement = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  invite: ["create", "revoke", "view"], // custom: invite code management
  settings: ["view", "update"],
  team: ["view"],
} as const;

export const ac = createAccessControl(statement);

export const technician = ac.newRole({
  team: ["view"],
});

export const manager = ac.newRole({
  invite: ["create", "view"],
  team: ["view"],
  member: ["create"],
});

export const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  invite: ["create", "revoke", "view"],
  settings: ["view", "update"],
  team: ["view"],
});
```

### tRPC Context with Better Auth Session
```typescript
// packages/api/src/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "@aucta/auth";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    session: session ? {
      userId: session.user.id,
      activeOrganizationId: session.session.activeOrganizationId,
    } : null,
    headers: opts.headers,
  };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(async (opts) => {
  if (!opts.ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return opts.next({
    ctx: { session: opts.ctx.session },
  });
});

export const protectedProcedure = publicProcedure.use(isAuthed);
```

### ErrorWithCode Class
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

  static Conflict(message: string) {
    return new ErrorWithCode("CONFLICT", message);
  }
}
```

### ErrorWithCode to TRPCError Middleware
```typescript
// packages/api/src/middleware/error-converter.ts
import { TRPCError } from "@trpc/server";
import { ErrorWithCode } from "@aucta/shared/utils/errors";

const ERROR_CODE_MAP: Record<string, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
};

export const errorConverter = t.middleware(async (opts) => {
  try {
    return await opts.next();
  } catch (error) {
    if (error instanceof ErrorWithCode) {
      throw new TRPCError({
        code: ERROR_CODE_MAP[error.code] ?? "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }
    throw error;
  }
});
```

### Invite Code Generation Utility
```typescript
// packages/shared/src/utils/invite-code.ts
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability

export function generateInviteCode(): string {
  let code = "";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += CHARSET[byte % CHARSET.length];
  }
  return code;
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().trim();
}
```

### tRPC Client for Expo
```typescript
// apps/mobile/lib/api.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@aucta/api";
import { authClient } from "./auth-client";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function createTRPC() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.EXPO_PUBLIC_API_URL}/api/trpc`,
        async headers() {
          const cookies = authClient.getCookie();
          return {
            Cookie: cookies,
          };
        },
      }),
    ],
  });
}
```

### Vitest Workspace Configuration
```typescript
// vitest.config.ts (root)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
```

```typescript
// packages/api/vitest.config.ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

### Turbo.json Configuration
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| createTRPCReact | createTRPCContext from @trpc/tanstack-react-query | tRPC v11 | Different hook creation pattern |
| Zod errorMap/message | Unified `error` parameter | Zod v4 | Error customization API changed |
| @google/generative-ai | @google/genai | 2025-2026 | Legacy SDK replaced (not phase 1 but relevant) |
| ESLint + Prettier | Biome | Biome 2.x (2025) | Single tool, 35x faster |
| NativeWind v2/v3 | NativeWind v4 (stable) / v5 (preview) | 2025-2026 | v4 is current stable for production |
| tRPC v10 transformers | Transformers moved to links | tRPC v11 | Config location changed |
| expo-barcode-scanner | expo-camera (built-in barcode) | Expo SDK 49+ | Deprecated package removed |
| AsyncStorage | react-native-mmkv | 2024+ | 30x performance improvement |

**Deprecated/outdated:**
- `@google/generative-ai`: Replaced by `@google/genai`
- `expo-barcode-scanner`: Deprecated, use expo-camera
- `expo-av` in Expo Go: Removed in SDK 55, use dev builds
- `createTRPCReact`: Replaced by `createTRPCContext` in tRPC v11

## Open Questions

1. **NativeWind v4 + Tailwind v3 vs shared tokens**
   - What we know: NativeWind v4 requires Tailwind v3; the web dashboard uses Tailwind v4. These are incompatible config formats.
   - What's unclear: Best approach for sharing design tokens (colors, spacing, typography) between the two Tailwind versions.
   - Recommendation: Extract design tokens to a shared TypeScript constants file (`packages/config/design-tokens.ts`). Both Tailwind configs import from there. This decouples token definition from Tailwind version.

2. **Better Auth organizationLimit enforcement**
   - What we know: D-12 says single org per user. Better Auth has `organizationLimit` config option.
   - What's unclear: Whether `organizationLimit: 1` prevents a user from creating a second org AND from accepting an invite to a second org, or only creation.
   - Recommendation: Set `organizationLimit: 1` and add a server-side check in the invite join flow to verify the user has no existing org membership before allowing join.

3. **QR Code content for invite codes**
   - What we know: D-07 requires QR scanning support.
   - What's unclear: Whether the QR should encode just the 6-char code or a full deep link URL (`aucta://join/ABC123`).
   - Recommendation: Encode a deep link URL in the QR code. This allows both QR scanning (extracts the code from the URL) and link sharing (WhatsApp, SMS) to use the same format.

4. **tRPC client in Expo: cookie vs bearer token**
   - What we know: Better Auth uses cookies by default. The Expo plugin stores cookies in SecureStore and provides `authClient.getCookie()`.
   - What's unclear: Whether tRPC's httpBatchLink correctly handles cookies from SecureStore on React Native, since RN doesn't have browser-style cookie jars.
   - Recommendation: Use `authClient.getCookie()` in the httpBatchLink headers callback. Set `credentials: "omit"` on the fetch to prevent native cookie interference. Test this early -- if cookies don't propagate, fall back to a bearer token header approach.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management + runtime | Yes | 1.3.8 | -- |
| Node.js | Metro bundler (Expo) | Yes | v24.13.0 | -- |
| Git | Version control | Yes | 2.39.5 | -- |
| Docker | Local Postgres/Redis (optional) | Yes | 29.2.0 | Use cloud Neon + Upstash directly |
| GitHub CLI | PR creation, CI status | Yes | 2.89.0 | -- |
| neonctl | Neon Postgres management | No | -- | Use Neon web console; install via `brew install neonctl` |
| EAS CLI | Mobile builds | No | -- | Install via `bun add -g eas-cli`; required for dev builds |
| Turbo | Build orchestrator | No (global) | -- | Install as dev dep in repo: `bun add -d turbo` |

**Missing dependencies with no fallback:**
- EAS CLI: Required for INFRA-03 (dev builds). Must be installed: `bun add -g eas-cli`

**Missing dependencies with fallback:**
- neonctl: Can use Neon web console for project creation, but CLI is more ergonomic
- Turbo: Will be installed as repo devDependency, global install optional

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | None yet -- Wave 0 creates vitest.config.ts at root |
| Quick run command | `bun run test` (via turbo task) |
| Full suite command | `bunx turbo run test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | Monorepo builds and typechecks | smoke | `bunx turbo run typecheck` | N/A (CI) |
| INFRA-02 | Import boundaries enforced | unit | `bunx biome check` | Wave 0 |
| INFRA-04 | CI pipeline runs checks | smoke | GitHub Actions workflow | Wave 0 |
| INFRA-05 | DB schema valid, migrations run | integration | `bunx drizzle-kit generate` | Wave 0 |
| INFRA-06 | Redis rate limiting works | unit | `vitest packages/api/src/middleware/rate-limit.test.ts` | Wave 0 |
| AUTH-01 | Account creation | unit | `vitest packages/auth/src/**/*.test.ts` | Wave 0 |
| AUTH-02 | Session persistence | manual-only | Requires physical device + Expo dev build | -- |
| AUTH-03 | Org creation | unit | `vitest packages/api/src/routers/org.router.test.ts` | Wave 0 |
| AUTH-04 | Invite code generation | unit | `vitest packages/api/src/routers/invite.router.test.ts` | Wave 0 |
| AUTH-05 | Join org by code | unit | `vitest packages/api/src/routers/invite.router.test.ts` | Wave 0 |
| AUTH-06 | RBAC enforcement | unit | `vitest packages/auth/src/permissions.test.ts` | Wave 0 |
| AUTH-07 | Org-scope middleware | unit | `vitest packages/api/src/middleware/org-scope.test.ts` | Wave 0 |
| AUTH-08 | Rate limiting | unit | `vitest packages/api/src/middleware/rate-limit.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run test` (affected packages via turbo)
- **Per wave merge:** `bunx turbo run typecheck test lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` (root) -- workspace configuration
- [ ] `packages/api/vitest.config.ts` -- API package test config
- [ ] `packages/auth/vitest.config.ts` -- Auth package test config
- [ ] `packages/shared/vitest.config.ts` -- Shared package test config
- [ ] `packages/db/vitest.config.ts` -- DB package test config
- [ ] Framework install: `bun add -d vitest` at root

## Sources

### Primary (HIGH confidence)
- Better Auth organization plugin: https://www.better-auth.com/docs/plugins/organization -- org setup, RBAC, invitations, roles
- Better Auth Expo integration: https://www.better-auth.com/docs/integrations/expo -- expo-secure-store, session caching
- Better Auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle -- adapter config, schema generation
- Better Auth session management: https://www.better-auth.com/docs/concepts/session-management -- cookie caching, session config
- tRPC v11 middleware: https://trpc.io/docs/server/middlewares -- middleware patterns, context extension
- tRPC v11 Next.js App Router setup: https://trpc.io/docs/client/nextjs/app-router-setup -- server/client setup
- tRPC React setup: https://trpc.io/docs/client/react/setup -- client hooks, provider
- Drizzle ORM Neon setup: https://orm.drizzle.team/docs/get-started/neon-new -- serverless driver, schema
- Drizzle ORM PG column types: https://orm.drizzle.team/docs/column-types/pg -- pgTable, column types
- @upstash/ratelimit getting started: https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted -- setup, API
- @upstash/ratelimit algorithms: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms -- fixed/sliding/token bucket
- Expo Router authentication: https://docs.expo.dev/router/advanced/authentication/ -- Stack.Protected, auth context
- expo-secure-store: https://docs.expo.dev/versions/latest/sdk/securestore/ -- API, platform notes
- Vitest workspace: https://vitest.dev/guide/workspace -- monorepo test config
- npm registry version checks (all packages verified 2026-04-03)

### Secondary (MEDIUM confidence)
- Turborepo installation: https://turborepo.dev/repo/docs/getting-started/installation -- Bun support confirmed
- Biome getting started: https://biomejs.dev/guides/getting-started/ -- CLI setup

### Tertiary (LOW confidence)
- NativeWind v4 + Tailwind v3 compatibility: inferred from NativeWind v5 being the version targeting Tailwind v4. Needs validation during implementation that NativeWind 4.2.3 works with Tailwind v3.x.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry, official docs consulted
- Architecture: HIGH - Patterns from TECH-SPEC.md and project rules, verified with official docs
- Pitfalls: HIGH - Cross-referenced multiple official sources, version-specific gotchas documented
- Better Auth org plugin: HIGH - Official docs fully documented with code examples
- Invite code system: MEDIUM - Custom implementation required; Better Auth doesn't provide code-based invites natively
- NativeWind v4 + Tailwind version: MEDIUM - v4.2.3 is pinned in CLAUDE.md decision, but Tailwind v3 vs v4 compatibility needs validation

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (30 days -- stable ecosystem, pinned versions)
