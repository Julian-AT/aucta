import { create } from "zustand";

export type SessionStatus =
  | "idle"
  | "requesting-permissions"
  | "disclosure"
  | "connecting"
  | "active"
  | "disconnected"
  | "reconnecting"
  | "completed"
  | "failed"
  | "timeout";

export type ConnectionQuality = "connected" | "reconnecting" | "lost";

export interface SessionRecap {
  durationMs: number;
  toolNames: string[];
  findingsCount: number;
  languageDetected: string | null;
}

interface SessionState {
  status: SessionStatus;
  connectionQuality: ConnectionQuality;
  sessionId: string | null;
  serverSessionId: string | null;
  resumptionHandle: string | null;
  isMicActive: boolean;
  isAISpeaking: boolean;
  reconnectAttempts: number;
  error: string | null;
  sessionStartTime: number | null;
  findingsCount: number;
  toolCallsCount: number;
  toolNames: string[];
  tokenCountInput: number;
  tokenCountOutput: number;
  languageDetected: string | null;
}

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setSessionId: (id: string | null) => void;
  setServerSessionId: (id: string) => void;
  setResumptionHandle: (handle: string | null) => void;
  setMicActive: (active: boolean) => void;
  setAISpeaking: (speaking: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setError: (error: string | null) => void;
  startSession: (sessionId: string) => void;
  incrementFindingsCount: () => void;
  incrementToolCallsCount: () => void;
  addToolName: (name: string) => void;
  incrementTokenCountInput: () => void;
  incrementTokenCountOutput: () => void;
  setLanguageDetected: (lang: string) => void;
  getSessionRecap: () => SessionRecap;
  reset: () => void;
}

const initialState: SessionState = {
  status: "idle",
  connectionQuality: "connected",
  sessionId: null,
  serverSessionId: null,
  resumptionHandle: null,
  isMicActive: false,
  isAISpeaking: false,
  reconnectAttempts: 0,
  error: null,
  sessionStartTime: null,
  findingsCount: 0,
  toolCallsCount: 0,
  toolNames: [],
  tokenCountInput: 0,
  tokenCountOutput: 0,
  languageDetected: null,
};

export const useSessionStore = create<SessionState & SessionActions>()(
  (set, get) => ({
    ...initialState,

    setStatus: (status) => set({ status }),
    setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
    setSessionId: (sessionId) => set({ sessionId }),
    setServerSessionId: (serverSessionId) => set({ serverSessionId }),
    setResumptionHandle: (resumptionHandle) => set({ resumptionHandle }),
    setMicActive: (isMicActive) => set({ isMicActive }),
    setAISpeaking: (isAISpeaking) => set({ isAISpeaking }),
    incrementReconnectAttempts: () =>
      set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
    resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
    setError: (error) => set({ error }),
    startSession: (sessionId) =>
      set({ status: "active", sessionId, sessionStartTime: Date.now() }),
    incrementFindingsCount: () =>
      set((state) => ({ findingsCount: state.findingsCount + 1 })),
    incrementToolCallsCount: () =>
      set((state) => ({ toolCallsCount: state.toolCallsCount + 1 })),
    addToolName: (name) =>
      set((state) => ({
        toolNames: state.toolNames.includes(name)
          ? state.toolNames
          : [...state.toolNames, name],
      })),
    incrementTokenCountInput: () =>
      set((state) => ({ tokenCountInput: state.tokenCountInput + 1 })),
    incrementTokenCountOutput: () =>
      set((state) => ({ tokenCountOutput: state.tokenCountOutput + 1 })),
    setLanguageDetected: (languageDetected) => set({ languageDetected }),
    getSessionRecap: () => {
      const state = get();
      const durationMs = state.sessionStartTime
        ? Date.now() - state.sessionStartTime
        : 0;
      return {
        durationMs,
        toolNames: state.toolNames,
        findingsCount: state.findingsCount,
        languageDetected: state.languageDetected,
      };
    },
    reset: () => set(initialState),
  }),
);
