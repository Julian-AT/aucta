export const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

// --- Audio Constants ---
export const AUDIO_INPUT_SAMPLE_RATE = 16000;
export const AUDIO_INPUT_CHANNELS = 1;
export const AUDIO_INPUT_MIME = "audio/pcm;rate=16000" as const;
export const AUDIO_OUTPUT_SAMPLE_RATE = 24000;

// --- Video Constants ---
export const CAPTURE_INTERVAL_MS = 1000;
export const JPEG_QUALITY = 0.6;
export const FRAME_MAX_DIMENSION = 768;

// --- Reconnection Constants ---
// Gemini's sessionResumption token expires after ~2 minutes of disconnection.
// Beyond that window, we must create a fresh session instead of resuming.
export const BACKOFF_BASE_MS = 1000;
export const BACKOFF_MAX_MS = 30000;
export const BACKOFF_JITTER_MS = 500;
export const RECONNECT_TIMEOUT_MS = 120_000;

// --- Session Constants ---
// Ephemeral tokens have a 30-minute message window; warn 5 minutes before expiry.
export const SESSION_WARN_MS = 25 * 60 * 1000;

// --- Setup Message (Client -> Server, sent once on connect) ---
export interface GeminiSetupConfig {
  model: string;
  responseModalities: string[];
  systemInstruction?: { parts: Array<{ text: string }> };
  tools?: Array<{ functionDeclarations: GeminiFunctionDecl[] }>;
  sessionResumption?: { handle?: string };
  contextWindowCompression?: { slidingWindow: Record<string, never> };
}

export interface GeminiSetupMessage {
  config: GeminiSetupConfig;
}

export interface GeminiFunctionDecl {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Client-side tool declaration for voice-triggered session end (SESS-09, D-12).
 * Gemini calls this when the user says "end session", "stop session",
 * "that's all", "goodbye", or similar phrases indicating they want to finish.
 * Handled locally on the mobile client -- NOT relayed to the server.
 */
export const END_SESSION_TOOL_DECL: GeminiFunctionDecl = {
  name: "endSession",
  description:
    "End the current AI-assisted session. Call this tool when the user says 'end session', 'stop session', 'that is all', 'goodbye', or any phrase indicating they want to finish the conversation. Before calling, verbally confirm: 'Ending the session now. Goodbye.'",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
};

// --- Client -> Server Messages ---
export interface RealtimeAudioInput {
  realtimeInput: {
    audio: { data: string; mimeType: typeof AUDIO_INPUT_MIME };
  };
}

export interface RealtimeVideoInput {
  realtimeInput: {
    video: { data: string; mimeType: "image/jpeg" };
  };
}

export interface ClientToolResponse {
  toolResponse: {
    functionResponses: Array<{
      id: string;
      name: string;
      response: Record<string, unknown>;
    }>;
  };
}

// --- Server -> Client Message Parts ---
export interface ServerInlineData {
  inlineData: { data: string; mimeType: string };
}

export interface ServerModelTurn {
  parts: ServerInlineData[];
}

export interface ServerContentMessage {
  serverContent: {
    modelTurn?: ServerModelTurn;
    turnComplete?: boolean;
    generationComplete?: boolean;
  };
}

export interface ToolCallMessage {
  toolCall: {
    functionCalls: Array<{
      id: string;
      name: string;
      args: Record<string, unknown>;
    }>;
  };
}

export interface SessionResumptionUpdate {
  sessionResumptionUpdate: {
    resumable: boolean;
    newHandle?: string;
  };
}

export interface GoAwayMessage {
  goAway: {
    timeLeft?: string;
  };
}

export interface SetupCompleteMessage {
  setupComplete: Record<string, unknown>;
}

// --- Union of all server messages ---
export type GeminiServerMessage =
  | ServerContentMessage
  | ToolCallMessage
  | SessionResumptionUpdate
  | GoAwayMessage
  | SetupCompleteMessage;

// --- Type guards for server message parsing ---
export function isServerContent(msg: unknown): msg is ServerContentMessage {
  return typeof msg === "object" && msg !== null && "serverContent" in msg;
}

export function isToolCall(msg: unknown): msg is ToolCallMessage {
  return typeof msg === "object" && msg !== null && "toolCall" in msg;
}

export function isSessionResumptionUpdate(msg: unknown): msg is SessionResumptionUpdate {
  return typeof msg === "object" && msg !== null && "sessionResumptionUpdate" in msg;
}

export function isGoAway(msg: unknown): msg is GoAwayMessage {
  return typeof msg === "object" && msg !== null && "goAway" in msg;
}

export function isSetupComplete(msg: unknown): msg is SetupCompleteMessage {
  return typeof msg === "object" && msg !== null && "setupComplete" in msg;
}
