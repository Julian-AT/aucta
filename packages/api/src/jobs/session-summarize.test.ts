import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindWithDetails,
  mockUpdateSummary,
  mockGenerateContent,
} = vi.hoisted(() => ({
  mockFindWithDetails: vi.fn(),
  mockUpdateSummary: vi.fn(),
  mockGenerateContent: vi.fn(),
}));

// Mock repository classes
vi.mock("@aucta/db/repositories/session.repository", () => ({
  SessionRepository: class {
    findWithDetails = mockFindWithDetails;
    updateSummary = mockUpdateSummary;
  },
}));

// Mock db client
vi.mock("@aucta/db/client", () => ({
  db: {},
}));

// Mock @google/genai
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

import { generateSessionSummary } from "./session-summarize.js";

describe("session-summarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  describe("generateSessionSummary", () => {
    const mockSessionData = {
      session: {
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "completed" as const,
        startedAt: new Date("2026-04-04T10:00:00Z"),
        endedAt: new Date("2026-04-04T10:15:00Z"),
        durationMs: 900000,
        modelVersion: "gemini-3.1-flash-live-preview",
        languageDetected: "en",
        tokenCountInput: 5000,
        tokenCountOutput: 2000,
        feedbackRating: null,
        feedbackNote: null,
        summary: null,
        isAiGenerated: false,
        toolsUsed: ["lookupErrorCode", "logFinding"],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      findings: [
        {
          id: "fnd_1",
          sessionId: "ses_abc123",
          category: "safety" as const,
          description: "Refrigerant leak detected at service valve",
          severity: "high" as const,
          equipmentModel: "FTXM25",
          manufacturer: "Daikin",
          createdAt: new Date(),
        },
      ],
      toolCalls: [
        {
          id: "tc_1",
          sessionId: "ses_abc123",
          toolName: "lookupErrorCode",
          input: { code: "U0" },
          output: { found: true, manufacturer: "Daikin" },
          durationMs: 150,
          success: true,
          errorMessage: null,
          createdAt: new Date(),
        },
      ],
    };

    it("calls Gemini with a prompt containing required sections", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "### Problem Described\n- Test\n### Steps Taken\n- Test\n### Findings Logged\n- Test\n### Recommendations\n- Test",
      });

      await generateSessionSummary(mockSessionData);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateContent.mock.calls[0]!;
      const contents = callArgs[0].contents;

      expect(contents).toContain("Problem Described");
      expect(contents).toContain("Steps Taken");
      expect(contents).toContain("Findings Logged");
      expect(contents).toContain("Recommendations");
    });

    it("includes session metadata in the prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "summary text",
      });

      await generateSessionSummary(mockSessionData);

      const contents = mockGenerateContent.mock.calls[0]![0].contents;
      expect(contents).toContain("15"); // 15 minutes duration
      expect(contents).toContain("en"); // language
      expect(contents).toContain("lookupErrorCode"); // tool used
    });

    it("includes findings in the prompt", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "summary text",
      });

      await generateSessionSummary(mockSessionData);

      const contents = mockGenerateContent.mock.calls[0]![0].contents;
      expect(contents).toContain("Refrigerant leak");
      expect(contents).toContain("safety");
      expect(contents).toContain("HIGH");
    });

    it("returns generated text", async () => {
      mockGenerateContent.mockResolvedValue({
        text: "### Problem Described\n- HVAC unit not cooling",
      });

      const result = await generateSessionSummary(mockSessionData);
      expect(result).toBe("### Problem Described\n- HVAC unit not cooling");
    });

    it("returns empty string when text is undefined", async () => {
      mockGenerateContent.mockResolvedValue({ text: undefined });

      const result = await generateSessionSummary(mockSessionData);
      expect(result).toBe("");
    });

    it("uses configurable model from env", async () => {
      process.env.GEMINI_SUMMARY_MODEL = "gemini-2.5-pro-custom";
      mockGenerateContent.mockResolvedValue({ text: "summary" });

      await generateSessionSummary(mockSessionData);

      const callArgs = mockGenerateContent.mock.calls[0]![0];
      expect(callArgs.model).toBe("gemini-2.5-pro-custom");

      delete process.env.GEMINI_SUMMARY_MODEL;
    });
  });
});
