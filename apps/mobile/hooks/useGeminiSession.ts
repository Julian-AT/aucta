import { useRef, useCallback, useEffect } from "react";
import { useTRPC } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/session-store";
import {
  GeminiConnection,
  type GeminiConnectionDeps,
} from "@/lib/gemini/connection";
import { AudioPlayback } from "@/lib/gemini/audio-playback";
import { AudioCapture } from "@/lib/gemini/audio-capture";
import { FrameCapture } from "@/lib/gemini/frame-capture";
import { ToolRelay } from "@/lib/gemini/tool-relay";
import { reconnectWithBackoff } from "@/lib/gemini/reconnection";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { CameraView } from "expo-camera";

/**
 * Orchestrates the entire Gemini Live session lifecycle.
 *
 * Coordinates: token acquisition via tRPC, WebSocket connection,
 * audio capture/playback, frame capture, tool call relay,
 * reconnection, and session cleanup.
 *
 * Only structured tool call JSON passes through our server (COMP-06).
 * Audio and video stream directly mobile -> Gemini WebSocket.
 */
export function useGeminiSession(
  cameraRef: React.RefObject<CameraView | null>,
) {
  const trpc = useTRPC();
  const store = useSessionStore;

  const connectionRef = useRef<GeminiConnection | null>(null);
  const playbackRef = useRef<AudioPlayback | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const frameCaptureRef = useRef<FrameCapture | null>(null);
  const toolRelayRef = useRef<ToolRelay | null>(null);
  const isCleaningUp = useRef(false);

  // Store last token data for reconnection
  const tokenDataRef = useRef<{
    model: string;
    toolDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  } | null>(null);

  const createTokenMutation = useMutation(
    trpc.session.createToken.mutationOptions(),
  );

  const dispatchMutation = useMutation(
    trpc.session.dispatchToolCalls.mutationOptions(),
  );

  const cleanupResources = useCallback(() => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true;

    frameCaptureRef.current?.stop();
    frameCaptureRef.current = null;

    captureRef.current?.destroy();
    captureRef.current = null;

    connectionRef.current?.close();
    connectionRef.current = null;

    playbackRef.current?.destroy();
    playbackRef.current = null;

    toolRelayRef.current = null;

    deactivateKeepAwake();
    isCleaningUp.current = false;
  }, []);

  const startPipelines = useCallback(() => {
    captureRef.current?.start();
    store.getState().setMicActive(true);
    frameCaptureRef.current?.start();
  }, [store]);

  const stopPipelines = useCallback(() => {
    frameCaptureRef.current?.stop();
    captureRef.current?.stop();
    store.getState().setMicActive(false);
  }, [store]);

  /**
   * Build the GeminiConnectionDeps callbacks.
   * Extracted so the same callbacks can be reused when creating
   * a fresh GeminiConnection during reconnection.
   */
  const buildConnectionDeps = useCallback((): GeminiConnectionDeps => {
    return {
      onAudioData: (pcmBase64: string) => {
        playbackRef.current?.enqueueChunk(pcmBase64);
        store.getState().setAISpeaking(true);
      },

      onToolCall: async (toolCall) => {
        if (!toolRelayRef.current || !connectionRef.current) return;
        const result = await toolRelayRef.current.relay(toolCall);
        connectionRef.current.sendToolResponse(result.functionResponses);
      },

      onTurnComplete: () => {
        store.getState().setAISpeaking(false);
      },

      onResumptionUpdate: (handle: string) => {
        store.getState().setResumptionHandle(handle);
      },

      onGoAway: (_timeLeft: string | undefined) => {
        // Session ending soon -- Gemini will disconnect.
        // The onDisconnect callback handles the actual reconnection flow.
      },

      onSetupComplete: () => {
        store.getState().setStatus("active");
        store.getState().setConnectionQuality("connected");
        startPipelines();
      },

      onDisconnect: (_code: number, _reason: string) => {
        stopPipelines();
        store.getState().setStatus("reconnecting");
        store.getState().setConnectionQuality("reconnecting");

        reconnectWithBackoff({
          connect: async () => {
            if (!tokenDataRef.current) return false;

            try {
              // Acquire a fresh ephemeral token for reconnection
              const freshToken =
                await createTokenMutation.mutateAsync(undefined);
              const resumptionHandle = store.getState().resumptionHandle;

              // Close stale connection
              connectionRef.current?.close();

              // Create fresh GeminiConnection with same callbacks
              const freshConnection = new GeminiConnection(
                buildConnectionDeps(),
              );
              connectionRef.current = freshConnection;

              freshConnection.connect({
                token: freshToken.token,
                model: freshToken.model,
                toolDeclarations: freshToken.toolDeclarations,
                resumptionHandle,
              });

              return true;
            } catch {
              return false;
            }
          },
          onSuccess: () => {
            store.getState().setStatus("active");
            store.getState().setConnectionQuality("connected");
            store.getState().resetReconnectAttempts();
            startPipelines();
          },
          onGiveUp: () => {
            store.getState().setStatus("timeout");
            store.getState().setConnectionQuality("lost");
          },
          getSessionStore: () => ({
            setConnectionQuality: store.getState().setConnectionQuality,
          }),
        });
      },

      onError: (errorMessage: string) => {
        store.getState().setError(errorMessage);
      },
    };
  }, [
    store,
    startPipelines,
    stopPipelines,
    createTokenMutation,
  ]);

  const startSession = useCallback(async () => {
    const state = store.getState();
    if (state.status !== "idle" && state.status !== "disclosure") return;

    store.getState().setStatus("connecting");

    // Prevent screen dimming during active session (UX-05)
    try {
      await activateKeepAwakeAsync();
    } catch {
      // Non-critical -- continue even if keep-awake fails
    }

    // Acquire ephemeral token via tRPC
    let tokenData: {
      token: string;
      model: string;
      toolDeclarations: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
      }>;
    };

    try {
      tokenData = await createTokenMutation.mutateAsync(undefined);
      tokenDataRef.current = {
        model: tokenData.model,
        toolDeclarations: tokenData.toolDeclarations,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create session token";
      store.getState().setError(message);
      store.getState().setStatus("failed");
      deactivateKeepAwake();
      return;
    }

    // Create audio playback (24kHz output from Gemini)
    playbackRef.current = new AudioPlayback();

    // Create audio capture (16kHz input to Gemini)
    captureRef.current = new AudioCapture({
      onChunk: (pcmBase64: string) => {
        connectionRef.current?.sendAudio(pcmBase64);
      },
    });

    // Create tool relay (structured JSON only through our server -- COMP-06)
    toolRelayRef.current = new ToolRelay({
      dispatchToolCalls: (input) => dispatchMutation.mutateAsync(input),
    });

    // Create frame capture (1 FPS JPEG to Gemini)
    frameCaptureRef.current = new FrameCapture({
      cameraRef,
      onFrame: (jpegBase64: string) => {
        connectionRef.current?.sendVideo(jpegBase64);
      },
    });

    // Create GeminiConnection with all callbacks
    const connection = new GeminiConnection(buildConnectionDeps());
    connectionRef.current = connection;

    // Connect to Gemini Live
    connection.connect({
      token: tokenData.token,
      model: tokenData.model,
      toolDeclarations: tokenData.toolDeclarations,
    });
  }, [
    createTokenMutation,
    dispatchMutation,
    cameraRef,
    store,
    buildConnectionDeps,
  ]);

  const endSession = useCallback(() => {
    cleanupResources();
    store.getState().setStatus("completed");

    // Small delay then reset so UI can observe "completed" before returning to idle
    setTimeout(() => {
      store.getState().reset();
    }, 100);
  }, [cleanupResources, store]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    startSession,
    endSession,
    status: useSessionStore((s) => s.status),
    connectionQuality: useSessionStore((s) => s.connectionQuality),
    isAISpeaking: useSessionStore((s) => s.isAISpeaking),
    isMicActive: useSessionStore((s) => s.isMicActive),
    error: useSessionStore((s) => s.error),
  };
}
