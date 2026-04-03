# Build, Test & Development Commands

## Development Commands

- `bun install` — Install all workspace dependencies
- `bun run dev` — Start all dev servers via Turborepo
- `bun run dev --filter apps/web` — Start dashboard only
- `bun run dev --filter apps/mobile` — Start mobile only
- `bunx inngest-cli dev` — Start Inngest local dev server (http://localhost:8288)

## Build Commands

- `bun run build` — Build all packages and apps
- `bun run build --filter packages/ai` — Build AI package only
- `bun run clean` — Remove build artifacts (node_modules, .next, .turbo, dist)

## Lint & Type Check

- `bun run lint` — Run Biome across the codebase
- `bun run lint --fix` — Run Biome and apply safe fixes
- `bun run typecheck` — Run TypeScript type checking across monorepo

## Testing Commands

### Unit Tests

- `bun run test` — Run all unit tests (Vitest)
- `bun run test packages/ai/src/tools/lookupErrorCode` — Run tests for specific tool
- `bun vitest run -t "test name"` — Run specific test by name

### Integration Tests

- `bun run test:integration` — Run integration tests (Vitest + MSW + test DB)

### End-to-End Tests

- `bun run test:e2e` — Run Playwright dashboard E2E tests
- `bun run test:e2e --grep "knowledge base"` — Run specific E2E tests
- `maestro test flows/` — Run Maestro mobile E2E tests

## Database Commands

- `bunx drizzle-kit generate` — Generate migrations from schema changes (run from packages/db)
- `bunx drizzle-kit migrate` — Apply pending migrations
- `bunx drizzle-kit studio` — Open Drizzle Studio (database browser)
- `neonctl branches list` — List Neon database branches

## Useful Patterns

### Running Single Tests

```bash
# Unit test specific file
bun vitest run packages/ai/src/tools/lookupErrorCode/lookupErrorCode.test.ts

# Integration test specific file
bun vitest run packages/api/src/routers/session.router.test.ts

# E2E test specific file
bun run test:e2e tests/knowledge-base.spec.ts

# Mobile E2E
maestro test flows/session-start.yaml
```

### Local Services (Docker)

```bash
# Start local Postgres + Redis + Qdrant for offline dev
docker compose -f tooling/docker/docker-compose.yml up -d

# Qdrant standalone
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant:v1.17.1
```

### Environment Setup

- Copy `.env.example` to `.env` and configure
- Run `bun install` at root
- Run `bunx drizzle-kit migrate` from packages/db
- Run `bunx inngest-cli dev` for background job development
