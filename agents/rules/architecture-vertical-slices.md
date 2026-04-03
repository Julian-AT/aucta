---
title: Organize Code by Domain Using Vertical Slices
impact: CRITICAL
tags: architecture, vertical-slices, organization
---

## Organize Code by Domain Using Vertical Slices

**Impact: CRITICAL**

The codebase is organized by domain, not by technical layer. Each package or feature directory is a self-contained vertical slice.

**Incorrect (traditional layered architecture):**

```
src/
  controllers/
    sessionController.ts
    knowledgeController.ts
  services/
    sessionService.ts
    knowledgeService.ts
  repositories/
    sessionRepository.ts
    knowledgeRepository.ts
```

**Correct (vertical slice architecture):**

```
packages/ai/src/
  session/
    orchestrator.ts
    connection.ts
    toolDispatcher.ts
    types.ts
  knowledge/
    core/
    ingest/
    compile/
    retrieve/
    verify/
  tools/
    lookupErrorCode/
    searchKnowledgeBase/
```

Each feature directory is a self-contained slice that includes:
- Domain logic and business rules
- Repository (data access)
- Types and DTOs
- Tests (co-located)

**Benefits:**
- Everything related to a feature lives in one directory
- Teams can work on different features without conflicts
- Features are loosely coupled and evolve independently
- LLMs can read one directory to understand an entire feature
