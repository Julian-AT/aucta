import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockArticleFindById,
  mockArticleFindByEquipment,
  mockArticleUpdate,
  mockArticleUpdateEmbedding,
  mockLinkCreate,
  mockLinkDeleteByArticleId,
  mockCompileArticle,
  mockGenerateLinks,
  mockEmbedDocument,
  mockQdrantUpsert,
} = vi.hoisted(() => ({
  mockArticleFindById: vi.fn(),
  mockArticleFindByEquipment: vi.fn(),
  mockArticleUpdate: vi.fn(),
  mockArticleUpdateEmbedding: vi.fn(),
  mockLinkCreate: vi.fn(),
  mockLinkDeleteByArticleId: vi.fn(),
  mockCompileArticle: vi.fn(),
  mockGenerateLinks: vi.fn(),
  mockEmbedDocument: vi.fn(),
  mockQdrantUpsert: vi.fn(),
}));

vi.mock("@aucta/db/repositories/knowledge-article.repository", () => ({
  KnowledgeArticleRepository: class {
    findById = mockArticleFindById;
    findByEquipment = mockArticleFindByEquipment;
    update = mockArticleUpdate;
    updateEmbedding = mockArticleUpdateEmbedding;
  },
}));

vi.mock("@aucta/db/repositories/knowledge-link.repository", () => ({
  KnowledgeLinkRepository: class {
    create = mockLinkCreate;
    deleteByArticleId = mockLinkDeleteByArticleId;
  },
}));

vi.mock("@aucta/db/client", () => ({ db: {} }));

vi.mock("@aucta/ai/knowledge/compile/article-compiler", () => ({
  compileArticle: mockCompileArticle,
}));

vi.mock("@aucta/ai/knowledge/compile/linker", () => ({
  generateLinks: mockGenerateLinks,
}));

vi.mock("@aucta/ai/knowledge", () => ({
  GeminiEmbeddingService: class {
    embedDocument = mockEmbedDocument;
  },
  createQdrantClient: () => ({ upsert: mockQdrantUpsert }),
  QDRANT_CONFIG: {
    COLLECTION_NAME: "knowledge_articles",
    DENSE_VECTOR_NAME: "dense",
    SPARSE_VECTOR_NAME: "sparse",
    BM25_MODEL: "qdrant/bm25",
  },
  EMBEDDING_CONFIG: { MODEL: "gemini-embedding-001" },
}));

vi.mock("./inngest-client.js", () => ({
  inngest: {
    createFunction: vi.fn((_config: unknown, handler: unknown) => handler),
  },
}));

import { knowledgeCompile } from "./knowledge-compile.js";

describe("knowledge-compile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  const mockEvent = {
    data: {
      orgId: "org_1",
      articleIds: ["art_001"],
      sessionId: "ses_001",
    },
  };

  const handler = knowledgeCompile as unknown as (ctx: {
    event: typeof mockEvent;
    step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
  }) => Promise<unknown>;

  const createStep = () => ({
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  });

  it("finds merge targets by equipment match", async () => {
    const article = {
      id: "art_001",
      orgId: "org_1",
      title: "Daikin E3",
      contentMd: "content",
      category: "troubleshooting",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
      procedureType: null,
      sourceSessionIds: ["ses_001"],
      version: 1,
      summary: null,
      confidenceLevel: "unverified",
      tags: [],
    };

    mockArticleFindById.mockResolvedValue(article);
    mockArticleFindByEquipment.mockResolvedValue([article]);
    mockCompileArticle.mockResolvedValue({
      title: "Daikin E3",
      summary: "Compiled summary",
      contentMd: "content",
      tags: [],
      sourceSessionIds: ["ses_001"],
    });
    mockArticleUpdate.mockResolvedValue(article);
    mockGenerateLinks.mockResolvedValue(0);

    const step = createStep();
    const result = await handler({ event: mockEvent, step });

    expect(mockArticleFindById).toHaveBeenCalledWith("art_001");
    expect(mockArticleFindByEquipment).toHaveBeenCalledWith("org_1", "Daikin", "FTXM25");
    expect(result).toEqual({ status: "completed", compiled: expect.any(Number) });
  });

  it("calls compileArticle when merge candidates exist", async () => {
    const article1 = {
      id: "art_001",
      orgId: "org_1",
      title: "Daikin E3",
      contentMd: "E3 fix",
      category: "troubleshooting",
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
      procedureType: null,
      sourceSessionIds: ["ses_001"],
      version: 1,
      summary: null,
      confidenceLevel: "unverified",
      tags: [],
    };

    const article2 = {
      ...article1,
      id: "art_existing",
      title: "Daikin E3 Existing",
      sourceSessionIds: ["ses_old"],
    };

    mockArticleFindById.mockImplementation((id: string) => {
      if (id === "art_001") return Promise.resolve(article1);
      if (id === "art_existing") return Promise.resolve(article2);
      return Promise.resolve(null);
    });

    mockArticleFindByEquipment.mockResolvedValue([article1, article2]);

    mockCompileArticle.mockResolvedValue({
      title: "Merged Daikin E3",
      summary: "Merged summary",
      contentMd: "Merged content",
      tags: ["E3"],
      sourceSessionIds: ["ses_001", "ses_old"],
    });

    mockArticleUpdate.mockResolvedValue({ ...article1, version: 2 });
    mockGenerateLinks.mockResolvedValue(1);
    mockEmbedDocument.mockResolvedValue(new Array(3072).fill(0.1));
    mockQdrantUpsert.mockResolvedValue({});

    const step = createStep();
    await handler({ event: mockEvent, step });

    expect(mockCompileArticle).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "art_001" }),
        expect.objectContaining({ id: "art_existing" }),
      ]),
      "test-api-key",
    );
  });

  it("generates links for all affected articles", async () => {
    const article = {
      id: "art_001",
      orgId: "org_1",
      title: "Solo Article",
      contentMd: "content",
      category: "equipment",
      equipmentBrand: null,
      equipmentModel: null,
      procedureType: null,
      sourceSessionIds: ["ses_001"],
      version: 1,
      summary: null,
      confidenceLevel: "unverified",
      tags: [],
    };

    mockArticleFindById.mockResolvedValue(article);
    // No equipment brand, so no merge targets
    mockArticleFindByEquipment.mockResolvedValue([]);
    mockCompileArticle.mockResolvedValue({
      title: article.title,
      summary: "Summary",
      contentMd: article.contentMd,
      tags: [],
      sourceSessionIds: ["ses_001"],
    });
    mockArticleUpdate.mockResolvedValue(article);
    mockGenerateLinks.mockResolvedValue(0);

    const step = createStep();
    await handler({ event: mockEvent, step });

    expect(mockGenerateLinks).toHaveBeenCalled();
  });

  it("handles articles without equipment brand (no merge, summary only)", async () => {
    const article = {
      id: "art_001",
      orgId: "org_1",
      title: "Safety Protocol",
      contentMd: "Always wear PPE",
      category: "safety",
      equipmentBrand: null,
      equipmentModel: null,
      procedureType: null,
      sourceSessionIds: ["ses_001"],
      version: 1,
      summary: null,
      confidenceLevel: "unverified",
      tags: [],
    };

    mockArticleFindById.mockResolvedValue(article);
    mockCompileArticle.mockResolvedValue({
      title: article.title,
      summary: "Safety article about PPE",
      contentMd: article.contentMd,
      tags: [],
      sourceSessionIds: ["ses_001"],
    });
    mockArticleUpdate.mockResolvedValue(article);
    mockGenerateLinks.mockResolvedValue(0);

    const step = createStep();
    const result = await handler({ event: mockEvent, step });

    // Article should still get a summary even without merge
    expect(mockArticleUpdate).toHaveBeenCalledWith(
      "art_001",
      expect.objectContaining({ summary: "Safety article about PPE" }),
    );
    expect(result).toEqual({ status: "completed", compiled: expect.any(Number) });
  });
});
