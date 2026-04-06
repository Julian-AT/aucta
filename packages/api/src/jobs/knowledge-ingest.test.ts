import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindWithDetails,
  mockArticleCreate,
  mockArticleUpdateEmbedding,
  mockExtractLearnings,
  mockEmbedDocument,
  mockQdrantUpsert,
  mockInngestSend,
  mockVerificationCreate,
} = vi.hoisted(() => ({
  mockFindWithDetails: vi.fn(),
  mockArticleCreate: vi.fn(),
  mockArticleUpdateEmbedding: vi.fn(),
  mockExtractLearnings: vi.fn(),
  mockEmbedDocument: vi.fn(),
  mockQdrantUpsert: vi.fn(),
  mockInngestSend: vi.fn(),
  mockVerificationCreate: vi.fn(),
}));

vi.mock("@aucta/db/repositories/session.repository", () => ({
  SessionRepository: class {
    findWithDetails = mockFindWithDetails;
  },
}));

vi.mock("@aucta/db/repositories/knowledge-article.repository", () => ({
  KnowledgeArticleRepository: class {
    create = mockArticleCreate;
    updateEmbedding = mockArticleUpdateEmbedding;
  },
}));

vi.mock("@aucta/db/repositories/knowledge-verification.repository", () => ({
  KnowledgeVerificationRepository: class {
    create = mockVerificationCreate;
  },
}));

vi.mock("@aucta/db/client", () => ({ db: {} }));

vi.mock("@aucta/ai/knowledge/ingest/session-ingester", () => ({
  extractLearnings: mockExtractLearnings,
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
    send: mockInngestSend,
  },
}));

import { knowledgeIngest } from "./knowledge-ingest.js";

describe("knowledge-ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    mockVerificationCreate.mockResolvedValue({
      id: "ver_test",
      articleId: "art_test",
      orgId: "org_test",
      reviewerId: "system",
      status: "pending",
      reviewerNotes: null,
      reviewedAt: null,
      createdAt: new Date(),
    });
  });

  const mockEvent = {
    data: { sessionId: "ses_abc123", orgId: "org_1" },
  };

  // knowledgeIngest is the raw handler due to our mock
  const handler = knowledgeIngest as unknown as (ctx: {
    event: typeof mockEvent;
    step: { run: (name: string, fn: () => Promise<unknown>) => Promise<unknown> };
  }) => Promise<unknown>;

  const createStep = () => ({
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  });

  it("returns not-found when session does not exist", async () => {
    mockFindWithDetails.mockResolvedValue(null);
    const step = createStep();

    const result = await handler({ event: mockEvent, step });
    expect(result).toEqual({ status: "not-found" });
  });

  it("returns no-learnings when extractLearnings returns empty array", async () => {
    mockFindWithDetails.mockResolvedValue({
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        languageDetected: "en",
        summary: "Test summary",
      },
      findings: [],
      toolCalls: [],
    });
    mockExtractLearnings.mockResolvedValue([]);
    const step = createStep();

    const result = await handler({ event: mockEvent, step });
    expect(result).toEqual({ status: "no-learnings" });
  });

  it("creates articles with correct orgId, sourceType session, isAiGenerated true", async () => {
    mockFindWithDetails.mockResolvedValue({
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        languageDetected: "en",
        summary: "Test summary",
      },
      findings: [
        {
          category: "troubleshooting",
          description: "E3 error",
          severity: "medium",
          equipmentModel: "FTXM25",
          manufacturer: "Daikin",
        },
      ],
      toolCalls: [{ toolName: "lookupErrorCode", success: true }],
    });

    mockExtractLearnings.mockResolvedValue([
      {
        title: "Daikin E3 Fix",
        contentMd: "## Fix\nReset the outdoor unit",
        category: "troubleshooting",
        equipmentBrand: "Daikin",
        equipmentModel: "FTXM25",
        procedureType: "error_diagnosis",
        tags: ["E3"],
      },
    ]);

    mockArticleCreate.mockResolvedValue({
      id: "art_001",
      orgId: "org_1",
      title: "Daikin E3 Fix",
      contentMd: "## Fix\nReset the outdoor unit",
      summary: null,
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
      category: "troubleshooting",
      confidenceLevel: "unverified",
      tags: ["E3"],
    });

    mockEmbedDocument.mockResolvedValue(new Array(3072).fill(0.1));
    mockQdrantUpsert.mockResolvedValue({});
    mockInngestSend.mockResolvedValue({});
    const step = createStep();

    const result = await handler({ event: mockEvent, step });

    expect(mockArticleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_1",
        sourceType: "session",
        isAiGenerated: true,
        sourceSessionIds: ["ses_abc123"],
      }),
    );

    expect(result).toEqual({
      status: "completed",
      articleCount: 1,
      articleIds: ["art_001"],
    });
  });

  it("sends knowledge/articles-ingested event after article creation", async () => {
    mockFindWithDetails.mockResolvedValue({
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        languageDetected: null,
        summary: "summary",
      },
      findings: [
        { category: "safety", description: "leak", severity: "high", equipmentModel: null, manufacturer: null },
      ],
      toolCalls: [],
    });

    mockExtractLearnings.mockResolvedValue([
      {
        title: "Safety Article",
        contentMd: "## Safety\nLeak found",
        category: "safety",
        equipmentBrand: null,
        equipmentModel: null,
        procedureType: null,
        tags: ["leak"],
      },
    ]);

    mockArticleCreate.mockResolvedValue({
      id: "art_002",
      orgId: "org_1",
      title: "Safety Article",
      contentMd: "## Safety\nLeak found",
      summary: null,
      equipmentBrand: null,
      equipmentModel: null,
      category: "safety",
      confidenceLevel: "unverified",
      tags: ["leak"],
    });

    mockInngestSend.mockResolvedValue({});
    const step = createStep();

    await handler({ event: mockEvent, step });

    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "knowledge/articles-ingested",
      data: {
        orgId: "org_1",
        articleIds: ["art_002"],
        sessionId: "ses_abc123",
      },
    });
  });

  it("creates pending verification record for each ingested article", async () => {
    mockFindWithDetails.mockResolvedValue({
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        languageDetected: "en",
        summary: "Test summary",
      },
      findings: [
        {
          category: "troubleshooting",
          description: "E3 error",
          severity: "medium",
          equipmentModel: "FTXM25",
          manufacturer: "Daikin",
        },
      ],
      toolCalls: [{ toolName: "lookupErrorCode", success: true }],
    });

    mockExtractLearnings.mockResolvedValue([
      {
        title: "Daikin E3 Fix",
        contentMd: "## Fix\nReset the outdoor unit",
        category: "troubleshooting",
        equipmentBrand: "Daikin",
        equipmentModel: "FTXM25",
        procedureType: "error_diagnosis",
        tags: ["E3"],
      },
    ]);

    mockArticleCreate.mockResolvedValue({
      id: "art_ver_001",
      orgId: "org_1",
      title: "Daikin E3 Fix",
      contentMd: "## Fix\nReset the outdoor unit",
      summary: null,
      equipmentBrand: "Daikin",
      equipmentModel: "FTXM25",
      category: "troubleshooting",
      confidenceLevel: "unverified",
      tags: ["E3"],
    });

    mockEmbedDocument.mockResolvedValue(new Array(3072).fill(0.1));
    mockQdrantUpsert.mockResolvedValue({});
    mockInngestSend.mockResolvedValue({});
    const step = createStep();

    await handler({ event: mockEvent, step });

    expect(mockVerificationCreate).toHaveBeenCalledWith({
      articleId: "art_ver_001",
      orgId: "org_1",
      reviewerId: "system",
      status: "pending",
    });
  });

  it("auto-creates verification records visible in source code", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const filePath = path.join(
      import.meta.dirname,
      "knowledge-ingest.ts",
    );
    const source = fs.readFileSync(filePath, "utf-8");

    expect(source).toContain("KnowledgeVerificationRepository");
    expect(source).toContain("verificationRepo.create(");
    expect(source).toContain('status: "pending"');
    expect(source).toContain('reviewerId: "system"');
  });
});
