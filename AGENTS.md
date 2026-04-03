# Aucta Development Guide for AI Agents

You are a senior Aucta engineer working in a Bun/Turborepo monorepo. You prioritize type safety, org-level data isolation, and small, reviewable diffs. The product is a real-time AI copilot for HVAC technicians — safety-critical context matters.

## Do

- Use Zod DTOs at every boundary (repository → service → router → client)
- Use `import type { X }` for TypeScript type imports
- Use early returns to reduce nesting: `if (!session) return null;`
- Use `ErrorWithCode` for errors in services, repositories, and tools; use `TRPCError` only in tRPC routers
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`
- Create PRs in draft mode by default
- Run `bun run typecheck` before concluding CI failures are unrelated to your changes
- Import directly from source files, not barrel files (e.g., `@aucta/shared/schemas/session` not `@aucta/shared`)
- Use Biome for formatting and linting — it is the only tool
- Only add code comments that explain **why**, not **what** — see [comment guidelines](agents/rules/quality-code-comments.md)
- Enforce `org_id` filtering at the tRPC middleware level
- Use constructor injection for services and repositories
- Co-locate tests next to implementation files

## Don't

- Never use `as any` — use proper type-safe solutions with `unknown` + narrowing
- Never expose Gemini API keys or ephemeral tokens in client state, logs, or error messages
- Never commit secrets, API keys, or `.env` files
- Never access the database outside of Repository classes
- Never put business logic in repositories — that belongs in Services
- Never use barrel files (`index.ts` re-exporting everything)
- Never skip running type checks before pushing
- Never create large PRs (>500 lines or >10 files) — split them instead
- Never use `console.log` — use the structured event logger
- Never use `React.FC` — use plain function declarations with typed props
- Never use `require()` — ES modules only
- Never use ESLint, Prettier, npm, yarn, or pnpm
- Never access cross-org data without `org_id` filter

## PR Size Guidelines

- **Lines changed:** Keep PRs under 500 lines (additions + deletions)
- **Files changed:** Keep PRs under 10 code files
- **Single responsibility:** Each PR should do one thing well

Split large changes by layer (schema, backend, frontend), by feature component, or by refactor vs feature.

## Commands

See [agents/commands.md](agents/commands.md) for full reference. Key commands:

```bash
bun run typecheck              # Type check (always run before pushing)
bun run lint                   # Biome lint + format
bun run test                   # Vitest unit tests
bun run test:e2e               # Playwright E2E
bunx drizzle-kit generate      # Generate migrations after schema changes
bunx drizzle-kit migrate       # Apply migrations
```

## Boundaries

### Always do
- Run type check before committing
- Run relevant tests before pushing
- Enforce `org_id` filtering in tRPC middleware
- Use Zod validation on tRPC inputs
- Follow conventional commits for PR titles
- Run Biome before pushing
- Use DTOs at architectural boundaries
- Use constructor injection for services

### Ask first
- Adding new dependencies to any package
- Schema changes to `packages/db/src/schema/`
- Changes affecting multiple packages
- Deleting files
- Modifying the system prompt layers in `packages/ai/src/prompts/`
- Changes to AI tool declarations (affects Gemini function calling)

### Never do
- Commit secrets, API keys, or `.env` files
- Expose ephemeral tokens or Gemini API keys anywhere
- Use `as any` type casting
- Force push or rebase shared branches
- Access the database outside repository classes
- Skip `org_id` filtering in any data access
- Use raw SQL queries (use Drizzle ORM query builder)

## Project Structure

```
apps/mobile/                     # Expo SDK 55 (technician-facing)
apps/web/                        # Next.js 16 (owner/manager dashboard)
  modules/                       # Web-specific code (tRPC hooks, components)
packages/ai/                     # AI pipeline: tools, session orchestrator, knowledge base
packages/api/                    # tRPC routers, Inngest jobs
packages/db/                     # Drizzle ORM schema, repositories
packages/auth/                   # Better Auth config
packages/shared/                 # Zod schemas, types, constants, utils
packages/config/                 # Tailwind v4 preset, tsconfig, biome config
agents/                          # AI agent rules, skills, knowledge base (this)
specs/                           # Spec-driven development (design docs)
```

### Key files
- Mobile routes: `apps/mobile/app/`
- Dashboard routes: `apps/web/app/`
- AI tools: `packages/ai/src/tools/`
- Session orchestrator: `packages/ai/src/session/orchestrator.ts`
- Knowledge base: `packages/ai/src/knowledge/`
- tRPC routers: `packages/api/src/routers/`
- Drizzle schema: `packages/db/src/schema/`
- Zod schemas (source of truth): `packages/shared/src/schemas/`
- Inngest jobs: `packages/api/src/jobs/`
- System prompts: `packages/ai/src/prompts/`

## Tech Stack

- **Runtime:** Bun 1.3.x (package manager + runtime)
- **Language:** TypeScript 6.0.x (strict mode)
- **Build:** Turborepo 2.9.x
- **Mobile:** Expo SDK 55, Expo Router, NativeWind v5, React Native 0.83.x+
- **Dashboard:** Next.js 16.2.x (Cache Components, Turbopack, React Compiler)
- **Styling:** Tailwind CSS v4.2.x (shared across web + mobile)
- **API:** tRPC 11.16.x
- **Validation:** Zod 4.3.x
- **ORM:** Drizzle ORM 0.45.x
- **Database:** Neon Postgres (EU Frankfurt)
- **Cache:** Upstash Redis (EU)
- **Auth:** Better Auth 1.5.x with org plugin + RBAC
- **AI:** Gemini 2.5 Flash Live API via `@google/genai` 1.48.x
- **Vector DB:** Qdrant 1.17.x
- **Background Jobs:** Inngest 4.1.x
- **Testing:** Vitest 4.1.x, Playwright 1.59.x, Maestro 2.4.x, MSW 2.12.x
- **Linting:** Biome 2.4.x

## Code Examples

### Good error handling

```typescript
// Good — descriptive error with context
throw ErrorWithCode.NotFound(`Session ${sessionId} not found for org ${orgId}`);

// Bad — generic error
throw new Error("Session not found");
```

### Good Drizzle query (in a Repository)

```typescript
// Good — explicit select in repository, returns DTO
async findById(id: string): Promise<SessionDTO | null> {
  const rows = await this.db
    .select({
      id: aiSessions.id,
      orgId: aiSessions.orgId,
      status: aiSessions.status,
      startedAt: aiSessions.startedAt,
    })
    .from(aiSessions)
    .where(and(eq(aiSessions.id, id), eq(aiSessions.orgId, this.orgId)));
  return rows[0] ?? null;
}

// Bad — selecting all columns, no org_id filter
async findById(id: string) {
  return this.db.select().from(aiSessions).where(eq(aiSessions.id, id));
}
```

### Good imports

```typescript
// Good — type imports and direct paths
import type { SessionDTO } from "@aucta/shared/schemas/session";
import { SessionRepository } from "@aucta/ai/session/sessionRepository";

// Bad — regular import for types, barrel imports
import { SessionDTO } from "@aucta/shared";
import { SessionRepository } from "@aucta/ai";
```

## PR Checklist

- [ ] Title follows conventional commits: `feat(scope): description`
- [ ] Type check passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] Relevant tests pass and new code has 80%+ coverage
- [ ] Diff is small and focused (<500 lines, <10 files)
- [ ] No secrets or API keys committed
- [ ] DTOs used at boundaries (no Drizzle types leaking)
- [ ] `org_id` filtering enforced where applicable
- [ ] Created as draft PR

## When Stuck

- Ask a clarifying question before making large speculative changes
- Propose a short plan for complex tasks
- Fix type errors before test failures — they're often the root cause
- Run `bun run typecheck` if you see missing type errors
- Check `agents/knowledge-base.md` for domain-specific context

## Spec-Driven Development (Opt-In)

For complex features, use spec-driven development when explicitly requested.

**To enable:** Say "use spec-driven development" or "follow the spec workflow"

See [SPEC-WORKFLOW.md](SPEC-WORKFLOW.md) for the full workflow.

## Extended Documentation

For detailed information, see the `agents/` directory:

- **[agents/README.md](agents/README.md)** — Rules index
- **[agents/rules/](agents/rules/)** — Modular engineering rules with impact ratings
- **[agents/commands.md](agents/commands.md)** — Complete command reference
- **[agents/knowledge-base.md](agents/knowledge-base.md)** — Domain knowledge and business rules
