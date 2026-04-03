---
title: Use Constructor Injection for Loose Coupling
impact: HIGH
tags: patterns, dependency-injection, testing, coupling
---

## Use Constructor Injection for Loose Coupling

**Impact: HIGH**

Services and repositories receive their dependencies through constructor injection. This enables testing with mocks, build-time safety, and clean separation of concerns.

**Incorrect (tight coupling with direct instantiation):**

```typescript
import { db } from "@aucta/db";
import { Qdrant } from "@qdrant/js-client-rest";

class KnowledgeService {
  private db = db;
  private qdrant = new Qdrant({ url: process.env.QDRANT_URL });

  async search(query: string) {
    // Impossible to test without real DB and Qdrant
  }
}
```

**Correct (constructor injection):**

```typescript
interface KnowledgeServiceDeps {
  articleRepo: ArticleRepository;
  vectorStore: VectorStore;
  embeddings: EmbeddingsClient;
}

export class KnowledgeService {
  constructor(private deps: KnowledgeServiceDeps) {}

  async search(query: string, orgId: string) {
    const vector = await this.deps.embeddings.embed(query);
    const candidates = await this.deps.vectorStore.search(vector, { orgId });
    return this.deps.articleRepo.findByIds(candidates.map((c) => c.id));
  }
}

// In tests — easy to mock
const service = new KnowledgeService({
  articleRepo: mockArticleRepo,
  vectorStore: mockVectorStore,
  embeddings: mockEmbeddings,
});
```

**Required patterns:**
- **Services:** Orchestrate use cases, depend on repositories and external clients via injection
- **Repositories:** Abstract data access, receive Drizzle client via constructor
- **AI Tools:** Each tool's `call()` receives a context object with injected dependencies (DB, APIs)

**Use a deps interface** when a class has 2+ dependencies. Use a single parameter when there's only one.

**Avoid static methods** — they bypass injection and make testing harder. Use instance methods.
