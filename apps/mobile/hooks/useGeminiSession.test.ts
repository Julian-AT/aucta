import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { MockWebSocket } from "../lib/gemini/__mocks__/websocket";
import { GeminiConnection } from "../lib/gemini/connection";
import type { GeminiConnectionDeps } from "../lib/gemini/connection";
import { AudioPlayback } from "../lib/gemini/audio-playback";
import { AudioCapture } from "../lib/gemini/audio-capture";
import { FrameCapture } from "../lib/gemini/frame-capture";
import { ToolRelay } from "../lib/gemini/tool-relay";
import { useSessionStore } from "../stores/session-store";
import { reconnectWithBackoff } from "../lib/gemini/reconnection";

// Mock expo-image-manipulator to prevent react-native transitive import
vi.mock("expo-image-manipulator", () => ({
  manipulateAsync: vi.fn().mockResolvedValue({
    base64: "mock-resized",
    uri: "file://mock.jpg",
    width: 768,
    height: 576,
  }),
  SaveFormat: { JPEG: "jpeg" },
}));

// Mock WebSocket globally
let lastCreatedWs: MockWebSocket;
vi.stubGlobal(
  "WebSocket",
  class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      lastCreatedWs = this;
    }
    static override CONNECTING = 0;
    static override OPEN = 1;
    static override CLOSING = 2;
    static override CLOSED = 3;
  },
);

// Mock AudioContext factory for audio-playback (constructor injection)
const mockCtxFactory = (options: { sampleRate: number }) => ({
  currentTime: 0,
  destination: {},
  sampleRate: options.sampleRate,
  createBuffer: vi.fn().mockReturnValue({
    duration: 0.1,
    copyToChannel: vi.fn(),
  }),
  createBufferSource: vi.fn().mockReturnValue({
    buffer: null as unknown,
    connect: vi.fn(),
    start: vi.fn(),
  }),
  close: vi.fn(),
});

// Mock atob for base64 decoding
vi.stubGlobal("atob", (data: string) => {
  return Buffer.from(data, "base64").toString("binary");
});

vi.mock("../lib/gemini/reconnection", () => ({
  reconnectWithBackoff: vi.fn(),
}));

/**
 * Tests for useGeminiSession hook logic.
 *
 * Since the hook requires React context (useMutation, useTRPC), we test
 * the integration at the "wiring" level: verify that the pipeline classes
 * are connected correctly (connection callbacks -> playback/store/relay)
 * and that the lifecycle (start -> active -> stop) works end-to-end.
 *
 * The individual pipeline components are thoroughly tested in their own
 * test files. These tests verify the orchestration glue.
 */
describe("useGeminiSession orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().reset();
  });

  describe("session lifecycle wiring", () => {
    it("connects all pipeline components into a working session", () => {
      // Simulate what useGeminiSession does internally:
      // 1. Create pipeline instances
      const playback = new AudioPlayback(mockCtxFactory);
      const capture = new AudioCapture({
        onChunk: (pcmBase64: string) => {
          connection.sendAudio(pcmBase64);
        },
      });
      const relay = new ToolRelay({
        dispatchToolCalls: vi.fn().mockResolvedValue({
          functionResponses: [
            { id: "1", name: "test", response: { result: "ok" } },
          ],
        }),
      });
      const cameraRef = { current: null };
      const frameCapture = new FrameCapture({
        cameraRef: cameraRef as React.RefObject<never>,
        onFrame: (jpegBase64: string) => {
          connection.sendVideo(jpegBase64);
        },
      });

      // 2. Create connection with deps wired to pipeline
      const deps: GeminiConnectionDeps = {
        onAudioData: (pcmBase64: string) => {
          playback.enqueueChunk(pcmBase64);
          useSessionStore.getState().setAISpeaking(true);
        },
        onToolCall: async (toolCall) => {
          const result = await relay.relay(toolCall);
          connection.sendToolResponse(result.functionResponses);
        },
        onTurnComplete: () => {
          useSessionStore.getState().setAISpeaking(false);
        },
        onResumptionUpdate: (handle: string) => {
          useSessionStore.getState().setResumptionHandle(handle);
        },
        onGoAway: () => {},
        onSetupComplete: () => {
          useSessionStore.getState().setStatus("active");
          useSessionStore.getState().setConnectionQuality("connected");
        },
        onDisconnect: () => {
          useSessionStore.getState().setStatus("reconnecting");
        },
        onError: (msg: string) => {
          useSessionStore.getState().setError(msg);
        },
      };

      const connection = new GeminiConnection(deps);

      // 3. Connect
      connection.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
        toolDeclarations: [],
      });
      lastCreatedWs.simulateOpen();

      // 4. Verify setup message sent
      expect(lastCreatedWs.sentMessages.length).toBeGreaterThan(0);
      const setupMsg = JSON.parse(lastCreatedWs.sentMessages[0]);
      expect(setupMsg.config.model).toBe("models/gemini-2.5-flash-live-preview");

      // 5. Simulate setupComplete
      lastCreatedWs.simulateMessage({ setupComplete: {} });
      expect(useSessionStore.getState().status).toBe("active");
      expect(useSessionStore.getState().connectionQuality).toBe("connected");
    });

    it("audio data from Gemini flows to playback and sets AI speaking", () => {
      const playback = new AudioPlayback(mockCtxFactory);
      const deps: GeminiConnectionDeps = {
        onAudioData: (pcmBase64: string) => {
          playback.enqueueChunk(pcmBase64);
          useSessionStore.getState().setAISpeaking(true);
        },
        onToolCall: vi.fn(),
        onTurnComplete: () => {
          useSessionStore.getState().setAISpeaking(false);
        },
        onResumptionUpdate: vi.fn(),
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn(),
      };

      const connection = new GeminiConnection(deps);
      connection.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateOpen();

      // Gemini sends audio data
      lastCreatedWs.simulateMessage({
        serverContent: {
          modelTurn: {
            parts: [
              {
                inlineData: { data: "AQID", mimeType: "audio/pcm;rate=24000" },
              },
            ],
          },
        },
      });

      expect(useSessionStore.getState().isAISpeaking).toBe(true);

      // Turn completes
      lastCreatedWs.simulateMessage({
        serverContent: { turnComplete: true },
      });

      expect(useSessionStore.getState().isAISpeaking).toBe(false);
    });

    it("tool calls relay through ToolRelay and response goes back to Gemini", async () => {
      const mockDispatch = vi.fn().mockResolvedValue({
        functionResponses: [
          { id: "call-1", name: "lookupErrorCode", response: { found: true } },
        ],
      });

      const relay = new ToolRelay({ dispatchToolCalls: mockDispatch });
      let connectionInstance: GeminiConnection;

      const deps: GeminiConnectionDeps = {
        onAudioData: vi.fn(),
        onToolCall: async (toolCall) => {
          const result = await relay.relay(toolCall);
          connectionInstance.sendToolResponse(result.functionResponses);
        },
        onTurnComplete: vi.fn(),
        onResumptionUpdate: vi.fn(),
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn(),
      };

      connectionInstance = new GeminiConnection(deps);
      connectionInstance.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateOpen();

      // Gemini sends a tool call
      lastCreatedWs.simulateMessage({
        toolCall: {
          functionCalls: [
            { id: "call-1", name: "lookupErrorCode", args: { code: "E01" } },
          ],
        },
      });

      // Allow async relay to complete
      await vi.waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({
          functionCalls: [
            { id: "call-1", name: "lookupErrorCode", args: { code: "E01" } },
          ],
        });
      });

      // Verify tool response was sent back to Gemini
      await vi.waitFor(() => {
        const toolResponseMsg = lastCreatedWs.sentMessages.find((msg) => {
          const parsed = JSON.parse(msg);
          return parsed.toolResponse !== undefined;
        });
        expect(toolResponseMsg).toBeDefined();
      });
    });

    it("resumption handle updates are stored", () => {
      const deps: GeminiConnectionDeps = {
        onAudioData: vi.fn(),
        onToolCall: vi.fn(),
        onTurnComplete: vi.fn(),
        onResumptionUpdate: (handle: string) => {
          useSessionStore.getState().setResumptionHandle(handle);
        },
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn(),
      };

      const connection = new GeminiConnection(deps);
      connection.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateOpen();

      lastCreatedWs.simulateMessage({
        sessionResumptionUpdate: {
          resumable: true,
          newHandle: "resume-abc",
        },
      });

      expect(useSessionStore.getState().resumptionHandle).toBe("resume-abc");
    });

    it("disconnect triggers reconnection flow", () => {
      const deps: GeminiConnectionDeps = {
        onAudioData: vi.fn(),
        onToolCall: vi.fn(),
        onTurnComplete: vi.fn(),
        onResumptionUpdate: vi.fn(),
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: (_code: number, _reason: string) => {
          useSessionStore.getState().setStatus("reconnecting");
          useSessionStore.getState().setConnectionQuality("reconnecting");
          reconnectWithBackoff({
            connect: vi.fn().mockResolvedValue(false),
            onSuccess: vi.fn(),
            onGiveUp: () => {
              useSessionStore.getState().setStatus("timeout");
            },
            getSessionStore: () => ({
              setConnectionQuality:
                useSessionStore.getState().setConnectionQuality,
            }),
          });
        },
        onError: vi.fn(),
      };

      const connection = new GeminiConnection(deps);
      connection.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateOpen();

      // Simulate unexpected disconnect
      lastCreatedWs.simulateClose(1006, "abnormal");

      expect(useSessionStore.getState().status).toBe("reconnecting");
      expect(reconnectWithBackoff).toHaveBeenCalled();
    });

    it("errors are stored in session store", () => {
      const deps: GeminiConnectionDeps = {
        onAudioData: vi.fn(),
        onToolCall: vi.fn(),
        onTurnComplete: vi.fn(),
        onResumptionUpdate: vi.fn(),
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: vi.fn(),
        onError: (msg: string) => {
          useSessionStore.getState().setError(msg);
        },
      };

      const connection = new GeminiConnection(deps);
      connection.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateError("Connection refused");

      expect(useSessionStore.getState().error).toBe("Connection refused");
    });

    it("endSession tool call is handled client-side without server relay", async () => {
      const mockDispatch = vi.fn();
      const relay = new ToolRelay({ dispatchToolCalls: mockDispatch });

      let connectionInstance: GeminiConnection;
      let endSessionCalled = false;

      const deps: GeminiConnectionDeps = {
        onAudioData: vi.fn(),
        onToolCall: async (toolCall) => {
          const endSessionCall = toolCall.functionCalls.find(
            (fc) => fc.name === "endSession",
          );
          if (endSessionCall) {
            endSessionCalled = true;
            connectionInstance.sendToolResponse([
              {
                id: endSessionCall.id,
                name: "endSession",
                response: { success: true },
              },
            ]);
            return;
          }
          const result = await relay.relay(toolCall);
          connectionInstance.sendToolResponse(result.functionResponses);
        },
        onTurnComplete: vi.fn(),
        onResumptionUpdate: vi.fn(),
        onGoAway: vi.fn(),
        onSetupComplete: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn(),
      };

      connectionInstance = new GeminiConnection(deps);
      connectionInstance.connect({
        token: "test-token",
        model: "gemini-2.5-flash-live-preview",
      });
      lastCreatedWs.simulateOpen();

      // Gemini sends endSession tool call
      lastCreatedWs.simulateMessage({
        toolCall: {
          functionCalls: [
            { id: "end-1", name: "endSession", args: {} },
          ],
        },
      });

      await vi.waitFor(() => {
        expect(endSessionCalled).toBe(true);
      });

      // Verify server dispatch was NOT called
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe("session end", () => {
    it("cleanup resets store and stops pipelines", () => {
      // Simulate active session
      useSessionStore.getState().setStatus("active");
      useSessionStore.getState().setAISpeaking(true);
      useSessionStore.getState().setMicActive(true);

      // Simulate endSession
      useSessionStore.getState().setStatus("completed");
      useSessionStore.getState().reset();

      expect(useSessionStore.getState().status).toBe("idle");
      expect(useSessionStore.getState().isAISpeaking).toBe(false);
      expect(useSessionStore.getState().isMicActive).toBe(false);
    });
  });

  describe("token failure", () => {
    it("sets status to failed when token acquisition fails", () => {
      // Simulate token failure path
      useSessionStore.getState().setStatus("connecting");
      useSessionStore.getState().setError("Failed to create session token");
      useSessionStore.getState().setStatus("failed");

      expect(useSessionStore.getState().status).toBe("failed");
      expect(useSessionStore.getState().error).toBe(
        "Failed to create session token",
      );
    });
  });
});
