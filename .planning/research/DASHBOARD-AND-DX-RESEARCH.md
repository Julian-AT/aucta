# Deep Research: Dashboard Architecture & DX Optimization

> Generated 2026-04-10. Pure research -- no implementation code.
> Covers Next.js 16 dashboard patterns for Aucta's B2B SaaS dashboard and Turborepo monorepo DX optimization.

---

## Table of Contents

- [Part 1: Dashboard Architecture](#part-1-dashboard-architecture)
  - [1.1 Next.js 16 Patterns](#11-nextjs-16-patterns)
  - [1.2 Field Service Management Features](#12-field-service-management-features)
  - [1.3 Data Visualization](#13-data-visualization)
  - [1.4 Open-Source Templates & Components](#14-open-source-templates--components)
- [Part 2: DX Optimization](#part-2-dx-optimization)
  - [2.1 Turborepo DX Best Practices](#21-turborepo-dx-best-practices)
  - [2.2 Monorepo Tooling 2025-2026](#22-monorepo-tooling-2025-2026)
  - [2.3 Testing DX](#23-testing-dx)
  - [2.4 CI/CD Optimization](#24-cicd-optimization)
  - [2.5 Shipping Velocity Tools](#25-shipping-velocity-tools)

---

# Part 1: Dashboard Architecture

## 1.1 Next.js 16 Patterns

### Server Components vs Client Components Balance

Next.js 16 (with React 19) defaults all components to Server Components. The recommended balance:

| Layer | Component Type | Rationale |
|-------|---------------|-----------|
| Layouts, navigation shells, sidebars | Server Component | Static structure, no interactivity needed |
| Data tables, lists, stats cards | Server Component (data fetch) + Client wrapper (interactions) | Fetch on server, hydrate minimal interactive parts |
| Charts, maps | Client Component (`"use client"`) | Recharts/Nivo require browser APIs |
| Forms, modals, dropdowns | Client Component | User interaction, state management |
| Real-time feeds (SSE) | Client Component | Needs `useEffect`, event listeners |

**Key principle:** Push `"use client"` as far down the tree as possible. Wrap only the interactive leaf, not the entire page.

### "use cache" Directive (Stable in Next.js 16)

Next.js 16 replaced implicit caching with explicit opt-in via `"use cache"`. Three scopes:

1. **File-level** -- `"use cache"` at top of file caches all exports
2. **Component-level** -- `"use cache"` inside a component function caches that component's rendered output
3. **Function-level** -- `"use cache"` inside a data-fetching function caches the return value

**Cache profiles with `cacheLife()`:**

| Profile | Stale | Revalidate | Expire |
|---------|-------|-----------|--------|
| `"default"` | undefined | 15 min | undefined |
| `"seconds"` | undefined | 1 s | 60 s |
| `"minutes"` | 5 min | 1 min | 1 h |
| `"hours"` | 5 min | 1 h | 1 day |
| `"days"` | 5 min | 1 day | 1 week |
| `"weeks"` | 5 min | 1 week | 1 month |
| `"max"` | 5 min | 1 month | indefinite |

Custom profiles can be defined in `next.config.ts` under `cacheLife`.

**Cache invalidation with `cacheTag()`:**
- Tag cached data with string identifiers
- Call `revalidateTag("tag-name")` from Server Actions to invalidate
- Enables targeted invalidation (e.g., `cacheTag("team-stats")` on the analytics widget, invalidate when new session completes)

**Dashboard pattern -- cached shell + dynamic streaming:**
- The overall layout/shell uses `"use cache"` with `cacheLife("hours")`
- Dynamic widgets wrapped in `<Suspense>` with streaming fallbacks
- Real-time data (session feed) stays uncached, uses SSE
- User-specific data uses `cacheTag()` with user/org identifiers

### Partial Prerendering (PPR)

Stable in Next.js 16. Combines static and dynamic rendering in a single route:

- Static shell is pre-rendered at build time (navigation, layout, skeleton states)
- Dynamic holes stream in at request time via `<Suspense>` boundaries
- No configuration needed beyond `<Suspense>` -- Next.js infers the static/dynamic split
- Reduces Time to First Byte for dashboard pages while keeping real-time data fresh

### tRPC SSE Subscriptions for Real-Time

tRPC v11 provides built-in SSE subscriptions via `httpSubscriptionLink`:

**Architecture:**
- Use `splitLink` in the tRPC client to route subscriptions through `httpSubscriptionLink` and queries/mutations through `httpBatchStreamLink`
- SSE is one-way server-to-client -- ideal for live dashboards (activity feeds, status updates, analytics)
- Automatic reconnection with exponential backoff
- Works in Vercel serverless (SSE streams supported on Vercel Functions)

**Patterns for Aucta dashboard:**
- Activity feed: SSE subscription pushes new session events
- Team status: SSE pushes online/offline/in-session status changes
- Analytics: SSE pushes metric updates (sessions today, avg duration, etc.)
- Heartbeat every 30s to keep connection alive

**SSE vs WebSocket for dashboard:**
- SSE is sufficient (server-to-client only, reconnection built-in, works through proxies/CDNs)
- WebSocket only needed for bidirectional (not the dashboard use case -- the mobile app uses WebSocket for Gemini Live)

### Layout Patterns

**Sidebar + main content layout:**
- Root layout: auth check, theme provider, tRPC provider
- Dashboard layout (`/dashboard/layout.tsx`): sidebar navigation, breadcrumbs, org switcher
- Feature layouts: feature-specific sub-navigation (e.g., `/dashboard/analytics/layout.tsx`)

**URL-driven state:**
- Filters, date ranges, pagination state encoded in URL search params
- Enables deep linking, sharing, and browser back/forward
- `useSearchParams()` on client, `searchParams` prop on server
- Server Components read search params directly for data fetching

**Parallel routes (`@slot`):**
- Use for dashboard widgets that load independently
- Each slot has its own loading state and error boundary
- Enables independent streaming of different dashboard sections

### RBAC (Role-Based Access Control)

Four-layer enforcement model:

1. **Edge Middleware** -- Route-level access control, redirects unauthorized users before Server Components render
2. **Server Components** -- Conditional rendering based on role, data filtering
3. **Server Actions** -- Permission checks before mutations
4. **Client Components** -- UI element visibility (buttons, menu items)

**Role hierarchy for Aucta:**

| Role | Permissions |
|------|------------|
| `owner` | Full access, billing, delete org |
| `admin` | Manage team, manage knowledge base, view all sessions, analytics |
| `manager` | View team sessions, analytics, manage assigned technicians |
| `technician` | Own sessions only, view knowledge base articles |

**Implementation approach:**
- Define permission map: `{ role: string[] }` mapping roles to permission strings
- `hasPermission(userRole, requiredPermission)` utility function
- Better Auth's organization plugin provides role storage and enforcement
- Edge Middleware uses a route-role map to check before rendering
- Server Components use `auth()` to get session and check permissions inline

---

## 1.2 Field Service Management Features

### Session Activity Feed

**Data model:**
- Session record: id, technician_id, org_id, equipment_type, started_at, ended_at, status, summary, language
- Session events: timestamped actions within a session (photo captured, question asked, tool called, guidance given)

**Real-time feed (SSE-powered):**
- Live "currently active sessions" section at top
- Chronological completed sessions list below
- Each card shows: technician name, equipment type, duration, status badge, summary snippet
- Click-to-expand: full session timeline, AI interactions, photos captured

**Filtering:**
- By technician, date range, equipment type, language, status
- URL-driven filters for deep linking
- Server Component data fetching with cached aggregations

### Team Management

**Features:**
- Member list with role assignment (Better Auth org plugin)
- Invite flow (email invitation via React Email + Resend)
- Activity overview per technician (sessions this week, avg session duration, languages used)
- Online/offline status (via SSE subscription)
- Performance metrics per technician

**UI patterns:**
- Data table (TanStack Table) with sorting, filtering, search
- Inline role editing with optimistic updates
- Bulk actions (invite, remove, change role)

### Knowledge Base Management

**Features:**
- CRUD for knowledge base articles
- Article editor (rich text or markdown)
- Category/tag management
- Search with preview (hits Qdrant vector search)
- Import from existing documentation
- Version history and diff view
- Usage analytics (which articles are most referenced by AI)

**Dashboard-specific concerns:**
- Admin can review AI-suggested articles (from session learnings)
- Approve/reject/edit workflow before articles enter the knowledge base
- Analytics: most-queried topics, knowledge gaps (questions the AI could not answer)

### Analytics & Reporting

**Key metrics:**
- Sessions per day/week/month (line chart, area chart)
- Average session duration (trend line)
- Equipment types distribution (pie/donut chart)
- Language distribution (bar chart)
- AI confidence scores over time
- Knowledge base hit rate (% of questions answered from KB vs general model knowledge)
- Cost per session (Gemini API usage tracking)
- Technician productivity (sessions completed, avg resolution time)

**Aggregation strategy:**
- Pre-compute daily/weekly/monthly aggregations via Inngest background jobs
- Store in Postgres aggregation tables
- Dashboard reads from aggregation tables (fast, cached)
- Real-time "today" metrics computed on-the-fly

### AI Session Playback

This is a distinctive feature for Aucta's dashboard. Concept: managers/admins can "replay" an AI-assisted session to review what happened.

**What to capture and store:**
- Timestamped transcript of the conversation (technician speech + AI responses)
- Photos/frames captured during the session (1 FPS JPEG)
- Tool calls made by Gemini (error code lookups, KB searches) with results
- AI confidence indicators
- Session metadata (equipment, location, duration)

**Playback UI design patterns (inspired by session replay tools like FullSession, Amplitude, Signal):**
- Timeline scrubber at the bottom (like a video player)
- Left panel: scrolling transcript synchronized with timeline position
- Right panel: photo/frame viewer showing what the camera saw at that moment
- Tool call markers on the timeline (clickable to see what was looked up)
- Play/pause/speed controls (1x, 1.5x, 2x)
- Jump to key moments: first question, tool calls, errors, session end

**Technical considerations:**
- Store session recordings as structured JSON (not video) for cost efficiency
- Photos stored in object storage (Vercel Blob or similar), referenced by timestamp
- Transcript is text -- lightweight to store and query
- Playback is client-side reconstruction from structured data, not video streaming
- Virtual scrolling for long transcripts (TanStack Virtual)

**Privacy/compliance:**
- EU AI Act: non-dismissible indicator that AI was involved
- Option to redact sensitive information from transcripts
- Access control: only managers+ can view session playbacks for their team
- Data retention policies configurable per organization

---

## 1.3 Data Visualization

### Chart Library Comparison

| Feature | Recharts v3 | Tremor | Nivo |
|---------|-------------|--------|------|
| npm weekly downloads | ~2.4M | ~250K | ~380K |
| Bundle size (gzipped) | ~50 kB | ~70 kB | Varies by chart (modular) |
| Chart types | 9 core types | ~15 types | 30+ types |
| TypeScript | Full support | Full support | Full support |
| Customization | High (composable API) | Low (opinionated, matches shadcn) | High (declarative + interactive) |
| Canvas support | No (SVG only) | No (SVG only) | Yes (Canvas for 100K+ data points) |
| Animation | Built-in | Built-in | Built-in (spring physics) |
| Responsive | Via `ResponsiveContainer` | Built-in | Built-in |
| React 19 compat | Yes (v3) | Yes | Yes |
| SSR support | Partial (needs client boundary) | Partial | Partial |

**Recommendation for Aucta:**

- **Primary: Recharts v3** -- shadcn/ui ships 53 pre-built chart components wrapping Recharts. Zero setup. Copy-paste from shadcn.io/charts. Covers line, bar, area, pie, radar, and radial charts. Sufficient for 95% of dashboard needs.
- **Backup: Nivo** -- If any analytics view needs to handle 100K+ data points (unlikely in early stages), Nivo's Canvas renderer handles this without DOM performance issues.
- **Skip Tremor** -- While aesthetically close to shadcn, it has low customization and a smaller ecosystem. Recharts + shadcn chart components provide better flexibility.

### shadcn/ui Charts (53 Components)

Available at shadcn.io/charts. Pre-built, copy-paste:
- Area Chart (stacked, gradient, interactive, axes, legend)
- Bar Chart (horizontal, vertical, stacked, grouped, interactive, mixed)
- Line Chart (multiple, dots, labels, custom, interactive)
- Pie Chart (donut, label, legend, interactive)
- Radar Chart (grid, lines, icons, legend)
- Radial Chart (stacked, text, shape, grid)
- Tooltip (default, custom, advanced)

Each component uses Recharts internally with shadcn styling. Includes dark mode support, theme tokens, and accessibility attributes.

### Real-Time Chart Updates

Pattern for SSE-driven chart updates:
- Use Zustand store for chart data (accessed outside React render cycle by SSE handler)
- SSE handler updates store with new data points
- Chart component subscribes to store with selector
- Use `useTransition` from React 19 for non-blocking UI updates during data push
- Debounce visual updates to ~1 update/second for smooth animation

### Virtual Scrolling / Pagination for Large Datasets

**TanStack Table v8** (headless, framework-agnostic):
- Sorting, filtering, column visibility, row selection, pagination
- Handles 10K+ rows with pagination
- Column resizing, reordering, pinning
- Server-side data model: pass `pageCount`, `manualPagination: true`
- Used with shadcn/ui table components

**TanStack Virtual** (for virtualized scrolling):
- `useVirtualizer` hook with `estimateSize`, `overscan`, `measureElement`
- Renders only visible rows + small overscan buffer
- Combined with `useInfiniteQuery` for infinite scrolling tables:
  1. `useInfiniteQuery` manages cursor-based pagination
  2. `useVirtualizer` virtualizes the flattened results
  3. `fetchMoreOnBottomReached` triggers next page load when scrolled near bottom
- Critical for the session activity feed if it grows large

**Pagination strategy:**
- Default: cursor-based server-side pagination (20 items per page)
- Sessions list: infinite scroll with virtualization (better UX for chronological feeds)
- Analytics tables: traditional pagination with page numbers (better for data exploration)

---

## 1.4 Open-Source Templates & Components

### Dashboard Templates Worth Studying

| Template | Stars | Stack | Key Features | Source |
|----------|-------|-------|--------------|--------|
| **Studio Admin** (arhamkhnz) | 1,926 | Next.js 16, TS, Tailwind v4, shadcn/ui | Multiple dashboard variants, responsive | github.com/arhamkhnz/studio-nextjs-dashboard |
| **Shadboard** | 617 | Next.js 15, i18n, Recharts | TanStack Table, React Hook Form, Zod, full dashboard | github.com/Starter-UI/Shadboard |
| **next16-chart-dashboard** (aurorascharff) | -- | Next.js 16, streaming | Cascading filters, URL-driven state, "use cache" | github.com/aurorascharff/next16-chart-dashboard |
| **DashboardPack** (adminlte.io) | Commercial | Next.js 16, shadcn/ui | 7 industry templates, 125+ pages (Apex) | adminlte.io/next-js-shadcn-templates |

**What to extract from these:**
- Studio Admin: layout structure, sidebar patterns, theme switching
- Shadboard: i18n integration (critical for Aucta's 7 languages), form patterns
- next16-chart-dashboard: "use cache" + streaming patterns, URL-driven filters
- DashboardPack Flux (SaaS template): SaaS dashboard layout, multi-tenant patterns

### Form Handling: react-hook-form + Zod

The standard "holy trinity" for Next.js forms: **Zod schema** + **react-hook-form** + **Server Actions**.

**Pattern:**
1. Define Zod schema in a shared file (used by both client and server)
2. Client: `useForm({ resolver: zodResolver(schema) })` for instant client-side validation
3. Server Action: `schema.safeParse(formData)` for server-side validation
4. Structured error return from Server Action, mapped to form fields via `setError()`

**Key libraries:**
- `react-hook-form` -- form state, minimal re-renders
- `@hookform/resolvers` -- connects Zod to react-hook-form
- `zod` (v4) -- schema definition, `z.infer<typeof schema>` for type inference
- shadcn/ui `<Form>` component -- wraps react-hook-form with accessible, styled form fields

**Advanced patterns:**
- Conditional validation with `.refine()` / `.superRefine()`
- Async validation (e.g., check email uniqueness on blur)
- Multi-step forms with partial schema validation per step
- Form dialogs with optimistic updates via `useOptimistic` (React 19)
- `next-safe-action` for type-safe Server Actions with built-in error handling

**Gotcha with Zod 4:** Error customization API changed. `error` parameter replaces `errorMap`/`message`/`invalid_type_error`. Check `@hookform/resolvers` compatibility with Zod 4 before upgrading.

### TanStack Table with shadcn/ui

shadcn/ui provides a data table recipe:
- Copy-paste `<DataTable>` component
- Column definitions with TypeScript generics
- Built-in sorting, filtering, pagination UI
- Row actions dropdown
- Selectable rows with bulk actions
- Customizable cell renderers

---

# Part 2: DX Optimization

## 2.1 Turborepo DX Best Practices

### Task Pipelines

**`turbo.json` configuration:**

- `dependsOn: ["^build"]` -- topological dependency (run dependent package builds first)
- `outputs: [".next/**", "dist/**"]` -- what to cache
- `inputs: ["src/**"]` -- what to hash for cache keys (narrowing reduces false invalidation)
- `persistent: true` -- for dev servers that don't exit
- `interruptible: true` -- (new in 2.9) allows Turborepo to restart persistent tasks when dependencies change

**Recommended pipeline for Aucta:**

```
tasks:
  build:
    dependsOn: ["^build"]
    outputs: [".next/**", "!.next/cache/**", "dist/**"]
  dev:
    persistent: true
    interruptible: true
    cache: false
  lint:
    dependsOn: ["^build"]
  typecheck:
    dependsOn: ["^build"]
  test:
    dependsOn: ["^build"]
    outputs: ["coverage/**"]
  db:generate:
    cache: false
  db:migrate:
    cache: false
```

### Remote Caching

**Vercel remote caching (recommended for Aucta since deploying to Vercel):**
- `turbo login` + `turbo link` -- connects to Vercel's remote cache
- Zero infrastructure -- cache is hosted by Vercel
- Shared across all team members and CI
- `--cache=local:rw,remote:rw` for full bidirectional caching

**Cache hit rates to expect:**
- Cold CI run: 0% (first build)
- Subsequent CI runs with no changes to a package: ~100% cache hit
- Typical PR builds: 60-90% cache hit (only changed packages rebuild)
- Local developer switching branches: high cache hit from remote

**Turborepo 2.9 improvements:**
- Time to First Task improved up to 96% (Vercel's backend monorepo: 8.1s down to 0.7s)
- `turbo query` now stable -- query your monorepo with GraphQL (useful for CI scripts and coding agents)
- Circular package dependencies no longer block adoption
- OpenTelemetry (experimental) for build metrics to Grafana/Datadog

### Watch Mode

`turbo watch` -- dependency-aware file watching and re-execution:
- Watches source files in all packages
- When a file changes, re-runs the task for that package AND downstream dependents
- `--experimental-write-cache` flag allows caching watch mode task outputs
- Replaces custom `nodemon`/`concurrently` setups

**Usage:** `turbo watch build` re-runs builds only for affected packages when sources change.

### Custom Generators

**`turbo gen` for code scaffolding:**

1. **Workspace generators:** `turbo gen workspace` creates a new package from a template
   - Interactive prompts for package name, dependencies
   - Copies from a template or creates blank workspace
   - Updates `turbo.json` and root configuration

2. **Custom generators:** Place in `turbo/generators/config.ts`
   - Built on Plop.js
   - TypeScript support
   - Auto-discovered from the generators directory
   - Can generate: new feature modules, tRPC routers, Drizzle schema files, test files

**Use cases for Aucta:**
- `turbo gen workspace` -- new shared package (e.g., `packages/notifications`)
- Custom generator for new tRPC router + Zod schema + Drizzle table + tests
- Custom generator for new dashboard page (layout, page, loading, error files)

---

## 2.2 Monorepo Tooling 2025-2026

### Code Generation for tRPC/Drizzle

**DRZL (use-drzl/drzl on GitHub, 101 stars):**
- Zero-friction codegen for Drizzle ORM schemas
- Analyzes your Drizzle schema and generates:
  - Zod/Valibot/ArkType validation schemas
  - Typed CRUD service functions
  - oRPC routers (adaptable to tRPC routers)
- Reduces boilerplate when adding new database tables
- Caveat: relatively new (101 stars), evaluate before committing

**Drizzle Kit migrations:**
- `drizzle-kit generate` -- generates SQL migrations from schema changes
- Snapshot-based diffing (compares current schema to last snapshot)
- `drizzle-kit push` -- applies schema directly to database (dev only)
- `drizzle-kit migrate` -- runs pending migration files
- Multi-config support for different databases
- Custom migration files for data migrations alongside schema changes

**Custom Turborepo generator for feature scaffolding:**
- Define templates for: Drizzle table schema, Zod DTO, tRPC router, repository, service, tests
- `turbo gen feature --name=equipment-types` generates all files with correct imports and types

### Shared Package Versioning

Three strategies, ranked by complexity:

**1. Fixed Versioning (`0.0.0` + `workspace:*`) -- Recommended for Aucta:**
- All internal packages at `version: "0.0.0"` with `"private": true`
- Apps reference via `"workspace:*"` protocol
- No version bumps, no publishing overhead
- Breaking changes affect all consumers immediately (acceptable when deploying together)
- Best when: team works in one monorepo, deploys all apps together

**2. Semantic Versioning with Changesets:**
- Each package maintains proper semver (`1.2.3`)
- `@changesets/cli` automates version bumps and changelog generation
- Workflow: `pnpm changeset` (describe changes) -> `pnpm changeset version` (bump versions) -> `pnpm changeset publish` (optional)
- `.changeset/config.json` configures: `linked` (groups), `fixed` (same version), `ignore` (skip packages)
- Best when: packages are independently deployed or published to npm

**3. Hybrid: Internal Packages Pattern (Turborepo recommended):**
- Internal packages use TypeScript source directly (no build step)
- Consuming app's bundler (Metro for mobile, Turbopack for web) compiles the package
- No `dist/` folder, no `build` script for internal packages
- Fastest dev loop -- changes in a package are picked up instantly
- Use `tsup` or `unbuild` only for packages that need to be published externally

**Recommendation for Aucta:** Use the Internal Packages Pattern (option 3) for all shared packages (`packages/db`, `packages/api`, `packages/auth`, `packages/shared`, `packages/ai`). No build step, no versioning overhead. Turbopack and Metro compile directly from source.

### Database Migrations Workflow

**Drizzle Kit + Neon branching:**
1. Developer creates a feature branch
2. CI creates a Neon database branch (copy-on-write, instant)
3. Developer runs `drizzle-kit generate` to create migration files
4. Migration runs against the Neon branch
5. PR review includes migration SQL review
6. On merge: migration runs against main Neon branch
7. CI deletes the Neon feature branch

---

## 2.3 Testing DX

### Vitest Projects (Workspace)

Vitest 4.x uses `projects` array (the `workspace` field is deprecated):

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      {
        name: 'unit',
        include: ['packages/*/src/**/*.test.ts'],
        environment: 'node',
      },
      {
        name: 'web',
        include: ['apps/web/**/*.test.tsx'],
        environment: 'jsdom',
      },
      {
        name: 'mobile',
        include: ['apps/mobile/**/*.test.tsx'],
        environment: 'jsdom',
      },
      {
        name: 'integration',
        include: ['**/*.integration.test.ts'],
        environment: 'node',
      },
    ],
  },
})
```

**Key features:**
- `extends: true` inherits root config (reporters, coverage settings)
- Named projects for targeted runs: `vitest --project=unit`
- Glob patterns for auto-discovery
- Different environments per project (node, jsdom, happy-dom)
- Tags and filtering (new in Vitest 4.x) for fine-grained test selection

### Test Co-location

**Recommended structure:**
```
packages/db/
  src/
    repositories/
      session.repository.ts
      session.repository.test.ts      # Unit test next to source
    __tests__/
      session.repository.integration.test.ts  # Integration tests in __tests__
```

**Benefits:**
- Tests are discoverable (right next to the code they test)
- Easier to maintain (rename/move source, test follows)
- Vitest project globs handle the separation for different test types

### Database Testing with Neon Branching

**Branch-per-test-suite pattern:**
1. Before test suite: create ephemeral Neon branch via API
2. Run migrations against the branch
3. Seed test data
4. Run integration tests against the branch
5. After test suite: delete the branch

**Neon branch performance:**
- Creation: instant (copy-on-write, no data copying)
- Cost: free for branches (billed only on compute usage)
- Capacity: 500K branches/day on the platform
- Schema diff: `neon branches diff` compares branch schema to parent

**Practical optimization:**
- For CI: create one branch per PR, reuse across test runs
- For local dev: create a personal dev branch, reset between test runs
- Use `drizzle-kit push` for fast schema application on test branches (skips migration files)

### Visual Regression Testing

**Tool comparison for Aucta:**

| Tool | Approach | Free Tier | Best For | Playwright Integration |
|------|----------|-----------|----------|----------------------|
| **Playwright built-in** | Local pixel diff | Free (open source) | Teams already using Playwright | Native |
| **Chromatic** | Cloud, Storybook-native | 5K snapshots/month | Component libraries with Storybook | Via Storybook |
| **Percy (BrowserStack)** | Cloud, pixel-by-pixel | 5K snapshots/month | Cross-browser, responsive testing | Native SDK |
| **Applitools** | Cloud, AI-powered | Free for OSS | Reducing false positives, enterprise | Native SDK |
| **Lost Pixel** | Open-source + optional cloud | Generous free tier | OSS-first, modern alternative | Via Storybook/Playwright |

**Recommendation for Aucta:**
1. **Start with Playwright built-in visual comparisons** -- free, no infrastructure, integrates with existing E2E tests
2. Set `maxDiffPixelRatio: 0.01` for tolerance against anti-aliasing differences
3. Focus on critical pages: login, dashboard overview, session detail, settings
4. Wait for hydration before capturing Next.js pages (SSR timing differences cause flakes)
5. If the component library grows to 50+ components and a Storybook is established, evaluate Chromatic for component-level VRT

**Next.js-specific concern:** Always wait for hydration before taking visual snapshots. SSR pages may render slightly differently before client-side JavaScript runs. Add a `data-hydrated` attribute and wait for it in tests.

### tRPC Mocking with MSW

**msw-trpc (v2.0.1):**
- `createTRPCMsw` generates typed mock handlers from your `AppRouter` type
- Works with tRPC v11 + MSW v2
- Supports queries, mutations, and subscriptions

**Setup with Vitest:**
1. `setupServer` from MSW in `vitest.setup.ts`
2. Create tRPC MSW instance with `createTRPCMsw<AppRouter>()`
3. Define handlers: `trpcMsw.session.list.query(() => mockSessions)`
4. Override per-test: `server.use(trpcMsw.session.list.query(() => []))`

**WebSocket mocking for Gemini protocol testing:**
- MSW v2 supports `ws.link()` for WebSocket interception
- Critical for testing the Gemini Live API WebSocket protocol
- Can simulate: connection, message exchange, disconnection, reconnection

---

## 2.4 CI/CD Optimization

### GitHub Actions + Turborepo

**Setup best practices:**

1. **Shallow clone with change detection:**
   - `fetch-depth: 2` for push events, `fetch-depth: 0` for PRs
   - Enables `turbo run build --filter=...[HEAD^1]` for affected-only builds

2. **Composite action for setup:**
   - Reusable action that installs Bun, restores node_modules cache, restores Turborepo cache
   - Used by all workflow jobs for consistency

3. **Cache strategy (multi-layer):**
   - Layer 1: Bun install cache (lockfile hash key)
   - Layer 2: Turborepo local cache (`~/.turbo` or `.turbo`)
   - Layer 3: Turborepo remote cache (Vercel, shared across runs)
   - Layer 4: Next.js build cache (`.next/cache`)

4. **Cache key patterns:**
   ```
   key: turbo-${{ runner.os }}-${{ hashFiles('bun.lock') }}-${{ github.sha }}
   restore-keys: |
     turbo-${{ runner.os }}-${{ hashFiles('bun.lock') }}-
     turbo-${{ runner.os }}-
   ```

5. **Parallel job execution:**
   - Separate jobs for: lint, typecheck, unit tests, integration tests, build
   - All jobs depend on a shared `setup` job (install + cache)
   - `dorny/paths-filter` for path-based job skipping (skip mobile tests if only web changed)

**Performance benchmarks from real-world repos:**
- 70% faster warm builds with proper caching (FrenchIntelligence blog)
- 50% Turbo task reduction with remote caching (Mercari)
- 30% total CI job reduction (Mercari)

### Neon Database Branching in CI

**Recommended workflow using official Neon actions:**

1. **On PR open/sync:**
   - `neondatabase/create-branch-action@v6` creates a branch from `main`
   - Sets `DATABASE_URL` env var for the PR
   - Runs migrations against the PR branch
   - Vercel preview deployment uses the PR branch

2. **On PR close/merge:**
   - Delete the Neon branch (cleanup)
   - If merged: run migrations against main branch

**Official actions:**
- `neondatabase/create-branch-action@v6` -- branch creation with `expires_at`, `masking_rules`, `parent_branch`
- `neondatabase/reusable-workflows` -- pre-built workflows for PR branch management (create/delete/reset)
- `neondatabase/preview-branches-with-vercel` -- complete PR preview + Neon branch + Vercel deployment

**Schema diff validation:**
- After migration runs on PR branch, use Neon's schema diff to verify expected changes
- `neon branches diff --branch <pr-branch> --database neondb` shows diff against parent
- Include diff output in PR comment for review

### PR Preview Environments

**Full-stack preview per PR:**
1. Neon branch (database) -- instant copy-on-write
2. Vercel preview deployment (web dashboard) -- automatic via Vercel GitHub integration
3. EAS preview build (mobile) -- triggered by GitHub Actions for mobile-affecting PRs
4. Environment variables: `DATABASE_URL` points to the PR's Neon branch

---

## 2.5 Shipping Velocity Tools

### AI Code Review Tools

| Tool | Monorepo Support | Key Feature | Pricing |
|------|-----------------|-------------|---------|
| **cubic** | Full (dependency graph) | Repository-wide context, cross-package analysis | Free (public), trial (private) |
| **CodeRabbit** | Multi-repo | Context-aware PR analysis, GitHub + GitLab | $12-$24/seat/month |
| **Qodo** | Cross-repo | Self-hosted option, cross-repo context | Free self-hosted, tiered hosted |
| **SonarQube** | File-focused | Established static analysis, extensive rules | Free community edition |

**For Aucta:** CodeRabbit or cubic are the best fit. CodeRabbit has more maturity; cubic has better monorepo-specific analysis. Both provide automated PR reviews that scale with increased development velocity.

### Engineering Productivity Platforms

| Tool | Category | Key Capability |
|------|----------|---------------|
| **Graphite** | PR workflow | Stacked PRs, faster review cycles, 1000+ PRs/month at 15 engineers |
| **LinearB** | Workflow optimization | DORA metrics, gitStream automations, WorkerB reduces review idle time by 60% |
| **Swarmia** | Engineering metrics | DORA/SPACE metrics, investment balance tracking |
| **Gradle Develocity** | Build optimization | Build cache, test distribution, AI failure grouping |

### Practical Velocity Boosters for Aucta

1. **Turborepo 2.9 `turbo query`** -- Query the monorepo structure with GraphQL. Useful for CI scripts ("which packages are affected?") and coding agents that need repo context.

2. **Biome 2.4** -- Single tool replacing ESLint + Prettier. 35x faster. Reduces CI lint time significantly. New: embedded CSS/GraphQL formatting, HTML accessibility rules.

3. **Internal Package Pattern** -- No build step for shared packages. Changes are picked up instantly by consuming apps via their bundlers. Eliminates "forgot to rebuild the package" errors.

4. **Stacked PRs (Graphite)** -- Ship dependent features in parallel instead of waiting for sequential merges. Particularly useful when building dashboard features that depend on API changes.

5. **AGENT.md / Repository Operating Manuals** -- Emerging pattern (from mabl's scaling AI agents blog) where each repo contains a machine-readable "operating manual" that AI coding agents use for context. Structure: codebase map, coding conventions, test requirements, deployment procedures.

6. **Turborepo Agent Skills** -- New feature in Turborepo 2.9. Installable "skills" for AI coding agents that provide Turborepo-specific context and capabilities. `bunx skills install vercel/turborepo`.

### Automation Opportunities

| Automation | Tool | Impact |
|-----------|------|--------|
| Auto-format on save/commit | Biome | Eliminates style discussions in PRs |
| Auto-generate migration SQL | Drizzle Kit | Reduces manual SQL writing |
| Auto-create Neon branch per PR | GitHub Actions | Instant isolated database per PR |
| Auto-run affected tests only | `turbo run test --filter=...[HEAD^1]` | 50-70% faster CI |
| Auto-review PRs | CodeRabbit / cubic | Catches issues before human review |
| Auto-deploy previews | Vercel + Neon | Every PR gets a full-stack preview |
| Auto-generate types from schema | DRZL / Drizzle Kit | Single source of truth for types |
| Auto-detect breaking changes | `turbo query affected` | Know exactly what a change impacts |

---

## Sources

### Part 1: Dashboard Architecture
- SecureStartKit: "Next.js use cache directive complete guide 2026"
- NextJS Launchpad: "Next.js 16 Cache Components complete guide"
- aurorascharff/next16-chart-dashboard (GitHub)
- Studio Admin by arhamkhnz (GitHub, 1,926 stars)
- Shadboard by Starter-UI (GitHub, 617 stars)
- DashboardPack / adminlte.io Next.js 16 shadcn templates
- shadcn.io/charts (53 chart components)
- PkgPulse: "Recharts v3 vs Tremor vs Nivo" comparison
- AverageDevs: "RBAC zero trust architecture Next.js"
- NextJS Launchpad: "Next.js role-based access control Auth.js v5"
- DEV Community: "Zod validation patterns for Next.js"
- ganeshjoshi.dev: "Form handling with Zod and Server Actions"
- makerkit.dev: "Working with Forms" (react-hook-form + Zod + next-safe-action)
- abstractapi.com: "Type-Safe Form Validation in Next.js 15"
- FullSession, Amplitude Session Replay, Signal, Voxket (session replay/playback tools)

### Part 2: DX Optimization
- Turborepo 2.9 release blog (turborepo.dev)
- Turborepo docs: "Creating an Internal Package", "Generating Code"
- turbo.build/docs/crafting-your-repository/creating-an-internal-package
- youngju.dev: "Monorepo Strategy Guide 2025: Nx vs Turborepo vs Lerna"
- magnumcode.com: "Type-Safe Shared Packages in Turborepo Monorepos"
- akousa.net: "Turborepo Monorepos: The Setup That Actually Scales"
- Graphite blog: "How we organize our monorepo to ship fast"
- vercel/turborepo GitHub Discussion #6347 (package count best practices)
- use-drzl/drzl (GitHub, Drizzle ORM codegen)
- Drizzle ORM docs: drizzle-kit generate, migrations
- Neon blog: "Practical guide to database branching"
- neondatabase/create-branch-action@v6, neondatabase/reusable-workflows (GitHub)
- neondatabase/preview-branches-with-vercel (GitHub)
- Mercari engineering: "Turborepo remote cache" (50% task reduction, 30% job reduction)
- ECOSIRE: "GitHub Actions CI/CD monorepo" guide
- FrenchIntelligence: "Supercharging GitHub Actions CI" (70% faster warm builds)
- msw-trpc (npm v2.0.1): tRPC + MSW integration
- MSW docs: Vitest integration with setupServer
- PkgPulse: "Chromatic vs Percy vs Applitools" comparison
- Chromatic: Playwright Visual Testing comparison page
- Bug0: "Visual Regression Testing for React & Angular in 2026"
- DevToolsGuide: "Visual Regression Testing: Catching UI Bugs"
- Sourcegraph: "Best Developer Experience Tools for 2026"
- cubic.dev: "Best AI code review tools for monorepos in 2026"
- mabl: "How We Built a System for AI Agents to Ship Real Code Across 75+ Repos"
