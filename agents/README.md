# Aucta Agent Documentation Index

- **[../AGENTS.md](../AGENTS.md)** — Main guide (structure, tech stack, commands, boundaries)
- **[commands.md](commands.md)** — Full CLI command reference
- **[knowledge-base.md](knowledge-base.md)** — Domain knowledge, business rules, product specifics

## Rules Index

### Architecture

- [architecture-vertical-slices](rules/architecture-vertical-slices.md) — Domain-organized packages
- [architecture-feature-boundaries](rules/architecture-feature-boundaries.md) — packages/ vs apps/modules/
- [architecture-page-level-auth](rules/architecture-page-level-auth.md) — Auth in page.tsx, not layout.tsx

### Data Layer

- [data-repository-pattern](rules/data-repository-pattern.md) — All DB access through repositories
- [data-dto-boundaries](rules/data-dto-boundaries.md) — Drizzle types never leak to frontend
- [data-drizzle-migrations](rules/data-drizzle-migrations.md) — Schema changes and migration workflow

### Quality

- [quality-simplicity](rules/quality-simplicity.md) — Clarity over cleverness
- [quality-error-handling](rules/quality-error-handling.md) — ErrorWithCode vs TRPCError
- [quality-pr-creation](rules/quality-pr-creation.md) — Conventional commits, draft PRs, size limits
- [quality-code-comments](rules/quality-code-comments.md) — Only explain why, never what

### Testing

- [testing-coverage-requirements](rules/testing-coverage-requirements.md) — 80%+ coverage for new code

### CI/CD

- [ci-git-workflow](rules/ci-git-workflow.md) — Push before checking CI, never force push

### Patterns

- [patterns-dependency-injection](rules/patterns-dependency-injection.md) — Constructor injection for services

### Culture

- [culture-accountability](rules/culture-accountability.md) — Collective ownership, challenge poor decisions
