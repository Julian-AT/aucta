import { describe, expect, it, vi, beforeEach } from "vitest";
import { KnowledgeVerificationRepository } from "./knowledge-verification.repository.js";

function createMockVerificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ver_abc123456789012345",
    articleId: "art_abc123456789012345",
    orgId: "org_123",
    reviewerId: "user_456",
    status: "pending" as const,
    reviewerNotes: null,
    reviewedAt: null,
    createdAt: new Date("2026-04-05T10:00:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockVerificationRow();
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockRow]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([mockRow]),
  };

  return {
    insert: vi.fn().mockReturnValue(chainable),
    select: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
    _mockRow: mockRow,
  };
}

describe("KnowledgeVerificationRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: KnowledgeVerificationRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new KnowledgeVerificationRepository(db as any);
  });

  describe("create", () => {
    it("inserts a pending verification without reviewedAt", async () => {
      const result = await repo.create({
        articleId: "art_abc123456789012345",
        orgId: "org_123",
        reviewerId: "user_456",
        status: "pending",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ver_/);
      expect(result.status).toBe("pending");
    });

    it("sets reviewedAt when status is approved", async () => {
      db._chainable.returning.mockResolvedValue([
        createMockVerificationRow({
          status: "approved",
          reviewedAt: new Date(),
        }),
      ]);

      await repo.create({
        articleId: "art_abc123456789012345",
        orgId: "org_123",
        reviewerId: "user_456",
        status: "approved",
        reviewerNotes: "Looks good",
      });

      expect(db.insert).toHaveBeenCalled();
      const insertCall = db._chainable.values.mock.calls[0]?.[0];
      expect(insertCall?.reviewedAt).toBeDefined();
    });
  });

  describe("findByArticleId", () => {
    it("returns verifications for an article", async () => {
      const rows = [
        createMockVerificationRow({ id: "ver_1" }),
        createMockVerificationRow({ id: "ver_2", status: "approved" }),
      ];
      db._chainable.orderBy.mockResolvedValue(rows);

      const results = await repo.findByArticleId("art_abc123456789012345");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no verifications exist", async () => {
      db._chainable.orderBy.mockResolvedValue([]);

      const results = await repo.findByArticleId("art_nonexistent");

      expect(results).toEqual([]);
    });
  });

  describe("findPendingByOrg", () => {
    it("returns pending verifications for an org", async () => {
      db._chainable.orderBy.mockResolvedValue([
        createMockVerificationRow(),
      ]);

      const results = await repo.findPendingByOrg("org_123");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0]!.status).toBe("pending");
    });
  });
});
