# Aucta Standards

Conventions, patterns, and architectural decisions established during v1.0 and ratified in the v2 audit.

---

## 1. Architecture

### Layered Architecture
```
UI (React/Expo) → State (Zustand) → Routers (tRPC) → Services → Repositories → Database
```
- Each layer imports only from the layer directly below it.
- No circular dependencies between packages.

### Package Boundaries
| Package | Exports | Never Exports |
|---------|---------|---------------|
| `@aucta/db` | Repositories, schema types, DrizzleClient type | Raw drizzle queries, db instance |
| `@aucta/api` | AppRouter type, tRPC context | Service internals, repository instances |
| `@aucta/ai` | Tools, prompts, knowledge pipeline | Internal tool implementation details |
| `@aucta/shared` | Schemas (Zod), utils, constants | Business logic |
| `@aucta/auth` | Auth client, server, permissions | Session internals |

### Service Layer (v2)
- **Services contain all business logic.** Routers are thin wrappers that validate input (Zod) and delegate to services.
- **Services throw `ErrorWithCode`.** Routers never throw `TRPCError` directly — the `errorConverter` middleware handles the mapping.
- **Services accept dependencies via constructor injection.** This enables testing with mocks.
- **Services live in `packages/api/src/services/`.**

### Repository Pattern
- Every database table has a corresponding repository class.
- Repositories accept `DrizzleClient` via constructor.
- Repositories validate output through Zod DTOs (`XxxDTO.parse(row)`).
- IDs use meaningful prefixes: `ses_`, `art_`, `fin_`, `tcl_`, `inv_`, `org_`.
- Drizzle stays contained within repositories — no raw queries in routers or services.

---

## 2. Error Handling

### The Error Boundary Rule
```
Service layer: throw ErrorWithCode (NotFound, Forbidden, BadRequest, Conflict)
Router layer: errorConverter middleware maps to TRPCError
Client layer: catches TRPCError, shows user-friendly message
```

### Never Silently Swallow Errors
- If an operation fails, log it with `logger.error()` and context (IDs, operation name).
- If the failure is non-fatal (e.g., embedding a KB article fails), log it AND return a status indicator so callers know.
- Never use bare `catch (err) {}` — always log.

---

## 3. Security

### CORS
- **Explicit allowlist only.** Never reflect arbitrary origins.
- Allowed origins configured via `ALLOWED_ORIGINS` env var.
- `Access-Control-Allow-Credentials: true` only paired with specific origins.

### Environment Variables
- All required env vars validated at startup using `validateEnv()` from `@aucta/shared/utils/env`.
- Never use `process.env.X!` (non-null assertion). Validate or check.
- `.env.example` contains placeholder values only — never real credentials.

### Rate Limiting
- Auth endpoints: 10 requests / 60s (`authLimiter`)
- Token creation: 5 requests / 60s (`tokenLimiter`)
- General API: 100 requests / 60s token bucket (`generalLimiter`)

### Secrets
- Ephemeral tokens must never be logged.
- Request/response bodies must not be logged in production.
- API keys stored only in env vars, never in code or config files.

---

## 4. Logging

### Structured JSON Logger
- Use `logger` from `@aucta/shared/utils/logger` everywhere.
- No `console.log` in production code.
- Every log entry includes: `level`, `msg`, `timestamp`, plus relevant context.
- Log levels: `debug`, `info`, `warn`, `error`. Controlled by `LOG_LEVEL` env var.

### What to Log
- Request lifecycle: method, path, status, duration (in server)
- Business events: session created/ended, article embedded, review submitted
- Failures: with error message and relevant IDs
- Never log: passwords, tokens, full request bodies, PII

---

## 5. AI Pipeline

### Gemini Integration
- **Ephemeral tokens** for client-direct WebSocket (single-use, 1-min start window, 30-min session).
- **System prompt**: deterministic (no timestamps/random IDs) to benefit from implicit caching.
- **Tool declarations** locked in `liveConnectConstraints` on the token.
- **Inference tiers**: Priority for live sessions (if supported), Flex for background KB processing.

### Tool System
- Tools defined via `buildTool()` factory with Zod schema → JSON Schema conversion.
- Tool dispatch handles timeouts and parallel execution.
- Each tool receives `ToolContext` (orgId, userId, sessionId) via dependency injection.

### Knowledge Base
- **4-tier confidence**: unverified → technician_reviewed → expert_approved → manufacturer_sourced.
- **Hybrid search**: Dense (Gemini embeddings) + BM25, fused with Reciprocal Rank Fusion (k=60).
- **Embedding failures** logged and tracked — articles without embeddings are flagged, not silently invisible.
- **Compilation pipeline**: session → Inngest ingest → LLM compile → Qdrant store → health check.

---

## 6. Mobile

### Session UX
- Camera-first fullscreen with translucent HUD overlay.
- Two taps max to start a session.
- 56x56dp minimum touch targets (WCAG).
- EU AI Act: non-dismissible AI indicator, mandatory disclosure modal.

### State Management
- Zustand for client state. `getState()`/`setState()` for callbacks outside React.
- MMKV for local storage (with in-memory fallback for Expo Go).
- Fire-and-forget `mutate()` for non-blocking UI updates.

### Platform-Specific
- Lazy `require()` for native modules (Metro compatibility).
- Android: foreground service via Notifee for background audio.
- iOS: `UIBackgroundModes` audio entitlement.

---

## 7. Testing

### Coverage Requirements
- 80% line coverage minimum.
- Unit tests co-located (`*.test.ts` next to source).
- Integration tests for all tRPC routers.
- E2E tests (Maestro) for critical user flows.

### Test Patterns
- Services tested with injected mock dependencies.
- Repositories tested against a real database (Neon branch) — no mocking the DB.
- Mobile hooks/stores tested with Vitest.
- No `as any` in tests — use proper typed mocks.

---

## 8. Git & CI

### Commit Messages
```
<type>: <description>

<optional body>
```
Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

### Branch Strategy
- `main` — production-ready
- Feature branches: `feat/description`, `fix/description`
- PR required for all changes to `main`.

---

## 9. File Organization

### Size Limits
- 400 lines typical, 800 max per file.
- If a file exceeds 400 lines, evaluate splitting.
- Never exceed 800 lines — extract a new module.

### Naming
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components (following Expo conventions).
- Classes: `PascalCase` (e.g., `SessionService`, `KnowledgeArticleRepository`).
- Functions: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants, `camelCase` for config objects.
- DB columns: `snake_case`. TS properties: `camelCase`. Drizzle handles the mapping.

---

## 10. Dependencies

### Version Pins
Critical versions pinned in root `package.json`:
- Drizzle ORM: `^0.45.0` (NOT v1.0-beta)
- Expo SDK: 55
- Next.js: `^16.2.0`
- TypeScript: `^6.0.0`

### What NOT to Use
See CLAUDE.md "What NOT to Use" table. Key prohibitions:
- Prisma (cold start), Firebase Auth (vendor lock), Supabase (lock-in)
- pgvector (no multivector), socket.io (not serverless), Redux (boilerplate)
- `@google/generative-ai` (legacy — use `@google/genai`)
- `console.log` in production code
