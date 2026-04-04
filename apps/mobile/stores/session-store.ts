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

interface SessionState {
  status: SessionStatus;
  connectionQuality: ConnectionQuality;
  sessionId: string | null;
  resumptionHandle: string | null;
  isMicActive: boolean;
  isAISpeaking: boolean;
  reconnectAttempts: number;
  error: string | null;
  sessionStartTime: number | null;
}

interface SessionActions {
  setStatus: (status: SessionStatus) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setSessionId: (id: string | null) => void;
  setResumptionHandle: (handle: string | null) => void;
  setMicActive: (active: boolean) => void;
  setAISpeaking: (speaking: boolean) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  setError: (error: string | null) => void;
  startSession: (sessionId: string) => void;
  reset: () => void;
}

const initialState: SessionState = {
  status: "idle",
  connectionQuality: "connected",
  sessionId: null,
  resumptionHandle: null,
  isMicActive: false,
  isAISpeaking: false,
  reconnectAttempts: 0,
  error: null,
  sessionStartTime: null,
};

export const useSessionStore = create<SessionState & SessionActions>()((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setConnectionQuality: (connectionQuality) => set({ connectionQuality }),
  setSessionId: (sessionId) => set({ sessionId }),
  setResumptionHandle: (resumptionHandle) => set({ resumptionHandle }),
  setMicActive: (isMicActive) => set({ isMicActive }),
  setAISpeaking: (isAISpeaking) => set({ isAISpeaking }),
  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
  setError: (error) => set({ error }),
  startSession: (sessionId) =>
    set({ status: "active", sessionId, sessionStartTime: Date.now() }),
  reset: () => set(initialState),
}));
