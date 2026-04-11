import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so they're available when vi.mock factories run
const { mockCreate, mockDispatchToolCalls } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockDispatchToolCalls: vi.fn(),
}));

// Hoist mock repository instances
const {
  mockSessionRepo,
  mockFindingRepo,
  mockToolCallRepo,
  mockInngestSend,
} = vi.hoisted(() => ({
  mockSessionRepo: {
    create: vi.fn(),
    findById: vi.fn(),
    updateEnd: vi.fn(),
    updateFeedback: vi.fn(),
    updateSummary: vi.fn(),
    findRecentByOrg: vi.fn(),
    findWithDetails: vi.fn(),
  },
  mockFindingRepo: {
    create: vi.fn(),
    findBySessionId: vi.fn(),
  },
  mockToolCallRepo: {
    create: vi.fn(),
    findBySessionId: vi.fn(),
  },
  mockInngestSend: vi.fn(),
}));

// Mock @google/genai before any imports that use it
vi.mock("@google/genai", () => {
  const MockGoogleGenAI = vi.fn(function (this: { authTokens: { create: typeof mockCreate } }) {
    this.authTokens = { create: mockCreate };
  });
  return {
    GoogleGenAI: MockGoogleGenAI,
    Modality: { AUDIO: "AUDIO", TEXT: "TEXT", IMAGE: "IMAGE", MODALITY_UNSPECIFIED: "MODALITY_UNSPECIFIED" },
  };
});

// Mock dispatchToolCalls from @aucta/ai while keeping real tool/prompt exports
vi.mock("@aucta/ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aucta/ai")>();
  return {
    ...actual,
    dispatchToolCalls: mockDispatchToolCalls,
  };
});

// Mock rate limiting to avoid Redis dependency
vi.mock("../middleware/rate-limit.js", () => ({
  tokenLimiter: {},
  createRateLimitMiddleware: () =>
    vi.fn().mockImplementation(async (opts: { next: () => Promise<unknown> }) => opts.next()),
}));

// Mock auth to avoid Better Auth dependency
vi.mock("@aucta/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Mock Redis to avoid Upstash dependency
vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn().mockReturnValue({}),
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: vi.fn().mockImplementation(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

// Mock repositories -- use class pattern so `new` works
vi.mock("@aucta/db/repositories/session.repository", () => ({
  SessionRepository: class {
    create = mockSessionRepo.create;
    findById = mockSessionRepo.findById;
    updateEnd = mockSessionRepo.updateEnd;
    updateFeedback = mockSessionRepo.updateFeedback;
    updateSummary = mockSessionRepo.updateSummary;
    findRecentByOrg = mockSessionRepo.findRecentByOrg;
    findWithDetails = mockSessionRepo.findWithDetails;
  },
}));

vi.mock("@aucta/db/repositories/session-finding.repository", () => ({
  SessionFindingRepository: class {
    create = mockFindingRepo.create;
    findBySessionId = mockFindingRepo.findBySessionId;
  },
}));

vi.mock("@aucta/db/repositories/session-tool-call.repository", () => ({
  SessionToolCallRepository: class {
    create = mockToolCallRepo.create;
    findBySessionId = mockToolCallRepo.findBySessionId;
  },
}));

// Mock db client
vi.mock("@aucta/db/client", () => ({
  db: {},
}));

// Mock Inngest client
vi.mock("../jobs/inngest-client.js", () => ({
  inngest: { send: mockInngestSend },
}));

import { sessionRouter } from "./session.router.js";

describe("sessionRouter", () => {
  const orgCaller = () =>
    sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      name: "ephemeral-token-value-abc123",
    });
  });

  it("has a createToken mutation", () => {
    expect(sessionRouter).toBeDefined();
    expect(sessionRouter.createToken).toBeDefined();
  });

  it("calls GoogleGenAI.authTokens.create with correct config", async () => {
    const { GoogleGenAI } = await import("@google/genai");

    process.env.GEMINI_API_KEY = "test-api-key";

    const caller = sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    const result = await caller.createToken();

    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-api-key",
        httpOptions: { apiVersion: "v1alpha" },
      }),
    );

    expect(mockCreate).toHaveBeenCalledWith({
      config: expect.objectContaining({
        uses: 1,
        liveConnectConstraints: expect.objectContaining({
          model: expect.any(String),
          config: expect.objectContaining({
            systemInstruction: expect.stringContaining("Aucta"),
            responseModalities: ["AUDIO"],
          }),
        }),
      }),
    });

    expect(result).toHaveProperty("token", "ephemeral-token-value-abc123");
    expect(result).toHaveProperty("model");
    expect(result).toHaveProperty("toolDeclarations");
    expect(result.toolDeclarations).toBeInstanceOf(Array);
    expect(result.toolDeclarations.length).toBeGreaterThanOrEqual(2);
  });

  it("returns toolDeclarations for both registered tools", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const caller = sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    const result = await caller.createToken();

    const toolNames = (result.toolDeclarations as Array<{ name: string }>).map(
      (d) => d.name,
    );
    expect(toolNames).toContain("lookupErrorCode");
    expect(toolNames).toContain("logFinding");
  });

  it("builds system prompt with all 3 prompt layers", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const caller = sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    await caller.createToken();

    const createCall = mockCreate.mock.calls[0]![0];
    const systemInstruction =
      createCall.config.liveConnectConstraints.config.systemInstruction;

    // Core role prompt
    expect(systemInstruction).toContain("Aucta");
    expect(systemInstruction).toContain("AI copilot");
    // Safety rules prompt
    expect(systemInstruction).toContain("SAFETY RULES");
    expect(systemInstruction).toContain("F-Gas");
    // HVAC expertise prompt
    expect(systemInstruction).toContain("HVAC DOMAIN KNOWLEDGE");
  });

  it("throws when GEMINI_API_KEY is not set", async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const caller = sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    await expect(caller.createToken()).rejects.toThrow(
      "GEMINI_API_KEY environment variable is not set",
    );

    process.env.GEMINI_API_KEY = originalKey;
  });

  it("uses ephemeral token uses: 1 and v1alpha API version", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const caller = sessionRouter.createCaller({
      session: {
        userId: "user_1",
        activeOrganizationId: "org_1",
      },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    await caller.createToken();

    const createCall = mockCreate.mock.calls[0]![0];
    expect(createCall.config.uses).toBe(1);

    const { GoogleGenAI } = await import("@google/genai");
    expect(GoogleGenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOptions: { apiVersion: "v1alpha" },
      }),
    );
  });

  it("includes tool declarations in liveConnectConstraints config", async () => {
    process.env.GEMINI_API_KEY = "test-api-key";

    const caller = sessionRouter.createCaller({
      session: { userId: "user_1", activeOrganizationId: "org_1" },
      headers: new Headers(),
      ip: "127.0.0.1",
    });

    await caller.createToken();

    const createCall = mockCreate.mock.calls[0]![0];
    const config = createCall.config.liveConnectConstraints.config;

    expect(config.tools).toBeDefined();
    expect(config.tools).toBeInstanceOf(Array);
    expect(config.tools).toHaveLength(1);
    expect(config.tools[0].functionDeclarations).toBeInstanceOf(Array);
    expect(config.tools[0].functionDeclarations.length).toBeGreaterThanOrEqual(2);

    const toolNames = config.tools[0].functionDeclarations.map(
      (d: { name: string }) => d.name,
    );
    expect(toolNames).toContain("lookupErrorCode");
    expect(toolNames).toContain("logFinding");
  });

  describe("dispatchToolCalls", () => {
    beforeEach(() => {
      mockDispatchToolCalls.mockReset();
    });

    it("accepts valid functionCalls array and returns functionResponses", async () => {
      mockDispatchToolCalls.mockResolvedValue({
        functionResponses: [
          {
            id: "call_1",
            name: "lookupErrorCode",
            response: { found: true, manufacturer: "Daikin", code: "U0" },
          },
        ],
      });

      const caller = orgCaller();
      const result = await caller.dispatchToolCalls({
        functionCalls: [
          { id: "call_1", name: "lookupErrorCode", args: { code: "U0" } },
        ],
      });

      expect(result.functionResponses).toHaveLength(1);
      expect(result.functionResponses[0]!.id).toBe("call_1");
      expect(result.functionResponses[0]!.name).toBe("lookupErrorCode");
    });

    it("calls dispatchToolCalls with correct context including orgId", async () => {
      mockDispatchToolCalls.mockResolvedValue({
        functionResponses: [],
      });

      const caller = orgCaller();
      await caller.dispatchToolCalls({
        functionCalls: [
          { id: "call_1", name: "lookupErrorCode", args: { code: "E1" } },
        ],
      });

      expect(mockDispatchToolCalls).toHaveBeenCalledWith(
        expect.objectContaining({
          functionCalls: [
            expect.objectContaining({ id: "call_1", name: "lookupErrorCode" }),
          ],
        }),
        expect.anything(),
        expect.objectContaining({
          orgId: "org_1",
          userId: "user_1",
          sessionId: "live",
        }),
      );
    });

    it("passes through tool responses including errors for unknown tools", async () => {
      mockDispatchToolCalls.mockResolvedValue({
        functionResponses: [
          {
            id: "call_2",
            name: "unknownTool",
            response: { error: "Unknown tool: unknownTool", code: "TOOL_NOT_FOUND" },
          },
        ],
      });

      const caller = orgCaller();
      const result = await caller.dispatchToolCalls({
        functionCalls: [
          { id: "call_2", name: "unknownTool", args: {} },
        ],
      });

      expect(result.functionResponses[0]!.response).toEqual(
        expect.objectContaining({ code: "TOOL_NOT_FOUND" }),
      );
    });
  });

  describe("createSession", () => {
    it("creates a session with status connecting and returns sessionId", async () => {
      mockSessionRepo.create.mockResolvedValue({
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "connecting",
        startedAt: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = orgCaller();
      const result = await caller.createSession({});

      expect(result).toHaveProperty("sessionId", "ses_abc123");
      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org_1",
          userId: "user_1",
        }),
      );
    });

    it("passes modelVersion when provided", async () => {
      mockSessionRepo.create.mockResolvedValue({
        id: "ses_abc456",
        orgId: "org_1",
        userId: "user_1",
        status: "connecting",
        startedAt: new Date(),
        endedAt: null,
        durationMs: null,
        modelVersion: "gemini-3.1-flash-live-preview",
        languageDetected: null,
        tokenCountInput: null,
        tokenCountOutput: null,
        feedbackRating: null,
        feedbackNote: null,
        summary: null,
        isAiGenerated: false,
        toolsUsed: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = orgCaller();
      await caller.createSession({ modelVersion: "gemini-3.1-flash-live-preview" });

      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          modelVersion: "gemini-3.1-flash-live-preview",
        }),
      );
    });
  });

  describe("endSession", () => {
    it("updates session and sends Inngest event", async () => {
      const updatedSession = {
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "completed" as const,
        startedAt: new Date(),
        endedAt: new Date(),
        durationMs: 60000,
        modelVersion: null,
        languageDetected: "en",
        tokenCountInput: 1000,
        tokenCountOutput: 500,
        feedbackRating: null,
        feedbackNote: null,
        summary: null,
        isAiGenerated: false,
        toolsUsed: ["lookupErrorCode"],
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSessionRepo.updateEnd.mockResolvedValue(updatedSession);
      mockInngestSend.mockResolvedValue(undefined);

      const caller = orgCaller();
      const result = await caller.endSession({
        sessionId: "ses_abc123",
        status: "completed",
        durationMs: 60000,
        languageDetected: "en",
        tokenCountInput: 1000,
        tokenCountOutput: 500,
        toolsUsed: ["lookupErrorCode"],
      });

      expect(result.id).toBe("ses_abc123");
      expect(mockSessionRepo.updateEnd).toHaveBeenCalledWith(
        "ses_abc123",
        expect.objectContaining({
          status: "completed",
          durationMs: 60000,
        }),
      );
      expect(mockInngestSend).toHaveBeenCalledWith({
        name: "session/ended",
        data: { sessionId: "ses_abc123" },
      });
    });
  });

  describe("addFinding", () => {
    it("persists a finding row", async () => {
      const finding = {
        id: "fnd_abc",
        sessionId: "ses_abc123",
        category: "safety" as const,
        description: "Refrigerant leak detected",
        severity: "high" as const,
        equipmentModel: "FTXM25",
        manufacturer: "Daikin",
        createdAt: new Date(),
      };
      mockFindingRepo.create.mockResolvedValue(finding);

      const caller = orgCaller();
      const result = await caller.addFinding({
        sessionId: "ses_abc123",
        category: "safety",
        description: "Refrigerant leak detected",
        severity: "high",
        equipmentModel: "FTXM25",
        manufacturer: "Daikin",
      });

      expect(result.id).toBe("fnd_abc");
      expect(mockFindingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "ses_abc123",
          category: "safety",
          severity: "high",
        }),
      );
    });
  });

  describe("addToolCall", () => {
    it("persists a tool call row", async () => {
      const toolCall = {
        id: "tc_abc",
        sessionId: "ses_abc123",
        toolName: "lookupErrorCode",
        input: { code: "U0" },
        output: { found: true },
        durationMs: 150,
        success: true,
        errorMessage: null,
        createdAt: new Date(),
      };
      mockToolCallRepo.create.mockResolvedValue(toolCall);

      const caller = orgCaller();
      const result = await caller.addToolCall({
        sessionId: "ses_abc123",
        toolName: "lookupErrorCode",
        input: { code: "U0" },
        output: { found: true },
        durationMs: 150,
        success: true,
      });

      expect(result.id).toBe("tc_abc");
      expect(mockToolCallRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "ses_abc123",
          toolName: "lookupErrorCode",
          success: true,
        }),
      );
    });
  });

  describe("submitFeedback", () => {
    it("updates session with rating and note", async () => {
      const updatedSession = {
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "completed" as const,
        startedAt: new Date(),
        endedAt: new Date(),
        durationMs: 60000,
        modelVersion: null,
        languageDetected: null,
        tokenCountInput: null,
        tokenCountOutput: null,
        feedbackRating: 4,
        feedbackNote: "Very helpful!",
        summary: null,
        isAiGenerated: false,
        toolsUsed: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSessionRepo.updateFeedback.mockResolvedValue(updatedSession);

      const caller = orgCaller();
      const result = await caller.submitFeedback({
        sessionId: "ses_abc123",
        rating: 4,
        note: "Very helpful!",
      });

      expect(result.feedbackRating).toBe(4);
      expect(mockSessionRepo.updateFeedback).toHaveBeenCalledWith(
        "ses_abc123",
        { rating: 4, note: "Very helpful!" },
      );
    });

    it("rejects rating outside 1-5 range", async () => {
      const caller = orgCaller();
      await expect(
        caller.submitFeedback({ sessionId: "ses_abc123", rating: 0 }),
      ).rejects.toThrow();
      await expect(
        caller.submitFeedback({ sessionId: "ses_abc123", rating: 6 }),
      ).rejects.toThrow();
    });
  });

  describe("getSession", () => {
    it("returns session by id", async () => {
      const session = {
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "completed" as const,
        startedAt: new Date(),
        endedAt: new Date(),
        durationMs: 60000,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSessionRepo.findById.mockResolvedValue(session);

      const caller = orgCaller();
      const result = await caller.getSession({ sessionId: "ses_abc123" });

      expect(result.id).toBe("ses_abc123");
    });

    it("throws NOT_FOUND for missing session", async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const caller = orgCaller();
      await expect(
        caller.getSession({ sessionId: "ses_nonexistent" }),
      ).rejects.toThrow("Session ses_nonexistent not found");
    });
  });

  describe("getRecentSessions", () => {
    it("returns last 20 sessions for the org", async () => {
      const sessions = [
        {
          id: "ses_1",
          orgId: "org_1",
          userId: "user_1",
          status: "completed" as const,
          startedAt: new Date(),
          endedAt: new Date(),
          durationMs: 30000,
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
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockSessionRepo.findRecentByOrg.mockResolvedValue(sessions);

      const caller = orgCaller();
      const result = await caller.getRecentSessions();

      expect(result).toHaveLength(1);
      expect(mockSessionRepo.findRecentByOrg).toHaveBeenCalledWith("org_1", 20);
    });
  });

  describe("getSessionSummary", () => {
    it("returns summary and isAiGenerated flag", async () => {
      mockSessionRepo.findById.mockResolvedValue({
        id: "ses_abc123",
        orgId: "org_1",
        userId: "user_1",
        status: "completed" as const,
        startedAt: new Date(),
        endedAt: new Date(),
        durationMs: 60000,
        modelVersion: null,
        languageDetected: null,
        tokenCountInput: null,
        tokenCountOutput: null,
        feedbackRating: null,
        feedbackNote: null,
        summary: "## Session Summary\n\nTest summary",
        isAiGenerated: true,
        toolsUsed: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const caller = orgCaller();
      const result = await caller.getSessionSummary({ sessionId: "ses_abc123" });

      expect(result).toEqual({
        summary: "## Session Summary\n\nTest summary",
        isAiGenerated: true,
      });
    });

    it("throws NOT_FOUND for missing session", async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const caller = orgCaller();
      await expect(
        caller.getSessionSummary({ sessionId: "ses_nonexistent" }),
      ).rejects.toThrow("Session ses_nonexistent not found");
    });
  });
});
