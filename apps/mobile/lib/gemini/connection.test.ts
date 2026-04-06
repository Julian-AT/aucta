import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockWebSocket } from "./__mocks__/websocket";
import { GeminiConnection } from "./connection";
import type { GeminiConnectionDeps, GeminiConnectionConfig } from "./connection";
import { GEMINI_WS_URL, AUDIO_INPUT_MIME } from "./protocol";

// Capture constructed MockWebSocket instances
let lastCreatedWs: MockWebSocket;

vi.stubGlobal(
  "WebSocket",
  class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      lastCreatedWs = this;
    }

    // Expose static constants needed for readyState checks
    static override CONNECTING = 0;
    static override OPEN = 1;
    static override CLOSING = 2;
    static override CLOSED = 3;
  },
);

function createMockDeps(): GeminiConnectionDeps {
  return {
    onAudioData: vi.fn(),
    onToolCall: vi.fn(),
    onTurnComplete: vi.fn(),
    onResumptionUpdate: vi.fn(),
    onGoAway: vi.fn(),
    onSetupComplete: vi.fn(),
    onDisconnect: vi.fn(),
    onError: vi.fn(),
  };
}

function createDefaultConfig(overrides?: Partial<GeminiConnectionConfig>): GeminiConnectionConfig {
  return {
    token: "test-ephemeral-token",
    model: "gemini-2.5-flash-live-preview",
    ...overrides,
  };
}

describe("GeminiConnection", () => {
  let deps: GeminiConnectionDeps;
  let connection: GeminiConnection;

  beforeEach(() => {
    deps = createMockDeps();
    connection = new GeminiConnection(deps);
  });

  describe("connect()", () => {
    it("creates WebSocket with correct URL including access_token", () => {
      const config = createDefaultConfig();
      connection.connect(config);

      expect(lastCreatedWs.url).toBe(
        `${GEMINI_WS_URL}?access_token=${config.token}`,
      );
    });

    it("sends setup message with model and responseModalities on open", () => {
      const config = createDefaultConfig();
      connection.connect(config);
      lastCreatedWs.simulateOpen();

      expect(lastCreatedWs.sentMessages).toHaveLength(1);
      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.model).toBe(`models/${config.model}`);
      expect(setup.config.responseModalities).toEqual(["AUDIO"]);
    });

    it("includes contextWindowCompression with slidingWindow in setup", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.contextWindowCompression).toEqual({
        slidingWindow: {},
      });
    });

    it("includes sessionResumption with handle when provided", () => {
      connection.connect(
        createDefaultConfig({ resumptionHandle: "resume-handle-123" }),
      );
      lastCreatedWs.simulateOpen();

      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.sessionResumption).toEqual({
        handle: "resume-handle-123",
      });
    });

    it("includes empty sessionResumption on first connect (no handle)", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.sessionResumption).toEqual({});
    });

    it("includes tools with functionDeclarations when provided", () => {
      const toolDeclarations = [
        {
          name: "lookupErrorCode",
          description: "Look up HVAC error codes",
          parameters: { type: "object", properties: {} },
        },
      ];
      connection.connect(createDefaultConfig({ toolDeclarations }));
      lastCreatedWs.simulateOpen();

      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.tools).toEqual([
        { functionDeclarations: toolDeclarations },
      ]);
    });

    it("omits tools from setup when no declarations provided", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      const setup = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setup.config.tools).toBeUndefined();
    });
  });

  describe("message handling", () => {
    beforeEach(() => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();
    });

    it("calls onSetupComplete on setupComplete message", () => {
      lastCreatedWs.simulateMessage({ setupComplete: {} });
      expect(deps.onSetupComplete).toHaveBeenCalledOnce();
    });

    it("calls onAudioData with base64 data from serverContent modelTurn inlineData", () => {
      lastCreatedWs.simulateMessage({
        serverContent: {
          modelTurn: {
            parts: [
              { inlineData: { data: "base64audio==", mimeType: "audio/pcm;rate=24000" } },
            ],
          },
        },
      });
      expect(deps.onAudioData).toHaveBeenCalledWith("base64audio==");
    });

    it("calls onAudioData for each part with inlineData", () => {
      lastCreatedWs.simulateMessage({
        serverContent: {
          modelTurn: {
            parts: [
              { inlineData: { data: "chunk1", mimeType: "audio/pcm;rate=24000" } },
              { inlineData: { data: "chunk2", mimeType: "audio/pcm;rate=24000" } },
            ],
          },
        },
      });
      expect(deps.onAudioData).toHaveBeenCalledTimes(2);
      expect(deps.onAudioData).toHaveBeenCalledWith("chunk1");
      expect(deps.onAudioData).toHaveBeenCalledWith("chunk2");
    });

    it("calls onTurnComplete on serverContent.turnComplete", () => {
      lastCreatedWs.simulateMessage({
        serverContent: { turnComplete: true },
      });
      expect(deps.onTurnComplete).toHaveBeenCalledOnce();
    });

    it("calls onToolCall with functionCalls array", () => {
      const toolCallMsg = {
        toolCall: {
          functionCalls: [
            { id: "call-1", name: "lookupErrorCode", args: { code: "E01" } },
          ],
        },
      };
      lastCreatedWs.simulateMessage(toolCallMsg);
      expect(deps.onToolCall).toHaveBeenCalledWith(toolCallMsg.toolCall);
    });

    it("calls onResumptionUpdate with handle when resumable", () => {
      lastCreatedWs.simulateMessage({
        sessionResumptionUpdate: {
          resumable: true,
          newHandle: "new-handle-456",
        },
      });
      expect(deps.onResumptionUpdate).toHaveBeenCalledWith("new-handle-456");
    });

    it("does not call onResumptionUpdate when not resumable", () => {
      lastCreatedWs.simulateMessage({
        sessionResumptionUpdate: {
          resumable: false,
        },
      });
      expect(deps.onResumptionUpdate).not.toHaveBeenCalled();
    });

    it("calls onGoAway on goAway message", () => {
      lastCreatedWs.simulateMessage({
        goAway: { timeLeft: "30s" },
      });
      expect(deps.onGoAway).toHaveBeenCalledWith("30s");
    });

    it("calls onGoAway with undefined timeLeft", () => {
      lastCreatedWs.simulateMessage({ goAway: {} });
      expect(deps.onGoAway).toHaveBeenCalledWith(undefined);
    });
  });

  describe("sendAudio()", () => {
    it("sends correct realtimeInput.audio message format", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      connection.sendAudio("pcm-base64-data");

      const sent = JSON.parse(lastCreatedWs.sentMessages[1]); // [0] is setup
      expect(sent).toEqual({
        realtimeInput: {
          audio: {
            data: "pcm-base64-data",
            mimeType: AUDIO_INPUT_MIME,
          },
        },
      });
    });

    it("is a no-op when WebSocket is not OPEN", () => {
      connection.connect(createDefaultConfig());
      // Do NOT simulateOpen() -- ws is CONNECTING

      connection.sendAudio("pcm-base64-data");
      expect(lastCreatedWs.sentMessages).toHaveLength(0);
    });
  });

  describe("sendVideo()", () => {
    it("sends correct realtimeInput.video message format", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      connection.sendVideo("jpeg-base64-data");

      const sent = JSON.parse(lastCreatedWs.sentMessages[1]);
      expect(sent).toEqual({
        realtimeInput: {
          video: {
            data: "jpeg-base64-data",
            mimeType: "image/jpeg",
          },
        },
      });
    });
  });

  describe("sendToolResponse()", () => {
    it("sends correct toolResponse message format", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      const responses = [
        { id: "call-1", name: "lookupErrorCode", response: { found: true, code: "E01" } },
      ];
      connection.sendToolResponse(responses);

      const sent = JSON.parse(lastCreatedWs.sentMessages[1]);
      expect(sent).toEqual({
        toolResponse: { functionResponses: responses },
      });
    });
  });

  describe("close()", () => {
    it("closes WebSocket cleanly", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      connection.close();

      expect(lastCreatedWs.readyState).toBe(MockWebSocket.CLOSED);
    });

    it("does not call onDisconnect for intentional close", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      connection.close();

      expect(deps.onDisconnect).not.toHaveBeenCalled();
    });
  });

  describe("unexpected disconnect", () => {
    it("calls onDisconnect on unexpected WebSocket close", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      lastCreatedWs.simulateClose(1006, "abnormal closure");

      expect(deps.onDisconnect).toHaveBeenCalledWith(1006, "abnormal closure");
    });

    it("does not call onDisconnect for normal close code 1000", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();

      lastCreatedWs.simulateClose(1000, "normal");

      expect(deps.onDisconnect).not.toHaveBeenCalled();
    });
  });

  describe("isConnected()", () => {
    it("returns false before connect", () => {
      expect(connection.isConnected()).toBe(false);
    });

    it("returns true after WebSocket opens", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();
      expect(connection.isConnected()).toBe(true);
    });

    it("returns false after close", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateOpen();
      connection.close();
      expect(connection.isConnected()).toBe(false);
    });
  });

  describe("error handling", () => {
    it("calls onError on WebSocket error", () => {
      connection.connect(createDefaultConfig());
      lastCreatedWs.simulateError("Connection failed");

      expect(deps.onError).toHaveBeenCalledWith("Connection failed");
    });
  });
});
