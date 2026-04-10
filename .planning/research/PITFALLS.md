# Pitfalls Research

**Domain:** v1.1 Market-Ready features added to existing Expo + tRPC + Better Auth + Inngest monorepo
**Researched:** 2026-04-09
**Confidence:** HIGH (based on codebase analysis, official documentation, and known architecture)

## Critical Pitfalls

### Pitfall 1: Bun HTTP Server to Next.js API Routes — CORS and Middleware Loss

**What goes wrong:**
After migrating `apps/server` (a Bun.serve() with manual CORS headers and routing) into Next.js API routes, the mobile app gets 403/CORS errors on every request. The Expo mobile client can't authenticate, tRPC calls fail silently, and Inngest can't reach its handler.

**Why it happens:**
The current `apps/server/src/index.ts` implements CORS manually with a `withCors()` wrapper that applies `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and other headers to EVERY response, including OPTIONS preflight. Next.js API routes (App Router) don't have this. Each route handler (`app/api/trpc/[...trpc]/route.ts`, `app/api/auth/[...all]/route.ts`, `app/api/inngest/route.ts`) is an isolated function. CORS must be re-implemented either in Next.js middleware or per-handler. Missing it on even one route breaks the mobile app.

Additionally, the current server uses `Bun.serve()` which provides the raw `Request` object directly. Next.js API routes also use the Web Request/Response API in App Router, but the `x-forwarded-for` header handling for IP extraction (used by rate limiting) may differ behind Vercel's proxy layer, and `req.headers` may need different access patterns.

**How to avoid:**
1. Create a Next.js middleware (`middleware.ts` at the app root) that handles CORS for all `/api/*` routes. Include the same origins currently in `withCors()` plus the new web dashboard origin.
2. Test the mobile app against the Next.js server BEFORE removing `apps/server`. Run both in parallel during migration.
3. Verify that `x-forwarded-for` IP extraction in `createTRPCContext` works correctly behind Vercel's proxy (Vercel sets this header automatically).
4. The Inngest handler needs GET, POST, and PUT methods exported (not just the fetch handler the current Bun server uses). Use `inngest/next` adapter, not `inngest/bun`.

**Warning signs:**
- Mobile app CORS errors immediately after switching API URL
- Better Auth returning 403 on sign-in from mobile
- Inngest dashboard showing "function not found" or signature verification failures
- Rate limiter treating all users as the same IP (proxy IP instead of client IP)

**Phase to address:**
Web Dashboard Foundation phase (server migration). Must be the FIRST thing built and verified before any dashboard features.

---

### Pitfall 2: Better Auth Multi-App Session Divergence

**What goes wrong:**
The mobile app (Expo with SecureStore) and the web dashboard (Next.js with cookies) authenticate against the same Better Auth instance but sessions don't interoperate correctly. A user logged into the dashboard can't see the same org context the mobile app sees. Worse, the `nextCookies()` plugin requirement for RSC/Server Actions conflicts with the `expo()` plugin, causing one platform's sessions to break.

**Why it happens:**
The current `packages/auth/src/server.ts` configures Better Auth with the `expo()` plugin and `trustedOrigins` set for Expo deep links. Adding the Next.js dashboard requires:
1. Adding `nextCookies()` as the last plugin (Better Auth docs mandate this order)
2. Adding the web dashboard URL to `trustedOrigins`
3. The web client needs `createAuthClient` with Next.js-specific settings, while mobile uses `expoClient` with SecureStore

The single auth config must serve both platforms. If `nextCookies()` interferes with the Expo plugin, or if cookie settings (sameSite, secure, domain) are wrong, one platform breaks.

**How to avoid:**
1. Add `nextCookies()` as the LAST plugin in the plugins array: `plugins: [expo(), organization({...}), nextCookies()]`
2. Create a separate web auth client in `packages/auth/src/web-client.ts` (NOT in `client.ts` which mobile imports) to avoid bundling Next.js-specific code into the mobile app
3. Add the dashboard URL (localhost:3001 for dev, production URL) to `trustedOrigins`
4. Test the complete flow: sign up on web, sign in on mobile with same credentials, verify same org context
5. RSC pages cannot set cookies -- use Server Actions or Route Handlers. The Better Auth docs warn: "the cookie cache will not be refreshed until the server is interacted with from the client via Server Actions or Route Handlers"

**Warning signs:**
- Web dashboard shows "not authenticated" despite successful login
- Mobile app stops working after auth config changes
- Server Actions returning stale session data
- `activeOrganizationId` null on one platform but set on the other

**Phase to address:**
Web Dashboard Foundation phase. Auth must work on both platforms before building any dashboard screens.

---

### Pitfall 3: i18n Retrofit — Incomplete Extraction Creates Ghost Strings

**What goes wrong:**
After extracting strings from 14+ screens and 16+ components, the app launches with a mix of translated and untranslated text. Some strings are translated, others show raw English, and worst of all, some show translation keys like `settings.appearance.theme` instead of actual text. This is worse than no i18n at all -- it looks broken.

**Why it happens:**
The current codebase has hardcoded English strings everywhere:
- Settings screen: "Settings", "Appearance", "Theme", "Light", "Dark", "System", "Organization", "Account", "Sign Out"
- Auth screens: "Sign Up", "Cancel", "Create Organization", etc.
- Session screen: AI indicator text, connection status, end session dialog
- Component props: Alert.alert() strings, accessibility labels, error messages

Missing even ONE string in the extraction creates inconsistency. Additionally, `react-i18next` is installed (`^17.0.2` in package.json) but completely unconfigured -- no `i18n.ts` init file, no JSON translation files, no `<I18nextProvider>` in the root layout. This is a ground-up setup masquerading as a "retrofit."

**How to avoid:**
1. Create a comprehensive string audit FIRST. Use grep/search for all string literals in `.tsx` files. Count them. Create the extraction checklist before writing any code.
2. Organize namespaces by feature domain, not by screen: `common`, `auth`, `session`, `settings`, `knowledge`, `legal`. Shared strings (buttons, errors, status labels) go in `common`.
3. Set up fallback behavior correctly: configure `fallbackLng: 'en'` so untranslated keys show English, never raw keys.
4. Do NOT use a language detector AND set `lng` at the same time (the docs warn against this).
5. Handle Alert.alert() and other non-component contexts by importing the `i18next` instance directly (not the React hook).
6. Extract ALL strings in one pass, verify completeness, THEN add the second language. Adding languages piecemeal invites gaps.

**Warning signs:**
- Translation keys appearing in the UI (`auth.signUp.title` shown to users)
- Mix of English and target language on the same screen
- Alert.alert() calls still showing hardcoded English because hooks can't be used outside components
- accessibility labels not translated (screen reader experience breaks)

**Phase to address:**
i18n Foundation phase. Must be completed as a focused, comprehensive pass across the entire mobile app before any other mobile work.

---

### Pitfall 4: tRPC SSE Subscriptions Hit Vercel Serverless Limits

**What goes wrong:**
The dashboard "live sessions" feature uses tRPC SSE subscriptions to show active sessions in real time. In development it works perfectly. On Vercel, connections drop after 5 minutes (Hobby) or 13 minutes (Pro). With 10 dashboard users open, you consume 10 concurrent serverless function invocations that sit idle most of the time, hitting concurrency limits and running up costs.

**Why it happens:**
SSE keeps an HTTP connection open per subscriber. On Vercel serverless, each open connection is an active function invocation consuming the maxDuration timer. Vercel's default maxDuration is 300 seconds (5 minutes) for all plans, with a maximum of 800 seconds (13 minutes) on Pro/Enterprise. You CANNOT stream indefinitely. Additionally, Vercel's automatic concurrency scaling means each SSE connection creates a separate function instance -- 10 dashboard users = 10 instances.

The current architecture has no SSE subscriptions (mobile uses tRPC queries, not subscriptions), so this is new territory.

**How to avoid:**
1. Use polling as the primary approach for the dashboard, not SSE. A 10-second polling interval for "active sessions" is acceptable for a dashboard. tRPC subscriptions are elegant but architecturally wrong for Vercel serverless.
2. If SSE is required, set `maxDuration` on the subscription route to the plan maximum (300s Hobby, 800s Pro) and implement client-side automatic reconnection with `lastEventId` for resumption.
3. Use the `tracked()` helper from tRPC to emit IDs with events so clients can resume without missing data.
4. Consider whether the "real-time" requirement is actually "near-real-time" -- a 10-30 second refresh for a management dashboard is usually acceptable.
5. Monitor Vercel function usage after deployment. SSE connections are expensive at $0.18/GB-hr on Pro.

**Warning signs:**
- SSE connections dying after exactly 300 seconds in production
- Vercel dashboard showing high function concurrency from `/api/trpc` route
- Dashboard showing stale data because reconnection isn't implemented
- Function invocation costs spiking with only a few dashboard users

**Phase to address:**
Dashboard Core Screens phase. Architecture decision needed before implementing the overview screen.

---

### Pitfall 5: GDPR Data Deletion Across Three Stores Creates Orphans

**What goes wrong:**
A user requests data deletion (GDPR Art. 17 right to be forgotten). The Inngest job deletes rows from Postgres, but the corresponding vectors in Qdrant still exist (containing knowledge article embeddings that reference the user's sessions), and the Redis cache still has rate limit keys and session tokens associated with the user. The deletion is incomplete, which violates GDPR.

**Why it happens:**
The system stores user-related data in three independent stores:
1. **Postgres (Neon):** user, session, account, member tables (Better Auth managed), plus ai_sessions, session_findings, session_tool_calls, knowledge_articles, knowledge_verifications, knowledge_links, audit_log, invite_codes, org_settings
2. **Qdrant:** Article embeddings with `org_id` in payload, referenced by `embedding_id` in knowledge_articles
3. **Redis (Upstash):** Rate limit keys (`rl:auth:{userId}`, `rl:token:{userId}`, `rl:general:{userId}`), potentially cached session data

The current schema has NO foreign key constraints to Better Auth tables (by design -- see key decisions). This means CASCADE deletes don't propagate from user deletion to ai_sessions, session_findings, etc. Application-layer deletion must handle every table manually. Miss one table = incomplete deletion = GDPR violation.

Additionally, the knowledge article deletion is complex: deleting a user's sessions may require re-evaluating knowledge articles that were compiled from MULTIPLE users' sessions (`sourceSessionIds` is an array). You can't just delete the article -- you may need to recompile it without the deleted user's contributions.

**How to avoid:**
1. Create a comprehensive deletion manifest that lists every table/store with user-identifying data. Map: userId -> ai_sessions, session_findings, session_tool_calls, audit_log. orgId -> knowledge_articles (if org deletion), invite_codes.
2. Implement deletion as an Inngest multi-step function with explicit steps for each store:
   - Step 1: Soft-delete in Postgres (set `deleted_at`, don't hard delete yet)
   - Step 2: Delete vectors from Qdrant by querying `embedding_id` values from knowledge_articles being deleted
   - Step 3: Delete/expire Redis keys matching the user pattern
   - Step 4: Hard-delete from Postgres once Qdrant and Redis are confirmed clean
   - Step 5: Log the deletion in audit_log (audit logs themselves may need 6-year retention for legal compliance -- don't delete those)
3. Handle the knowledge article edge case: if an article's `sourceSessionIds` includes sessions from other users, anonymize the deleted user's contribution rather than deleting the entire article
4. Write an integration test that creates a full user footprint (sessions, findings, articles, embeddings, cache), runs the deletion job, and verifies ALL stores are clean

**Warning signs:**
- GDPR deletion job completing "successfully" but Qdrant still returning vectors for deleted user's articles
- Audit log showing deletion events but data still queryable via tRPC
- Knowledge articles orphaned (embedding_id references a deleted Qdrant point)
- Rate limit keys accumulating in Redis for deleted users

**Phase to address:**
Legal/GDPR Compliance phase. Must be implemented with full cross-store testing before any customer data is ingested.

---

### Pitfall 6: Monorepo Package Sharing Breaks Metro Bundler

**What goes wrong:**
Adding `apps/web` (Next.js + Turbopack) alongside `apps/mobile` (Expo + Metro) breaks one or both apps. Metro can't resolve packages that use Node.js-specific APIs. Turbopack can't process files that use React Native-specific imports. The shared packages (`@aucta/api`, `@aucta/shared`, `@aucta/auth`) become a battleground between two incompatible bundlers.

**Why it happens:**
The current packages use `.ts` source files directly (no build step, no `dist/`): `"exports": { ".": "./src/root.ts" }`. This works because Metro (via Bun) can import TypeScript directly. But this means:
1. Turbopack (Next.js) also needs to transpile these packages, which it can by default for workspace packages
2. However, if ANY shared package imports a React Native-specific module (like `react-native-mmkv` or `expo-secure-store`), Turbopack will fail because those modules don't exist in a Node.js environment
3. The `@aucta/auth` package currently imports `@better-auth/expo` -- a mobile-only plugin. If the web dashboard imports `@aucta/auth`, Turbopack will try to resolve `@better-auth/expo` and fail

Looking at the dependency graph:
- `@aucta/auth` depends on `@better-auth/expo` (mobile-only)
- `@aucta/api` depends on `@aucta/auth`
- Both `apps/mobile` and `apps/web` will depend on `@aucta/api`
- Therefore `apps/web` transitively depends on `@better-auth/expo` -- PROBLEM

**How to avoid:**
1. Split `@aucta/auth` into platform-specific entry points:
   - `./server` -> server-side auth (no expo plugin) -- used by API routes
   - `./client/mobile` -> mobile auth client with expoClient plugin
   - `./client/web` -> web auth client with nextCookies plugin
   The server config must NOT import `@better-auth/expo` when used by Next.js
2. Ensure `@aucta/shared` and `@aucta/api` have ZERO React Native imports. They should be platform-agnostic (pure TypeScript + Zod + Drizzle)
3. Add `transpilePackages` in `next.config.ts` for workspace packages if Turbopack doesn't auto-transpile them
4. Test: `apps/web` must build successfully with `turbo build --filter=web` without installing any React Native dependencies

**Warning signs:**
- `Module not found: Can't resolve 'react-native'` during Next.js build
- `Module not found: Can't resolve '@better-auth/expo'` in web app
- Metro build suddenly failing after adding new packages
- Circular dependency warnings between packages

**Phase to address:**
Web Dashboard Foundation phase. Package restructuring must happen BEFORE creating `apps/web`, not after.

---

### Pitfall 7: Sentry Source Map Upload Fails Silently in CI/EAS

**What goes wrong:**
Sentry is integrated in both mobile and web apps. Error reports come in, but stack traces show minified/obfuscated code -- no file names, no line numbers. Debugging production issues is impossible.

**Why it happens:**
Source map upload requires authentication tokens and correct build configuration in MULTIPLE places:
- **Next.js:** `withSentryConfig()` in `next.config.ts` needs `SENTRY_AUTH_TOKEN`. The wizard creates `.env.sentry-build-plugin` locally (and adds it to `.gitignore`), but CI needs the token in environment variables. Miss this and source maps silently don't upload during production builds.
- **Expo/EAS:** Sentry for React Native needs `@sentry/react-native/metro` in `metro.config.js` AND `@sentry/react-native/expo` in `app.json`. EAS builds also need `SENTRY_AUTH_TOKEN` in EAS secrets. The Sentry wizard configures the project locally but EAS builds run in a clean environment.
- **Two apps, two Sentry projects:** Mobile and web errors should go to separate Sentry projects (different DSNs). Misconfiguring this sends all errors to one project, losing platform context.

**How to avoid:**
1. Create TWO Sentry projects: `aucta-mobile` and `aucta-web`
2. For Next.js: Set `SENTRY_AUTH_TOKEN` in Vercel environment variables (not just `.env.sentry-build-plugin`). Verify source maps upload by checking the Sentry Release Artifacts page after a Vercel deployment.
3. For Expo: Add `SENTRY_AUTH_TOKEN` to EAS Secrets via `eas secret:create`. Verify by triggering a test error in a production EAS build and checking the stack trace in Sentry.
4. Use `sentry-cli releases files list` to verify source maps are actually uploaded after each build
5. Use Sentry's tunnel route in Next.js (`tunnelRoute` in `withSentryConfig`) to avoid ad-blocker interference

**Warning signs:**
- Sentry events showing `<anonymous>` or minified function names in stack traces
- "No source maps found for this release" warning in Sentry
- Build logs missing the Sentry upload step
- Source maps uploading locally but not in CI/EAS

**Phase to address:**
Observability phase. Must be verified with a production build (not just dev mode) before declaring observability complete.

---

### Pitfall 8: PostHog PII Leakage in Error Context and Session Replay

**What goes wrong:**
PostHog captures events and session replays that inadvertently contain personally identifiable information (PII): user emails in error messages, organization names in page titles, technician names in event properties. This violates GDPR's data minimization principle and creates a second data store that must be covered by GDPR deletion requests.

**Why it happens:**
PostHog's default configuration captures broad context:
- `sendDefaultPii` captures user agent, IP address, device info
- Session replay captures screen content (which may include user names, emails, org names visible in the UI)
- Custom events might include user-identifying properties if developers pass them
- Error boundaries may include user context in error reports
- The React Native SDK may capture sensitive text from TextInput fields

Additionally, PostHog is a third-party service. Even if self-hosted, it's another data store that GDPR deletion requests must reach.

**How to avoid:**
1. Configure PostHog with privacy-first defaults:
   - Disable session recording for mobile initially (evaluate need separately)
   - Use `maskAllTextInputs: true` if enabling session replay on web
   - Strip PII from event properties using a `beforeSend` hook
2. Create an allowlist of safe event properties rather than denying specific ones
3. Document PostHog as a sub-processor in the Art. 30 processing records
4. Include PostHog in the GDPR deletion job: call the PostHog API to delete user data when processing a deletion request
5. Self-host PostHog if possible to keep data in EU (PostHog Cloud US region violates EU data residency)

**Warning signs:**
- User emails appearing in PostHog event properties
- Session replays showing sensitive business data (organization names, financial metrics in dashboard)
- PostHog not listed in sub-processor register
- GDPR deletion job not including PostHog API call

**Phase to address:**
Observability phase. Privacy configuration must be set up BEFORE enabling event capture, not retrofitted.

---

### Pitfall 9: Email Template Rendering Differences Between Preview and Production

**What goes wrong:**
Email templates look perfect in the React Email preview server but arrive garbled in Gmail/Outlook. Images don't load, styles are stripped, buttons don't work. Password reset emails look unprofessional and damage trust.

**Why it happens:**
React Email renders React components to HTML, but email HTML is severely limited:
- Most CSS is ignored by email clients (no flexbox, no grid, limited margin/padding)
- Gmail strips `<style>` tags -- only inline styles work
- Outlook uses Word's HTML renderer (yes, Microsoft Word) -- most modern CSS breaks
- Images need absolute URLs (no relative paths, no base64 in some clients)
- Dark mode in email clients can invert colors unexpectedly

The React Email preview server uses a modern browser engine, which shows everything correctly. The actual email client rendering is radically different.

**How to avoid:**
1. Use ONLY React Email's built-in components (`<Button>`, `<Section>`, `<Row>`, `<Column>`, `<Img>`) -- they handle email client quirks internally
2. Test with real email clients, not just the preview: send test emails to Gmail, Outlook, Apple Mail, and Yahoo
3. Use Resend's built-in rendering -- don't try to pre-render HTML yourself
4. Keep email templates simple: single column layout, inline images with absolute URLs, minimal styling
5. Use `@react-email/components` for layout, not custom `<div>` structures
6. Configure the React Email dev server for local preview: `npx react-email dev` in the `packages/email` directory

**Warning signs:**
- Templates render differently in preview vs Gmail
- Buttons showing as plain text links
- Layout broken in Outlook specifically
- Images not loading (relative URLs or blocked base64)

**Phase to address:**
Auth Completeness / Email Infrastructure phase. Test with real email delivery (Resend sandbox mode) from day one.

---

### Pitfall 10: Inngest Handler Migration Breaks Existing Functions

**What goes wrong:**
After migrating from `inngest/bun` to `inngest/next`, the existing Inngest functions (sessionSummarize, knowledgeIngest, knowledgeCompile, knowledgeHealth) stop executing. Events fire but no functions run. The session summary pipeline silently dies.

**Why it happens:**
The current server uses `inngest/bun` adapter:
```typescript
import { serve: inngestServe } from "inngest/bun";
```
Next.js requires `inngest/next`:
```typescript
import { serve } from "inngest/next";
```
The adapter APIs are different:
- `inngest/bun` returns a single fetch handler
- `inngest/next` returns `{ GET, POST, PUT }` that must be individually exported
- The Inngest signing key (`INNGEST_SIGNING_KEY`) must be set in the Next.js environment
- The `serve()` call must include ALL functions (currently 4, but v1.1 adds more: gdpr.export, gdpr.delete, invite.expire, email.sessionSummary, data-retention)

If the migration only registers the new functions and forgets to include the 4 existing ones, the knowledge pipeline (already broken in v1.0 due to missing registrations -- see MILESTONE-AUDIT) will remain broken even after the "fix."

**How to avoid:**
1. Create a single `inngest/functions.ts` file that exports ALL Inngest functions as an array. Import this array in the route handler. This prevents forgetting to register individual functions.
2. After migration, verify EVERY Inngest function appears in the Inngest dashboard (local dev server at `npx inngest-cli@latest dev`).
3. Use the Inngest dashboard to manually send test events and verify functions execute.
4. The migration should include fixing the v1.0 audit gap: all 4 existing functions must be registered (they weren't all registered in the Bun server either).

**Warning signs:**
- Inngest dashboard showing fewer functions than expected
- Session summaries stop generating after migration
- Knowledge pipeline events (`session/ended`, `knowledge/articles-ingested`) showing no function matches
- New GDPR/email functions work but old session/knowledge functions don't

**Phase to address:**
Web Dashboard Foundation phase (server migration). Inngest migration should be verified immediately after the route handler is created.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding English strings during dashboard development | Faster dashboard feature delivery | Dashboard i18n must be done as a second pass, doubling the extraction work | Acceptable if dashboard v1.1 is English-only (owners are likely German-speaking -- reconsider) |
| Using polling instead of SSE for dashboard real-time | Simpler implementation, no serverless limits | Higher API call volume, less responsive UX | Acceptable -- 10-second polling is fine for a management dashboard |
| Single Sentry project for both mobile and web | Simpler setup, one DSN | Platform-specific errors mixed, harder to triage | Never -- separate projects from day one |
| Skipping PostHog on mobile in v1.1 | Faster mobile work, fewer privacy concerns | No analytics on the primary product surface | Acceptable for v1.1 if web PostHog proves the event model first |
| Using `packages/auth` server export for both platforms | Avoid package restructuring | Web build fails from `@better-auth/expo` import | Never -- split auth exports before creating `apps/web` |
| Deferring audit log to GDPR deletion | Skip audit log middleware initially | No audit trail for security investigations | Only acceptable if audit schema is created empty and middleware added within the same milestone |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Better Auth + Next.js | Not adding `nextCookies()` as the LAST plugin | Add after expo() and organization() plugins; RSC cookie refresh only works with this |
| Better Auth + Next.js | Using `toNodeHandler` in App Router | Use `toNextJsHandler(auth)` and export `{ GET, POST }` |
| tRPC + Next.js App Router | Using the pages API adapter | Use `fetchRequestHandler` from `@trpc/server/adapters/fetch` |
| tRPC + Next.js | Dynamic route segment mismatch | File must be `app/api/trpc/[...trpc]/route.ts` with endpoint set to `/api/trpc` |
| Inngest + Next.js | Not exporting PUT handler | Inngest requires GET, POST, AND PUT -- missing PUT breaks sync |
| Inngest + Next.js | Forgetting INNGEST_SIGNING_KEY in Vercel env | Functions won't execute in production without the signing key |
| Sentry + Next.js | Not wrapping next.config.ts with withSentryConfig | Source maps won't upload, stack traces will be minified |
| Sentry + EAS | Missing SENTRY_AUTH_TOKEN in EAS secrets | Source maps only upload from local machine, not CI builds |
| React Email + Resend | Rendering email HTML manually | Use Resend's render integration -- pass React components directly |
| react-i18next + Expo | Setting `lng` AND using a language detector | One overrides the other -- use detector for auto-detection OR set `lng` for explicit, not both |
| react-i18next + Alert.alert() | Trying to use `useTranslation()` hook outside React components | Import the `i18next` instance directly: `import i18n from './i18n'; i18n.t('key')` |
| PostHog + GDPR | Not listing PostHog as sub-processor | Legally required -- PostHog processes personal data on your behalf |
| Vercel + SSE | Assuming connections stay open indefinitely | maxDuration applies: 300s default, 800s max on Pro |
| MMKV + theme persistence | useState for theme (current code) | Read from MMKV on mount, write on change. Current settings screen uses `useState` only -- theme resets on restart |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| SSE subscription per dashboard user | High serverless function concurrency, cost spikes | Use polling (10-30s) or external push service for real-time | >5 concurrent dashboard users |
| Loading all sessions in session explorer | Slow initial render, high DB query time | Server-side pagination with cursor-based pagination (not offset) | >1000 sessions per org |
| Rendering all 7 translation files in mobile bundle | Increased app binary size, slower startup | Lazy-load non-default languages; bundle only `en` and `de` by default, fetch others on demand | When languages exceed 10 |
| Inngest function cold starts for GDPR deletion | Deletion takes minutes due to cold starts per step | Batch operations in each step (delete 100 rows per step, not 1) | >100 records to delete |
| Next.js Server Component + tRPC double-fetching | Same data fetched in RSC and then again in client component | Use RSC for initial data, hydrate into React Query cache with `initialData` | Any page with mixed RSC and client components |
| Audit log table unbounded growth | Queries slow down, storage increases linearly | Partition by month, add retention policy (archive after 6 years for legal, delete after 10) | >10M rows (~50K sessions with detailed logging) |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| GDPR export including Better Auth password hashes | User receives their hashed password in export, potential exposure | Explicitly exclude `account.password` field from GDPR export serialization |
| Audit log containing PII in metadata JSON | Audit retention + PII = indefinite PII storage | Audit log metadata should reference IDs, never contain names/emails/content |
| Email verification bypass via direct API access | Unverified email users access the system | Gate org creation and session start on `emailVerified: true` in auth middleware |
| GDPR deletion not covering Qdrant vectors | Knowledge article embeddings remain searchable after deletion | Include Qdrant point deletion by `embedding_id` in the deletion Inngest job |
| PostHog capturing API keys or tokens in error context | API keys exposed in third-party analytics service | Configure Sentry/PostHog `beforeSend` to strip patterns matching API key formats |
| Dashboard CSRF if auth relies on cookies | Attacker can forge requests from malicious site | Better Auth handles CSRF for its own endpoints; verify tRPC routes also validate origin |
| Transactional email exposing session content | Session summary emails containing proprietary business info sent via Resend (third party) | Document Resend as sub-processor; consider encrypting email content or making summary emails links-only |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| i18n changes requiring app restart | Technician changes language in settings but text stays English until app restart | Use react-i18next's `changeLanguage()` which triggers re-renders; verify ALL screens update reactively |
| Missing translations showing keys to users | User sees `auth.signUp.submitButton` instead of "Sign Up" | Configure `fallbackLng: 'en'` and `parseMissingKeyHandler` to return the fallback gracefully |
| Dashboard not matching mobile language | Owner sets German in dashboard, but emails to technicians are in English | Language preference should propagate: user profile stores preferred language, emails use recipient's preference |
| Legal pages only in English | Austrian privacy policy only in English violates GDPR transparency (must be clear and intelligible) | Provide Datenschutzerklarung in German (primary) and English; Impressum must be in German per Austrian law |
| Dashboard session explorer without timezone context | Session timestamps confusing when technicians work across timezones | Display timestamps in the viewer's local timezone; store all timestamps as UTC in the database (already done with `withTimezone: true`) |
| Password reset email arriving in wrong language | User set Turkish preference but reset email is in English | Email template selection must respect the user's stored language preference |

## "Looks Done But Isn't" Checklist

- [ ] **Server migration:** Often missing OPTIONS preflight handling -- verify mobile app CORS works for POST/PATCH requests (not just GET)
- [ ] **Better Auth web:** Often missing `nextCookies()` plugin -- verify Server Actions can read the session
- [ ] **i18n:** Often missing Alert.alert() strings -- verify alert dialogs show translated text (Sign Out confirmation, error alerts)
- [ ] **i18n:** Often missing accessibility labels -- verify screen reader announces translated text, not English
- [ ] **i18n:** Often missing dynamic strings -- verify strings with variables work: `t('session.duration', { minutes: 15 })` not `"Session lasted 15 minutes"`
- [ ] **i18n:** Often missing pluralization rules -- verify "1 session" vs "2 sessions" in all 7 languages (Slavic languages have complex plural rules: 1, 2-4, 5+)
- [ ] **GDPR deletion:** Often missing Qdrant cleanup -- verify knowledge article embeddings are deleted from vector DB
- [ ] **GDPR deletion:** Often missing Redis cleanup -- verify rate limit keys and cached tokens are expired
- [ ] **GDPR export:** Often missing Better Auth tables -- verify user, session, account, member data is included in export
- [ ] **Sentry:** Often missing source map verification -- verify a production build error shows readable stack traces, not minified code
- [ ] **PostHog:** Often missing privacy config -- verify session replay does not capture text input content
- [ ] **Email:** Often only tested in preview -- verify password reset email renders correctly in Gmail AND Outlook
- [ ] **Dashboard auth:** Often missing mobile compatibility check -- verify mobile app still works after auth config changes
- [ ] **Inngest migration:** Often missing existing function registration -- verify all 4+ existing Inngest functions appear in Inngest dashboard
- [ ] **Theme persistence:** Often using useState only -- verify theme selection persists across app restarts (MMKV, not useState)
- [ ] **Duplicate network packages:** expo-network and @react-native-community/netinfo both installed -- remove one to avoid bundle bloat and conflicting behavior

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CORS broken after server migration | LOW | Add CORS middleware to Next.js, deploy, mobile app works immediately |
| Better Auth sessions not working on web | MEDIUM | Add nextCookies() plugin, create web-specific auth client, test both platforms |
| i18n strings partially extracted | MEDIUM | Run full string audit, extract remaining strings, add missing translations, full QA pass |
| SSE hitting serverless limits | LOW | Switch to polling approach, remove subscription code, adjust client refresh interval |
| GDPR deletion incomplete | HIGH | Audit all stores, add missing deletion steps to Inngest job, re-run deletion for affected users, potential GDPR notification requirement |
| Metro/Turbopack bundler conflict | HIGH | Restructure @aucta/auth package exports, may require significant refactoring if platform-specific code leaked into shared packages |
| Sentry source maps not uploading | LOW | Set SENTRY_AUTH_TOKEN in CI/EAS secrets, verify with sentry-cli |
| PostHog PII leakage discovered | MEDIUM | Audit captured events, delete PII from PostHog, add beforeSend scrubbing, update sub-processor records |
| Email templates broken in Outlook | LOW | Switch to React Email built-in components only, simplify layout, re-test |
| Inngest functions not registered | LOW | Add all functions to the registration array, verify in Inngest dashboard |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CORS/middleware loss during server migration | Web Dashboard Foundation (server migration) | Mobile app makes successful tRPC + auth calls against Next.js API routes |
| Better Auth multi-app session divergence | Web Dashboard Foundation (auth setup) | Same user logs into both mobile and web, sees same org context |
| i18n incomplete string extraction | i18n Foundation | Every screen rendered in `de` locale shows zero English strings and zero translation keys |
| tRPC SSE hitting serverless limits | Dashboard Core Screens | Dashboard overview updates within 30s of session status change (polling or reconnecting SSE) |
| GDPR deletion orphaning data | Legal/GDPR Compliance | Integration test: create full user footprint, run deletion, query all 3 stores, zero results |
| Metro/Turbopack bundler conflict | Web Dashboard Foundation (package restructuring) | `turbo build` succeeds for both `mobile` and `web` targets |
| Sentry source maps not uploading | Observability | Production error in both mobile and web shows readable stack trace in Sentry |
| PostHog PII leakage | Observability | Security audit of PostHog events shows no email, name, or other PII in properties |
| Email rendering differences | Auth Completeness / Email | Password reset email renders correctly in Gmail and Outlook (manual test) |
| Inngest handler migration | Web Dashboard Foundation (server migration) | All Inngest functions visible in dashboard, test event triggers execution |
| Theme persistence not using MMKV | Mobile Polish | Kill app, reopen, theme setting persists |
| Duplicate network packages | Mobile Polish | Only one network detection library in package.json |
| Slavic plural rules missing | i18n Foundation | Croatian "1 sesija" vs "2 sesije" vs "5 sesija" all render correctly |
| Legal pages only in English | Legal/GDPR Compliance | Datenschutzerklarung accessible in German; Impressum in German |
| Audit log PII in metadata | Legal/GDPR Compliance | Audit log entries use only IDs, never names or emails in metadata |

## Sources

- Codebase analysis: `apps/server/src/index.ts` (current Bun server with manual CORS)
- Codebase analysis: `packages/auth/src/server.ts` (Better Auth config with expo() plugin)
- Codebase analysis: `packages/auth/src/client.ts` (shared base auth client)
- Codebase analysis: `apps/mobile/package.json` (react-i18next installed but unconfigured, duplicate network packages)
- Codebase analysis: `apps/mobile/app/(app)/(tabs)/settings.tsx` (theme using useState, no MMKV)
- Codebase analysis: `packages/db/src/schema/` (no FK to Better Auth tables, all tables with orgId)
- Codebase analysis: `packages/api/src/jobs/index.ts` (existing Inngest function exports)
- v1.0 Milestone Audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md` (Inngest registration gap, tech debt)
- tRPC official docs: Next.js App Router setup uses fetchRequestHandler (HIGH confidence)
- tRPC official docs: SSE subscriptions keep HTTP connections open, need tracked() for resumption (HIGH confidence)
- Inngest official docs: Next.js handler requires GET, POST, PUT exports; INNGEST_SIGNING_KEY required (HIGH confidence)
- Better Auth official docs: nextCookies() must be last plugin; toNextJsHandler for App Router; RSC cannot set cookies (HIGH confidence)
- Sentry official docs: withSentryConfig wraps next.config.ts; SENTRY_AUTH_TOKEN needed in CI; @sentry/react-native/metro for Expo (HIGH confidence)
- Vercel official docs: maxDuration 300s default, 800s max Pro/Enterprise; SSE connections consume function invocations (HIGH confidence)
- react-i18next official docs: fallbackLng configuration; don't use lng with detector; import instance for non-component usage (HIGH confidence)
- GDPR Art. 17 (right to erasure), Art. 30 (records of processing), Art. 33 (breach notification) requirements

---
*Pitfalls research for: v1.1 Market-Ready features -- adding i18n, observability, auth completeness, GDPR, web dashboard, and email to existing Aucta monorepo*
*Researched: 2026-04-09*
