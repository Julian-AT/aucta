import { useRef, useCallback, useEffect } from "react";
import { useTRPC } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useSessionStore } from "@/stores/session-store";
import type { GeminiConnection } from "@/lib/gemini/connection";
import type { AudioPlayback } from "@/lib/gemini/audio-playback";
import type { AudioCapture } from "@/lib/gemini/audio-capture";
import type { FrameCapture } from "@/lib/gemini/frame-capture";
import type { ToolRelay } from "@/lib/gemini/tool-relay";
import { deactivateKeepAwake } from "expo-keep-awake";
import type { CameraView } from "expo-camera";
import { buildConnectionDeps } from "@/lib/gemini/session-callbacks";
import { initializeSession, type TokenData } from "@/lib/gemini/session-lifecycle";

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
    captureRef.current
      ?.start()
      .then(() => {
        store.getState().setMicActive(true);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Audio capture failed";
        console.warn("[AudioCapture] Start failed:", message);
        store.getState().setMicActive(false);
        store.getState().setError(
          "Microphone unavailable — audio requires a development build (not Expo Go).",
        );
      });
    frameCaptureRef.current?.start();
  }, [store]);

  const stopPipelines = useCallback(() => {
    frameCaptureRef.current?.stop();
    captureRef.current?.stop();
    store.getState().setMicActive(false);
  }, [store]);

  const getConnectionDeps = useCallback(
    () =>
      buildConnectionDeps({
        refs: {
          getConnection: () => connectionRef.current,
          getPlayback: () => playbackRef.current,
          getToolRelay: () => toolRelayRef.current,
          getEndSession: () => endSessionRef.current,
          getTokenData: () => tokenDataRef.current,
          setConnection: (conn) => {
            connectionRef.current = conn;
          },
        },
        mutations: {
          createToken: () =>
            createTokenMutation.mutateAsync(undefined) as Promise<TokenData>,
          addToolCall: (input) => addToolCallMutation.mutate(input),
          addFinding: (input) =>
            addFindingMutation.mutate(input as Parameters<typeof addFindingMutation.mutate>[0]),
        },
        pipelines: { startPipelines, stopPipelines },
        store,
      }),
    [
      store,
      startPipelines,
      stopPipelines,
      createTokenMutation,
      addToolCallMutation,
      addFindingMutation,
    ],
  );

  const startSession = useCallback(async () => {
    const resources = await initializeSession({
      store,
      cameraRef: cameraRef as React.RefObject<CameraView>,
      createSession: () => createSessionMutation.mutateAsync({}),
      createToken: () =>
        createTokenMutation.mutateAsync(undefined) as Promise<TokenData>,
      dispatchToolCalls: (input) => dispatchMutation.mutateAsync(input),
      buildConnectionDeps: getConnectionDeps,
      getConnectionRef: () => connectionRef.current,
      setConnectionRef: (conn) => {
        connectionRef.current = conn;
      },
    });

    if (!resources) return;

    connectionRef.current = resources.connection;
    playbackRef.current = resources.playback;
    captureRef.current = resources.capture;
    frameCaptureRef.current = resources.frameCapture;
    toolRelayRef.current = resources.toolRelay;
    tokenDataRef.current = resources.tokenData;
  }, [
    createTokenMutation,
    createSessionMutation,
    dispatchMutation,
    cameraRef,
    store,
    getConnectionDeps,
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

    // Set status to completed but do NOT reset the store yet —
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
