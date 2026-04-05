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

import {
  extractLearnings,
  type SessionIngestionInput,
} from "./session-ingester.js";

describe("session-ingester", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("extractLearnings", () => {
    const baseInput: SessionIngestionInput = {
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        languageDetected: "en",
        summary: "Diagnosed E3 error on Daikin FTXM25",
      },
      findings: [
        {
          category: "troubleshooting",
          description: "E3 error code indicates outdoor unit communication failure",
          severity: "medium",
          equipmentModel: "FTXM25",
          manufacturer: "Daikin",
        },
      ],
      toolCalls: [
        { toolName: "lookupErrorCode", success: true },
      ],
    };

    it("returns empty array when no findings and no summary", async () => {
      const input: SessionIngestionInput = {
        session: {
          id: "ses_empty",
          orgId: "org_1",
          languageDetected: null,
          summary: null,
        },
        findings: [],
        toolCalls: [],
      };

      const result = await extractLearnings(input, "test-api-key");
      expect(result).toEqual([]);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it("returns parsed candidates when Gemini returns valid JSON array", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify([
          {
            title: "Daikin FTXM25 E3 Error Code Resolution",
            contentMd: "## E3 Error\nOutdoor unit communication failure...",
            category: "troubleshooting",
            equipmentBrand: "Daikin",
            equipmentModel: "FTXM25",
            procedureType: "error_diagnosis",
            tags: ["error-code", "E3", "outdoor-unit"],
          },
        ]),
      });

      const result = await extractLearnings(baseInput, "test-api-key");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: "Daikin FTXM25 E3 Error Code Resolution",
        category: "troubleshooting",
        equipmentBrand: "Daikin",
        equipmentModel: "FTXM25",
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when Gemini returns invalid JSON", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "This is not valid JSON at all",
      });

      const result = await extractLearnings(baseInput, "test-api-key");
      expect(result).toEqual([]);
    });

    it("filters out malformed candidates missing title or contentMd", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify([
          {
            title: "Valid Article",
            contentMd: "Valid content",
            category: "equipment",
          },
          {
            // Missing title
            contentMd: "Some content",
            category: "safety",
          },
          {
            title: "Missing Content",
            // Missing contentMd
            category: "procedure",
          },
        ]),
      });

      const result = await extractLearnings(baseInput, "test-api-key");
      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe("Valid Article");
    });

    it("returns empty array when Gemini returns non-array JSON", async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ title: "Not an array" }),
      });

      const result = await extractLearnings(baseInput, "test-api-key");
      expect(result).toEqual([]);
    });

    it("returns empty array when Gemini text is undefined", async () => {
      mockGenerateContent.mockResolvedValue({ text: undefined });

      const result = await extractLearnings(baseInput, "test-api-key");
      expect(result).toEqual([]);
    });

    it("includes findings and summary in the prompt", async () => {
      mockGenerateContent.mockResolvedValue({ text: "[]" });

      await extractLearnings(baseInput, "test-api-key");

      const callArgs = mockGenerateContent.mock.calls[0]![0];
      expect(callArgs.contents).toContain("Diagnosed E3 error on Daikin FTXM25");
      expect(callArgs.contents).toContain("E3 error code indicates outdoor unit communication failure");
      expect(callArgs.contents).toContain("lookupErrorCode");
    });
  });
});
