import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

import { compileArticle, type ArticleForCompilation } from "./article-compiler.js";

describe("article-compiler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const singleArticle: ArticleForCompilation = {
    id: "art_001",
    title: "Daikin FTXM25 E3 Error",
    contentMd: "## E3 Error\nOutdoor unit communication failure. Reset the outdoor unit PCB.",
    category: "troubleshooting",
    equipmentBrand: "Daikin",
    equipmentModel: "FTXM25",
    procedureType: "error_diagnosis",
    sourceSessionIds: ["ses_001"],
    version: 1,
  };

  const secondArticle: ArticleForCompilation = {
    id: "art_002",
    title: "Daikin FTXM25 E3 Recurring Issue",
    contentMd: "## E3 Recurring\nIf E3 recurs after PCB reset, check the wiring harness between indoor and outdoor units.",
    category: "troubleshooting",
    equipmentBrand: "Daikin",
    equipmentModel: "FTXM25",
    procedureType: "error_diagnosis",
    sourceSessionIds: ["ses_002"],
    version: 1,
  };

  it("throws when given zero articles", async () => {
    await expect(compileArticle([], "test-api-key")).rejects.toThrow("Cannot compile zero articles");
  });

  it("single article returns same content with generated summary", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "Daikin FTXM25 E3 error resolution involving PCB reset.",
    });

    const result = await compileArticle([singleArticle], "test-api-key");

    expect(result.title).toBe(singleArticle.title);
    expect(result.contentMd).toBe(singleArticle.contentMd);
    expect(result.summary).toBe("Daikin FTXM25 E3 error resolution involving PCB reset.");
    expect(result.sourceSessionIds).toEqual(["ses_001"]);
  });

  it("multiple articles calls Gemini with merge prompt and returns parsed result", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Daikin FTXM25 E3 Error: Complete Guide",
        summary: "Comprehensive guide to E3 error diagnosis and resolution.",
        contentMd: "## E3 Error\nReset PCB. If recurring, check wiring harness.",
        tags: ["E3", "Daikin", "FTXM25"],
      }),
    });

    const result = await compileArticle([singleArticle, secondArticle], "test-api-key");

    expect(result.title).toBe("Daikin FTXM25 E3 Error: Complete Guide");
    expect(result.summary).toBe("Comprehensive guide to E3 error diagnosis and resolution.");
    expect(result.contentMd).toContain("E3 Error");
    expect(result.tags).toEqual(["E3", "Daikin", "FTXM25"]);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("returns fallback when Gemini returns invalid JSON for multi-article compile", async () => {
    mockGenerateContent.mockResolvedValue({
      text: "This is not valid JSON",
    });

    const result = await compileArticle([singleArticle, secondArticle], "test-api-key");

    expect(result.title).toBe(singleArticle.title);
    expect(result.contentMd).toBe(singleArticle.contentMd);
    expect(result.summary).toBe("");
    expect(result.tags).toEqual([]);
  });

  it("deduplicates sourceSessionIds in merged result", async () => {
    const articleWithDuplicateSession: ArticleForCompilation = {
      ...secondArticle,
      sourceSessionIds: ["ses_001", "ses_003"],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Merged",
        summary: "Merged article",
        contentMd: "Merged content",
        tags: [],
      }),
    });

    const result = await compileArticle(
      [singleArticle, articleWithDuplicateSession],
      "test-api-key",
    );

    // ses_001 should appear only once
    const uniqueIds = [...new Set(result.sourceSessionIds)];
    expect(uniqueIds.length).toBe(result.sourceSessionIds.length);
    expect(result.sourceSessionIds).toContain("ses_001");
    expect(result.sourceSessionIds).toContain("ses_003");
  });

  it("includes equipment context in the merge prompt", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Merged",
        summary: "summary",
        contentMd: "content",
        tags: [],
      }),
    });

    await compileArticle([singleArticle, secondArticle], "test-api-key");

    const callArgs = mockGenerateContent.mock.calls[0]![0];
    expect(callArgs.contents).toContain("Daikin FTXM25");
  });
});
