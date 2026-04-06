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
import { END_SESSION_TOOL_DECL } from "@/lib/gemini/protocol";
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
  const endSessionRef = useRef<(() => void) | null>(null);
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

  const createSessionMutation = useMutation(
    trpc.session.createSession.mutationOptions(),
  );

  const endSessionMutation = useMutation(
    trpc.session.endSession.mutationOptions(),
  );

  const addToolCallMutation = useMutation(
    trpc.session.addToolCall.mutationOptions(),
  );

  const addFindingMutation = useMutation(
    trpc.session.addFinding.mutationOptions(),
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
        // Check for client-side endSession tool (SESS-09, D-12)
        const endSessionCall = toolCall.functionCalls.find(
          (fc) => fc.name === "endSession",
        );

        if (endSessionCall) {
          // Send success response back to Gemini so it can speak the goodbye
          connectionRef.current?.sendToolResponse([
            {
              id: endSessionCall.id,
              name: "endSession",
              response: { success: true },
            },
          ]);

          // Wait briefly for Gemini to speak "Ending the session now. Goodbye."
          // then end the session. The 3-second delay allows the verbal confirmation
          // to play before cleanup stops audio.
          setTimeout(() => {
            endSessionRef.current?.();
          }, 3000);
          return;
        }

        // Relay all other tool calls to server
        if (!toolRelayRef.current || !connectionRef.current) return;

        const callStart = Date.now();
        const result = await toolRelayRef.current.relay(toolCall);
        const callDurationMs = Date.now() - callStart;
        connectionRef.current.sendToolResponse(result.functionResponses);

        // Persist each tool call incrementally (D-07)
        const serverSessionId = store.getState().serverSessionId;
        if (serverSessionId) {
          for (const fc of toolCall.functionCalls) {
            const response = result.functionResponses.find(
              (r) => r.id === fc.id,
            );
            const success = !response?.response?.error;

            addToolCallMutation.mutate({
              sessionId: serverSessionId,
              toolName: fc.name,
              input: fc.args,
              output: response?.response,
              durationMs: callDurationMs,
              success,
              errorMessage: success
                ? undefined
                : String(response?.response?.error ?? "Unknown error"),
            });

            store.getState().addToolName(fc.name);
            store.getState().incrementToolCallsCount();
          }

          // Persist findings to database via tRPC (KB-07)
          for (const fc of toolCall.functionCalls) {
            if (fc.name === "logFinding" && serverSessionId) {
              const response = result.functionResponses.find(
                (r) => r.id === fc.id,
              );
              if (response?.response && !response.response.error) {
                addFindingMutation.mutate({
                  sessionId: serverSessionId,
                  category: String(fc.args.category),
                  description: String(fc.args.description),
                  severity: String(fc.args.severity),
                  equipmentModel: fc.args.equipmentModel
                    ? String(fc.args.equipmentModel)
                    : undefined,
                  manufacturer: fc.args.manufacturer
                    ? String(fc.args.manufacturer)
                    : undefined,
                });
                store.getState().incrementFindingsCount();
              }
            }
          }
        }
      },

      onTurnComplete: () => {
        store.getState().setAISpeaking(false);
        store.getState().incrementTokenCountOutput();
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
    addToolCallMutation,
    addFindingMutation,
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

    // Create DB session record BEFORE WebSocket connection (D-04)
    try {
      const { sessionId: serverSessionId } =
        await createSessionMutation.mutateAsync({});
      store.getState().setServerSessionId(serverSessionId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create session record";
      store.getState().setError(message);
      store.getState().setStatus("failed");
      deactivateKeepAwake();
      return;
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
        toolDeclarations: [
          ...(tokenData.toolDeclarations ?? []),
          END_SESSION_TOOL_DECL,
        ],
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
        store.getState().incrementTokenCountInput();
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
      toolDeclarations: [
        ...(tokenData.toolDeclarations ?? []),
        END_SESSION_TOOL_DECL,
      ],
    });
  }, [
    createTokenMutation,
    createSessionMutation,
    dispatchMutation,
    cameraRef,
    store,
    buildConnectionDeps,
  ]);

  const endSession = useCallback(() => {
    cleanupResources();

    const state = store.getState();
    const durationMs = state.sessionStartTime
      ? Date.now() - state.sessionStartTime
      : 0;

    // Persist session end data to server
    if (state.serverSessionId) {
      endSessionMutation.mutate({
        sessionId: state.serverSessionId,
        status: "completed",
        durationMs,
        languageDetected: state.languageDetected ?? undefined,
        tokenCountInput: state.tokenCountInput,
        tokenCountOutput: state.tokenCountOutput,
        toolsUsed: state.toolNames,
      });
    }

    // Set status to completed but do NOT reset the store yet --
    // the feedback screen needs the session recap data (Pitfall 4).
    // Store reset happens after feedback screen captures the recap.
    store.getState().setStatus("completed");
  }, [cleanupResources, store, endSessionMutation]);

  // Ref avoids stale closure in onToolCall callback from buildConnectionDeps
  endSessionRef.current = endSession;

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
