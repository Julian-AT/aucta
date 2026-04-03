---
title: Schema Changes and Migration Workflow
impact: HIGH
tags: data, drizzle, migrations, schema
---

## Schema Changes and Migration Workflow

**Impact: HIGH**

Schema changes require a disciplined workflow. Never modify the database directly.

**Workflow:**

1. Edit the schema in `packages/db/src/schema/`
2. Run `bunx drizzle-kit generate` from `packages/db/` to generate the migration SQL
3. Review the generated SQL in `packages/db/drizzle/`
4. Run `bunx drizzle-kit migrate` to apply
5. Run `bun run typecheck` to verify all consumers compile

**Rules:**
- Always generate migrations from schema changes, never write SQL by hand
- Review generated SQL before applying — Drizzle can produce destructive operations
- After schema changes, run typecheck to catch downstream type errors
- In CI, migrations are applied automatically to Neon branch databases
- Never drop columns in production without a two-phase migration (add new → migrate data → drop old)

**Neon branching:**
- Each PR gets its own Neon branch (copy-on-write from main)
- Migrations run against the branch database in CI
- On merge to main, migrations run against the production database
