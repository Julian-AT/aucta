import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock functions so they're available when vi.mock factories run
const { mockCreate, mockDispatchToolCalls } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockDispatchToolCalls: vi.fn(),
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

import { sessionRouter } from "./session.router.js";

describe("sessionRouter", () => {
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

    const toolNames = result.toolDeclarations.map(
      (d: { name: string }) => d.name,
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

  describe("dispatchToolCalls", () => {
    const orgCaller = () =>
      sessionRouter.createCaller({
        session: {
          userId: "user_1",
          activeOrganizationId: "org_1",
          user: { id: "user_1" },
        },
        headers: new Headers(),
        ip: "127.0.0.1",
      });

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
});
