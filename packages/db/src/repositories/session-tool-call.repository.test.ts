import { describe, expect, it, vi, beforeEach } from "vitest";
import { SessionToolCallRepository } from "./session-tool-call.repository.js";

function createMockToolCallRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tc_abc123456789012345",
    sessionId: "ses_abc123456789012345",
    toolName: "lookupErrorCode",
    input: { errorCode: "E01", manufacturer: "Daikin" },
    output: { found: true, description: "Compressor error" },
    durationMs: 250,
    success: true,
    errorMessage: null,
    createdAt: new Date("2026-04-04T10:10:00Z"),
    ...overrides,
  };
}

function createMockDb() {
  const mockRow = createMockToolCallRow();
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

describe("SessionToolCallRepository", () => {
  let db: ReturnType<typeof createMockDb>;
  let repo: SessionToolCallRepository;

  beforeEach(() => {
    db = createMockDb();
    repo = new SessionToolCallRepository(db as any);
  });

  describe("create", () => {
    it("inserts a tool call and returns SessionToolCallDTO", async () => {
      const result = await repo.create({
        sessionId: "ses_abc123456789012345",
        toolName: "lookupErrorCode",
        input: { errorCode: "E01" },
        output: { found: true },
        durationMs: 250,
        success: true,
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^tc_/);
      expect(result.toolName).toBe("lookupErrorCode");
      expect(result.success).toBe(true);
    });

    it("creates a failed tool call with error message", async () => {
      db._chainable.returning.mockResolvedValue([
        createMockToolCallRow({
          success: false,
          errorMessage: "Connection timeout",
          output: null,
        }),
      ]);

      const result = await repo.create({
        sessionId: "ses_abc123456789012345",
        toolName: "searchKnowledgeBase",
        input: { query: "refrigerant charge" },
        success: false,
        errorMessage: "Connection timeout",
      });

      expect(result).toBeDefined();
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe("findBySessionId", () => {
    it("returns tool calls for a session", async () => {
      const rows = [
        createMockToolCallRow({ id: "tc_1" }),
        createMockToolCallRow({ id: "tc_2", toolName: "searchKnowledgeBase" }),
      ];
      db._chainable.orderBy.mockResolvedValue(rows);

      const results = await repo.findBySessionId("ses_abc123456789012345");

      expect(db.select).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("returns empty array when no tool calls exist", async () => {
      db._chainable.orderBy.mockResolvedValue([]);

      const results = await repo.findBySessionId("ses_nonexistent");

      expect(results).toEqual([]);
    });
  });
});
