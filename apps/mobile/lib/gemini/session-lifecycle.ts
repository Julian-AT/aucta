import { GeminiConnection } from "@/lib/gemini/connection";
import type { GeminiConnectionDeps } from "@/lib/gemini/connection";
import { AudioPlayback } from "@/lib/gemini/audio-playback";
import { AudioCapture } from "@/lib/gemini/audio-capture";
import { FrameCapture } from "@/lib/gemini/frame-capture";
import { ToolRelay } from "@/lib/gemini/tool-relay";
import { END_SESSION_TOOL_DECL } from "@/lib/gemini/protocol";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { CameraView } from "expo-camera";
import type { useSessionStore } from "@/stores/session-store";

/**
 * Token data returned from the tRPC createToken mutation.
 */
export interface TokenData {
  token: string;
  model: string;
  toolDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

/**
 * All pipeline resources created during session start.
 * Returned so the hook can store them in refs.
 */
export interface SessionResources {
  connection: GeminiConnection;
  playback: AudioPlayback;
  capture: AudioCapture;
  frameCapture: FrameCapture;
  toolRelay: ToolRelay;
  tokenData: {
    model: string;
    toolDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  };
}

/**
 * Dependencies injected by the hook so session-lifecycle
 * stays decoupled from React Query and tRPC.
 */
export interface SessionLifecycleDeps {
  store: typeof useSessionStore;
  cameraRef: React.RefObject<CameraView>;
  createSession: () => Promise<{ sessionId: string }>;
  createToken: () => Promise<TokenData>;
  dispatchToolCalls: (input: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  }) => Promise<{
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>;
  }>;
  buildConnectionDeps: () => GeminiConnectionDeps;
  getConnectionRef: () => GeminiConnection | null;
  setConnectionRef: (conn: GeminiConnection | null) => void;
}

/**
 * Initialize the full Gemini Live session pipeline.
 *
 * Creates all resources (AudioPlayback, AudioCapture, FrameCapture,
 * ToolRelay, GeminiConnection) and connects to Gemini.
 *
 * Returns the created resources on success, or null if any step fails.
 * On failure, sets error/status in the store and deactivates keep-awake.
 */
export async function initializeSession(
  deps: SessionLifecycleDeps,
): Promise<SessionResources | null> {
  const { store } = deps;
  const state = store.getState();

  if (state.status !== "idle" && state.status !== "disclosure") return null;

  store.getState().setStatus("connecting");

  // Prevent screen dimming during active session (UX-05)
  try {
    await activateKeepAwakeAsync();
  } catch {
    // Non-critical — continue even if keep-awake fails
  }

  // Create DB session record BEFORE WebSocket connection (D-04)
  try {
    const { sessionId: serverSessionId } = await deps.createSession();
    store.getState().setServerSessionId(serverSessionId);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create session record";
    store.getState().setError(message);
    store.getState().setStatus("failed");
    deactivateKeepAwake();
    return null;
  }

  // Acquire ephemeral token via tRPC
  let tokenData: TokenData;

  try {
    tokenData = await deps.createToken();
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create session token";
    store.getState().setError(message);
    store.getState().setStatus("failed");
    deactivateKeepAwake();
    return null;
  }

  // Create audio playback (24kHz output from Gemini)
  const playback = new AudioPlayback();

  // Create audio capture (16kHz input to Gemini)
  const capture = new AudioCapture({
    onChunk: (pcmBase64: string) => {
      deps.getConnectionRef()?.sendAudio(pcmBase64);
      store.getState().incrementTokenCountInput();
    },
  });

  // Create tool relay (structured JSON only through our server — COMP-06)
  const toolRelay = new ToolRelay({
    dispatchToolCalls: (input) => deps.dispatchToolCalls(input),
  });

  // Create frame capture (1 FPS JPEG to Gemini)
  const frameCapture = new FrameCapture({
    cameraRef: deps.cameraRef,
    onFrame: (jpegBase64: string) => {
      deps.getConnectionRef()?.sendVideo(jpegBase64);
    },
  });

  // Create GeminiConnection with all callbacks
  const connection = new GeminiConnection(deps.buildConnectionDeps());
  deps.setConnectionRef(connection);

  const toolDeclarationsWithEnd = [
    ...(tokenData.toolDeclarations ?? []),
    END_SESSION_TOOL_DECL,
  ];

  // Connect to Gemini Live
  connection.connect({
    token: tokenData.token,
    model: tokenData.model,
    toolDeclarations: toolDeclarationsWithEnd,
  });

  return {
    connection,
    playback,
    capture,
    frameCapture,
    toolRelay,
    tokenData: {
      model: tokenData.model,
      toolDeclarations: toolDeclarationsWithEnd,
    },
  };
}
