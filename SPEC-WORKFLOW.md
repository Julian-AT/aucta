# Spec-Driven Development Workflow

This workflow is **opt-in**. Use it when explicitly requested by saying "use spec-driven development" or "follow the spec workflow". It complements GSD phases — use specs for complex features that benefit from a written design document before planning/execution.

## Design Documents

The `specs/` folder contains design documents for features in development.

Each spec follows this structure:

```
specs/{feature}/
├── CLAUDE.md           # Feature-specific agent instructions (read this first)
├── design.md           # The specification
├── implementation.md   # Current status and what's done
├── decisions.md        # ADRs — why decisions were made
├── future-work.md      # What's deferred
└── docs/               # Screenshots, diagrams, references
```

**Workflow:**

1. Read the spec's `CLAUDE.md` for feature-specific instructions
2. Read `design.md` to understand what we're building
3. Check `implementation.md` for current status
4. Find the relevant code in the codebase
5. Implement in small pieces, update `implementation.md` after each

---

## When Implementing Features (Spec Mode)

1. **Check for design doc** in `specs/` — if it exists, follow it
2. **If no spec exists** — ask if you should create one first
3. **Look at existing patterns** — find similar code and follow conventions
4. **Update implementation.md** — mark what's done after each piece
5. **Update decisions.md** — when choosing between approaches

---

## Creating a New Spec

When a user asks to build a complex feature:

1. Copy the template: `cp -r specs/_templates specs/{feature-name}`
2. Explore the codebase to understand existing patterns
3. Write `design.md` with technical spec
4. Write `CLAUDE.md` with feature-specific agent instructions
5. Initialize `implementation.md` with "not-started" status
6. Ask user to review before implementing

---

## Updating Spec Files

### implementation.md — After completing each piece:

```markdown
## Status: in-progress

## Completed
- [x] Database schema (SessionRepository)
- [x] Drizzle migration

## In Progress
- tRPC router endpoints

## Next Steps
1. Zustand store
2. UI components
3. Tests

## Session Notes
### 2026-04-03
- Done: Added session schema, created migration, built repository
- Next: Implement tRPC router with org_id middleware
```

### decisions.md — When choosing between approaches:

```markdown
## ADR-001: Use Qdrant Over pgvector for Knowledge Base

### Context
Need vector search for knowledge base retrieval.

### Options
1. pgvector — simpler (single DB), but limited hybrid search
2. Qdrant — dedicated vector DB, better hybrid search, payload filtering

### Decision
Qdrant for superior hybrid retrieval (BM25 + vector) and metadata filtering.

### Consequences
- Additional infrastructure (Qdrant Cloud or Docker)
- Requires embedding sync between Postgres and Qdrant
- Better retrieval quality for HVAC-specific queries
```

---

## Integration with GSD

Specs complement GSD phases:

- **GSD phases** manage the overall project roadmap, milestones, and execution tracking
- **Specs** provide deep technical design for individual complex features within a phase
- A GSD phase may reference one or more specs for its implementation details
- Spec `implementation.md` tracks granular progress; GSD tracks phase-level progress

When using both, reference the spec from the GSD phase plan and keep both updated.

---

## Don't (When Using Spec-Driven Development)

- Don't implement features without checking for a design doc first
- Don't skip updating `implementation.md` after completing work
- Don't make architectural decisions without recording them in `decisions.md`
- Don't conflict with GSD phase tracking — specs are a complement, not a replacement
