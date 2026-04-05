import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSearchKnowledgeBaseTool } from "./index.js";
import type { HybridSearchDeps } from "../../knowledge/retrieve/search.js";
import type { ToolContext } from "../../types.js";

// Mock the hybridSearch module
vi.mock("../../knowledge/retrieve/search.js", () => ({
  hybridSearch: vi.fn(),
}));

import { hybridSearch } from "../../knowledge/retrieve/search.js";

const mockHybridSearch = vi.mocked(hybridSearch);

const testContext: ToolContext = {
  orgId: "org_test123",
  userId: "usr_test456",
  sessionId: "ses_test789",
};

const mockDeps: HybridSearchDeps = {
  qdrantClient: {} as any,
  embeddingService: {} as any,
};

const sampleResults = [
  {
    id: "1",
    title: "Daikin Compressor Guide",
    summary: "Step-by-step guide",
    contentMd: "## Steps\n1. Recover refrigerant",
    confidenceLevel: "expert_approved" as const,
    equipmentBrand: "Daikin",
    equipmentModel: "FTXM25",
    procedureType: "replacement",
    category: "equipment" as const,
    score: 0.95,
    attribution: "Based on verified procedure",
  },
];

describe("searchKnowledgeBase tool", () => {
  let tool: ReturnType<typeof createSearchKnowledgeBaseTool>;

  beforeEach(() => {
    vi.clearAllMocks();
    tool = createSearchKnowledgeBaseTool(mockDeps);
  });

  it("has name 'searchKnowledgeBase'", () => {
    expect(tool.name).toBe("searchKnowledgeBase");
  });

  it("is read-only", () => {
    expect(tool.isReadOnly()).toBe(true);
  });

  it("returns found=true with articles when hybridSearch returns results", async () => {
    mockHybridSearch.mockResolvedValue(sampleResults);

    const result = await tool.call(
      { query: "compressor replacement" },
      testContext,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(true);
      if (result.data.found) {
        expect(result.data.articles).toHaveLength(1);
        expect(result.data.articles[0]).toMatchObject({
          title: "Daikin Compressor Guide",
          summary: "Step-by-step guide",
          content: "## Steps\n1. Recover refrigerant",
          confidenceLevel: "expert_approved",
          equipmentBrand: "Daikin",
          equipmentModel: "FTXM25",
          attribution: "Based on verified procedure",
        });
      }
    }
  });

  it("returns found=false with message when hybridSearch returns empty", async () => {
    mockHybridSearch.mockResolvedValue([]);

    const result = await tool.call({ query: "nonexistent" }, testContext);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.found).toBe(false);
      if (!result.data.found) {
        expect(result.data.message).toContain("No relevant knowledge articles");
      }
    }
  });

  it("passes context.orgId to hybridSearch options", async () => {
    mockHybridSearch.mockResolvedValue([]);

    await tool.call({ query: "test" }, testContext);

    expect(mockHybridSearch).toHaveBeenCalledWith(
      mockDeps,
      expect.objectContaining({ orgId: "org_test123" }),
    );
  });

  it("forwards equipmentBrand and equipmentModel to hybridSearch", async () => {
    mockHybridSearch.mockResolvedValue([]);

    await tool.call(
      {
        query: "test",
        equipmentBrand: "Mitsubishi Electric",
        equipmentModel: "MSZ-AP25",
      },
      testContext,
    );

    expect(mockHybridSearch).toHaveBeenCalledWith(
      mockDeps,
      expect.objectContaining({
        equipmentBrand: "Mitsubishi Electric",
        equipmentModel: "MSZ-AP25",
      }),
    );
  });

  it("validates input: accepts valid query", () => {
    const parsed = tool.validateInput({ query: "compressor replacement" });
    expect(parsed.query).toBe("compressor replacement");
  });

  it("validates input: rejects missing query", () => {
    expect(() => tool.validateInput({})).toThrow();
  });

  it("generates valid GeminiFunctionDeclaration", () => {
    const decl = tool.prompt();
    expect(decl.name).toBe("searchKnowledgeBase");
    expect(decl.description).toBeTruthy();
    expect(decl.parameters).toBeDefined();
  });
});
