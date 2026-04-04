import { describe, expect, it, vi, beforeEach } from "vitest";
import { SessionFindingRepository } from "./session-finding.repository.js";

function createMockFindingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "fnd_abc123456789012345",
    sessionId: "ses_abc123456789012345",
    category: "safety" as const,
    description: "Refrigerant leak detected",
    severity: "high" as const,
    equipmentModel: "Daikin FTXM25",
    manufacturer: "Daikin",
    createdAt: new Date("2026-04-04T10:15:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockFindingRow();
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

describe("SessionFindingRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SessionFindingRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new SessionFindingRepository(db as any);
  });

  describe("create", () => {
    it("inserts a finding and returns SessionFindingDTO", async () => {
      const result = await repo.create({
        sessionId: "ses_abc123456789012345",
        category: "safety",
        description: "Refrigerant leak detected",
        severity: "high",
        equipmentModel: "Daikin FTXM25",
        manufacturer: "Daikin",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^fnd_/);
      expect(result.category).toBe("safety");
      expect(result.severity).toBe("high");
    });

    it("creates a finding without optional equipment fields", async () => {
      db._chainable.returning.mockResolvedValue([
        createMockFindingRow({ equipmentModel: null, manufacturer: null }),
      ]);

      const result = await repo.create({
        sessionId: "ses_abc123456789012345",
        category: "observation",
        description: "Unusual noise from outdoor unit",
        severity: "medium",
      });

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("findBySessionId", () => {
    it("returns findings for a session", async () => {
      const rows = [
        createMockFindingRow({ id: "fnd_1" }),
        createMockFindingRow({ id: "fnd_2", category: "maintenance" }),
      ];
      db._chainable.orderBy.mockResolvedValue(rows);

      const results = await repo.findBySessionId("ses_abc123456789012345");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no findings exist", async () => {
      db._chainable.orderBy.mockResolvedValue([]);

      const results = await repo.findBySessionId("ses_nonexistent");

      expect(results).toEqual([]);
    });
  });
});
