import type { GeminiConnectionDeps } from "@/lib/gemini/connection";
import { GeminiConnection } from "@/lib/gemini/connection";
import { reconnectWithBackoff } from "@/lib/gemini/reconnection";
import type { AudioPlayback } from "@/lib/gemini/audio-playback";
import type { ToolRelay } from "@/lib/gemini/tool-relay";
import type { useSessionStore } from "@/stores/session-store";

/**
 * Mutable refs the callback factory reads at call time.
 * Using an object of getters avoids stale closure issues —
 * each callback reads the *current* ref value when it fires.
 */
export interface SessionRefs {
  getConnection: () => GeminiConnection | null;
  getPlayback: () => AudioPlayback | null;
  getToolRelay: () => ToolRelay | null;
  getEndSession: () => (() => void) | null;
  getTokenData: () => {
    model: string;
    toolDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  } | null;
  setConnection: (conn: GeminiConnection | null) => void;
}

/**
 * Mutation functions the callbacks need to persist data
 * via tRPC. Decoupled from React Query so the module
 * stays framework-agnostic and testable.
 */
export interface SessionMutations {
  createToken: () => Promise<{
    token: string;
    model: string;
    toolDeclarations: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  }>;
  addToolCall: (input: {
    sessionId: string;
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown> | undefined;
    durationMs: number;
    success: boolean;
    errorMessage: string | undefined;
  }) => void;
  addFinding: (input: {
    sessionId: string;
    category: string;
    description: string;
    severity: string;
    equipmentModel: string | undefined;
    manufacturer: string | undefined;
  }) => void;
}

/**
 * Pipeline control callbacks passed in from the hook
 * so the connection deps can start/stop audio and frame capture.
 */
export interface PipelineControls {
  startPipelines: () => void;
  stopPipelines: () => void;
}

export interface BuildConnectionDepsParams {
  refs: SessionRefs;
  mutations: SessionMutations;
  pipelines: PipelineControls;
  store: typeof useSessionStore;
}

/**
 * Factory that builds the GeminiConnectionDeps callbacks.
 *
 * Extracted from useGeminiSession so the same callback set
 * can be constructed both for the initial connection and
 * for reconnection without duplicating logic.
 */
export function buildConnectionDeps(
  params: BuildConnectionDepsParams,
): GeminiConnectionDeps {
  const { refs, mutations, pipelines, store } = params;

  return {
    onAudioData: (pcmBase64: string) => {
      refs.getPlayback()?.enqueueChunk(pcmBase64);
      store.getState().setAISpeaking(true);
    },

    onToolCall: async (toolCall) => {
      // Check for client-side endSession tool (SESS-09, D-12)
      const endSessionCall = toolCall.functionCalls.find(
        (fc) => fc.name === "endSession",
      );

      if (endSessionCall) {
        // Send success response back to Gemini so it can speak the goodbye
        refs.getConnection()?.sendToolResponse([
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
          refs.getEndSession()?.();
        }, 3000);
        return;
      }

      // Relay all other tool calls to server
      const toolRelay = refs.getToolRelay();
      const connection = refs.getConnection();
      if (!toolRelay || !connection) return;

      const callStart = Date.now();
      const result = await toolRelay.relay(toolCall);
      const callDurationMs = Date.now() - callStart;
      connection.sendToolResponse(result.functionResponses);

      // Persist each tool call incrementally (D-07)
      const serverSessionId = store.getState().serverSessionId;
      if (serverSessionId) {
        for (const fc of toolCall.functionCalls) {
          const response = result.functionResponses.find(
            (r) => r.id === fc.id,
          );
          const success = !response?.response?.error;

          mutations.addToolCall({
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
              mutations.addFinding({
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
      // Session ending soon — Gemini will disconnect.
      // The onDisconnect callback handles the actual reconnection flow.
    },

    onSetupComplete: () => {
      store.getState().setStatus("active");
      store.getState().setConnectionQuality("connected");
      pipelines.startPipelines();
    },

    onDisconnect: (code: number, reason: string) => {
      pipelines.stopPipelines();

      const NON_RECOVERABLE_CODES = [1003, 1008];
      if (NON_RECOVERABLE_CODES.includes(code)) {
        console.error(`[GeminiWS] Non-recoverable close (code=${code}): ${reason}`);
        store.getState().setStatus("error");
        store.getState().setConnectionQuality("lost");
        store.getState().setError(reason || `Connection rejected (code ${code})`);
        return;
      }

      store.getState().setStatus("reconnecting");
      store.getState().setConnectionQuality("reconnecting");

      reconnectWithBackoff({
        connect: async () => {
          if (!refs.getTokenData()) return false;

          try {
            // Acquire a fresh ephemeral token for reconnection
            const freshToken = await mutations.createToken();
            const resumptionHandle = store.getState().resumptionHandle;

            // Close stale connection
            refs.getConnection()?.close();

            // Create fresh GeminiConnection with same callbacks
            const freshConnection = new GeminiConnection(
              buildConnectionDeps(params),
            );
            refs.setConnection(freshConnection);

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
          pipelines.startPipelines();
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
}
