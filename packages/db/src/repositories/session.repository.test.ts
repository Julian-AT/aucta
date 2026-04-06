import { describe, expect, it, vi, beforeEach } from "vitest";
import { SessionRepository } from "./session.repository.js";

function createMockRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "ses_abc123456789012345",
    orgId: "org_xyz789",
    userId: "usr_123",
    status: "connecting" as const,
    startedAt: new Date("2026-04-04T10:00:00Z"),
    endedAt: null,
    durationMs: null,
    modelVersion: null,
    languageDetected: null,
    tokenCountInput: null,
    tokenCountOutput: null,
    feedbackRating: null,
    feedbackNote: null,
    summary: null,
    isAiGenerated: false,
    toolsUsed: null,
    metadata: null,
    createdAt: new Date("2026-04-04T10:00:00Z"),
    updatedAt: new Date("2026-04-04T10:00:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockRow();
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockRow]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([mockRow]),
    leftJoin: vi.fn().mockReturnThis(),
  };

  return {
    insert: vi.fn().mockReturnValue(chainable),
    select: vi.fn().mockReturnValue(chainable),
    update: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
    _mockRow: mockRow,
  };
}

describe("SessionRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SessionRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new SessionRepository(db as any);
  });

  describe("create", () => {
    it("inserts a new session and returns a SessionDTO", async () => {
      const result = await repo.create({
        orgId: "org_xyz789",
        userId: "usr_123",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^ses_/);
      expect(result.orgId).toBe("org_xyz789");
      expect(result.status).toBe("connecting");
    });

    it("accepts optional modelVersion", async () => {
      const result = await repo.create({
        orgId: "org_xyz789",
        userId: "usr_123",
        modelVersion: "gemini-2.5-flash",
      });

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns SessionDTO when found", async () => {
      db._chainable.where.mockResolvedValue([createMockRow()]);

      const result = await repo.findById("ses_abc123456789012345");

      expect(result).toBeDefined();
      expect(result?.id).toBe("ses_abc123456789012345");
      expect(result?.status).toBe("connecting");
    });

    it("returns null when not found", async () => {
      db._chainable.where.mockResolvedValue([]);

      const result = await repo.findById("ses_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateEnd", () => {
    it("updates end-of-session fields", async () => {
      db._chainable.where.mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          createMockRow({
            status: "completed",
            endedAt: new Date("2026-04-04T10:30:00Z"),
            durationMs: 1800000,
          }),
        ]),
      });

      const result = await repo.updateEnd("ses_abc123456789012345", {
        status: "completed",
        endedAt: new Date("2026-04-04T10:30:00Z"),
        durationMs: 1800000,
        languageDetected: "de",
        tokenCountInput: 5000,
        tokenCountOutput: 3000,
        toolsUsed: ["lookupErrorCode"],
      });

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("updateFeedback", () => {
    it("sets feedback rating and note", async () => {
      db._chainable.where.mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          createMockRow({
            feedbackRating: 4,
            feedbackNote: "Very helpful",
          }),
        ]),
      });

      const result = await repo.updateFeedback("ses_abc123456789012345", {
        rating: 4,
        note: "Very helpful",
      });

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("updateSummary", () => {
    it("sets summary and isAiGenerated flag", async () => {
      db._chainable.where.mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          createMockRow({
            summary: "Diagnosed compressor issue",
            isAiGenerated: true,
          }),
        ]),
      });

      const result = await repo.updateSummary(
        "ses_abc123456789012345",
        "Diagnosed compressor issue",
        true,
      );

      expect(db.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("findRecentByOrg", () => {
    it("returns sessions ordered by startedAt desc with limit", async () => {
      const rows = [
        createMockRow({ id: "ses_1", startedAt: new Date("2026-04-04T12:00:00Z") }),
        createMockRow({ id: "ses_2", startedAt: new Date("2026-04-04T10:00:00Z") }),
      ];
      db._chainable.limit.mockResolvedValue(rows);

      const results = await repo.findRecentByOrg("org_xyz789", 10);

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results[0]?.id).toBe("ses_1");
    });

    it("uses default limit of 20", async () => {
      db._chainable.limit.mockResolvedValue([]);

      await repo.findRecentByOrg("org_xyz789");

      expect(db._chainable.limit).toHaveBeenCalledWith(20);
    });
  });
});
