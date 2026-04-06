import { describe, expect, it, vi, beforeEach } from "vitest";
import { KnowledgeLinkRepository } from "./knowledge-link.repository.js";

function createMockLinkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "lnk_abc123456789012345",
    sourceArticleId: "art_source123",
    targetArticleId: "art_target456",
    linkType: "reference" as const,
    createdAt: new Date("2026-04-05T10:00:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockLinkRow();
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockRow]),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
  };

  return {
    insert: vi.fn().mockReturnValue(chainable),
    select: vi.fn().mockReturnValue(chainable),
    delete: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
    _mockRow: mockRow,
  };
}

describe("KnowledgeLinkRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: KnowledgeLinkRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new KnowledgeLinkRepository(db as any);
  });

  describe("create", () => {
    it("inserts a link and returns KnowledgeLinkDTO", async () => {
      const result = await repo.create({
        sourceArticleId: "art_source123",
        targetArticleId: "art_target456",
        linkType: "reference",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^lnk_/);
      expect(result.linkType).toBe("reference");
    });
  });

  describe("findByArticleId", () => {
    it("returns links where article is source or target", async () => {
      const rows = [
        createMockLinkRow({ id: "lnk_1" }),
        createMockLinkRow({
          id: "lnk_2",
          sourceArticleId: "art_other",
          targetArticleId: "art_source123",
        }),
      ];
      db._chainable.where.mockResolvedValue(rows);

      const results = await repo.findByArticleId("art_source123");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no links exist", async () => {
      db._chainable.where.mockResolvedValue([]);

      const results = await repo.findByArticleId("art_nonexistent");

      expect(results).toEqual([]);
    });
  });

  describe("deleteByArticleId", () => {
    it("deletes links where article is source", async () => {
      await repo.deleteByArticleId("art_source123");

      expect(db.delete).toHaveBeenCalled();
    });
  });
});
