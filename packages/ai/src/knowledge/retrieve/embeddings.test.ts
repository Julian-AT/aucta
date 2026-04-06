import { describe, expect, it, vi, beforeEach } from "vitest";
import { GeminiEmbeddingService } from "./embeddings.js";

const mockEmbedContent = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { embedContent: mockEmbedContent };
    },
  };
});

describe("GeminiEmbeddingService", () => {
  let service: GeminiEmbeddingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: new Array(3072).fill(0.1) }],
    });
    service = new GeminiEmbeddingService({ apiKey: "test-key" });
  });

  describe("embedDocument", () => {
    it("calls embedContent with RETRIEVAL_DOCUMENT taskType", async () => {
      const result = await service.embedDocument("Test document content");

      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: "gemini-embedding-001",
        contents: ["Test document content"],
        config: {
          outputDimensionality: 3072,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      });
      expect(result).toHaveLength(3072);
    });

    it("truncates text exceeding token limit", async () => {
      // MAX_TOKENS=2048, CHARS_PER_TOKEN=4, so max chars = 8192
      const longText = "a".repeat(10000);

      await service.embedDocument(longText);

      const calledContents = mockEmbedContent.mock.calls[0]![0].contents;
      expect(calledContents[0].length).toBe(8192);
    });

    it("does not truncate text within token limit", async () => {
      const shortText = "a".repeat(5000);

      await service.embedDocument(shortText);

      const calledContents = mockEmbedContent.mock.calls[0]![0].contents;
      expect(calledContents[0].length).toBe(5000);
    });
  });

  describe("embedQuery", () => {
    it("calls embedContent with RETRIEVAL_QUERY taskType", async () => {
      const result = await service.embedQuery("What is the E7 error?");

      expect(mockEmbedContent).toHaveBeenCalledWith({
        model: "gemini-embedding-001",
        contents: ["What is the E7 error?"],
        config: {
          outputDimensionality: 3072,
          taskType: "RETRIEVAL_QUERY",
        },
      });
      expect(result).toHaveLength(3072);
    });
  });
});
