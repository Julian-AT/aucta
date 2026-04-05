import { describe, expect, it, vi, beforeEach } from "vitest";
import { KnowledgeArticleRepository } from "./knowledge-article.repository.js";

function createMockArticleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "art_abc123456789012345",
    orgId: "org_123",
    slug: "fix-daikin-ftxm25-e7-error",
    title: "Fix Daikin FTXM25 E7 Error",
    summary: "How to resolve E7 error on Daikin FTXM25",
    contentMd: "# Fix E7 Error\n\nStep-by-step guide...",
    category: "troubleshooting" as const,
    equipmentBrand: "Daikin",
    equipmentModel: "FTXM25",
    procedureType: null,
    confidenceLevel: "unverified" as const,
    sourceType: "session" as const,
    sourceSessionIds: ["ses_abc123"],
    tags: ["daikin", "e7", "troubleshooting"],
    version: 1,
    previousVersionId: null,
    embeddingId: null,
    embeddingModel: null,
    wordCount: null,
    retrievalCount: 0,
    lastRetrievedAt: null,
    isAiGenerated: true,
    createdBy: null,
    verifiedBy: null,
    verifiedAt: null,
    createdAt: new Date("2026-04-05T10:00:00Z"),
    updatedAt: new Date("2026-04-05T10:00:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockArticleRow();
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockRow]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([mockRow]),
  };

  return {
    insert: vi.fn().mockReturnValue(chainable),
    select: vi.fn().mockReturnValue(chainable),
    update: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
    _mockRow: mockRow,
  };
}

describe("KnowledgeArticleRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: KnowledgeArticleRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new KnowledgeArticleRepository(db as any);
  });

  describe("create", () => {
    it("inserts an article with generated ID and returns KnowledgeArticleDTO", async () => {
      const result = await repo.create({
        orgId: "org_123",
        title: "Fix Daikin FTXM25 E7 Error",
        contentMd: "# Fix E7 Error\n\nStep-by-step guide...",
        category: "troubleshooting",
        sourceType: "session",
        equipmentBrand: "Daikin",
        equipmentModel: "FTXM25",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^art_/);
      expect(result.category).toBe("troubleshooting");
    });

    it("creates a slug from the title", async () => {
      await repo.create({
        orgId: "org_123",
        title: "Fix Daikin FTXM25 E7 Error",
        contentMd: "content",
        category: "troubleshooting",
        sourceType: "session",
      });

      expect(db.insert).toHaveBeenCalled();
      const insertCall = db._chainable.values.mock.calls[0]?.[0];
      expect(insertCall?.slug).toBe("fix-daikin-ftxm25-e7-error");
    });
  });

  describe("findById", () => {
    it("returns article when found", async () => {
      db._chainable.where.mockResolvedValue([createMockArticleRow()]);

      const result = await repo.findById("art_abc123456789012345");

      expect(db.select).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result!.id).toMatch(/^art_/);
    });

    it("returns null when article not found", async () => {
      db._chainable.where.mockResolvedValue([]);

      const result = await repo.findById("art_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByOrgId", () => {
    it("returns articles for an org", async () => {
      const rows = [
        createMockArticleRow({ id: "art_1" }),
        createMockArticleRow({ id: "art_2", title: "Another Article" }),
      ];
      db._chainable.limit.mockResolvedValue(rows);

      const results = await repo.findByOrgId("org_123");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });
  });

  describe("findByEquipment", () => {
    it("filters by orgId and brand", async () => {
      db._chainable.orderBy.mockResolvedValue([createMockArticleRow()]);

      const results = await repo.findByEquipment("org_123", "Daikin");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]!.equipmentBrand).toBe("Daikin");
    });
  });

  describe("update", () => {
    it("updates article and returns DTO", async () => {
      db._chainable.returning.mockResolvedValue([
        createMockArticleRow({ title: "Updated Title" }),
      ]);

      const result = await repo.update("art_abc123456789012345", {
        title: "Updated Title",
      });

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("updateEmbedding", () => {
    it("updates embedding fields", async () => {
      await repo.updateEmbedding("art_abc123", "emb_123", "gemini-embedding-001");

      expect(db.update).toHaveBeenCalled();
      const setCall = db._chainable.set.mock.calls[0]?.[0];
      expect(setCall?.embeddingId).toBe("emb_123");
      expect(setCall?.embeddingModel).toBe("gemini-embedding-001");
    });
  });
});
