import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./session-store";

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  describe("initial state", () => {
    it("has status idle", () => {
      expect(useSessionStore.getState().status).toBe("idle");
    });

    it("has connectionQuality connected", () => {
      expect(useSessionStore.getState().connectionQuality).toBe("connected");
    });

    it("has null sessionId", () => {
      expect(useSessionStore.getState().sessionId).toBeNull();
    });

    it("has null resumptionHandle", () => {
      expect(useSessionStore.getState().resumptionHandle).toBeNull();
    });

    it("has isMicActive false", () => {
      expect(useSessionStore.getState().isMicActive).toBe(false);
    });

    it("has isAISpeaking false", () => {
      expect(useSessionStore.getState().isAISpeaking).toBe(false);
    });

    it("has reconnectAttempts 0", () => {
      expect(useSessionStore.getState().reconnectAttempts).toBe(0);
    });

    it("has null error", () => {
      expect(useSessionStore.getState().error).toBeNull();
    });

    it("has null sessionStartTime", () => {
      expect(useSessionStore.getState().sessionStartTime).toBeNull();
    });
  });

  describe("setStatus", () => {
    it("updates status to connecting", () => {
      useSessionStore.getState().setStatus("connecting");
      expect(useSessionStore.getState().status).toBe("connecting");
    });

    it("updates status to active", () => {
      useSessionStore.getState().setStatus("active");
      expect(useSessionStore.getState().status).toBe("active");
    });

    it("updates status to reconnecting", () => {
      useSessionStore.getState().setStatus("reconnecting");
      expect(useSessionStore.getState().status).toBe("reconnecting");
    });

    it("updates status to disconnected", () => {
      useSessionStore.getState().setStatus("disconnected");
      expect(useSessionStore.getState().status).toBe("disconnected");
    });

    it("updates status to completed", () => {
      useSessionStore.getState().setStatus("completed");
      expect(useSessionStore.getState().status).toBe("completed");
    });

    it("updates status to failed", () => {
      useSessionStore.getState().setStatus("failed");
      expect(useSessionStore.getState().status).toBe("failed");
    });

    it("updates status to timeout", () => {
      useSessionStore.getState().setStatus("timeout");
      expect(useSessionStore.getState().status).toBe("timeout");
    });

    it("updates status to requesting-permissions", () => {
      useSessionStore.getState().setStatus("requesting-permissions");
      expect(useSessionStore.getState().status).toBe("requesting-permissions");
    });

    it("updates status to disclosure", () => {
      useSessionStore.getState().setStatus("disclosure");
      expect(useSessionStore.getState().status).toBe("disclosure");
    });
  });

  describe("setConnectionQuality", () => {
    it("updates connectionQuality to reconnecting", () => {
      useSessionStore.getState().setConnectionQuality("reconnecting");
      expect(useSessionStore.getState().connectionQuality).toBe("reconnecting");
    });

    it("updates connectionQuality to lost", () => {
      useSessionStore.getState().setConnectionQuality("lost");
      expect(useSessionStore.getState().connectionQuality).toBe("lost");
    });

    it("updates connectionQuality back to connected", () => {
      useSessionStore.getState().setConnectionQuality("lost");
      useSessionStore.getState().setConnectionQuality("connected");
      expect(useSessionStore.getState().connectionQuality).toBe("connected");
    });
  });

  describe("setResumptionHandle", () => {
    it("stores a handle", () => {
      useSessionStore.getState().setResumptionHandle("abc123");
      expect(useSessionStore.getState().resumptionHandle).toBe("abc123");
    });

    it("clears handle with null", () => {
      useSessionStore.getState().setResumptionHandle("abc123");
      useSessionStore.getState().setResumptionHandle(null);
      expect(useSessionStore.getState().resumptionHandle).toBeNull();
    });
  });

  describe("setAISpeaking", () => {
    it("sets isAISpeaking to true", () => {
      useSessionStore.getState().setAISpeaking(true);
      expect(useSessionStore.getState().isAISpeaking).toBe(true);
    });

    it("sets isAISpeaking to false", () => {
      useSessionStore.getState().setAISpeaking(true);
      useSessionStore.getState().setAISpeaking(false);
      expect(useSessionStore.getState().isAISpeaking).toBe(false);
    });
  });

  describe("setMicActive", () => {
    it("sets isMicActive to true", () => {
      useSessionStore.getState().setMicActive(true);
      expect(useSessionStore.getState().isMicActive).toBe(true);
    });

    it("sets isMicActive to false", () => {
      useSessionStore.getState().setMicActive(true);
      useSessionStore.getState().setMicActive(false);
      expect(useSessionStore.getState().isMicActive).toBe(false);
    });
  });

  describe("reconnect attempts", () => {
    it("increments from 0 to 1", () => {
      useSessionStore.getState().incrementReconnectAttempts();
      expect(useSessionStore.getState().reconnectAttempts).toBe(1);
    });

    it("increments from 1 to 2", () => {
      useSessionStore.getState().incrementReconnectAttempts();
      useSessionStore.getState().incrementReconnectAttempts();
      expect(useSessionStore.getState().reconnectAttempts).toBe(2);
    });

    it("resetReconnectAttempts resets to 0", () => {
      useSessionStore.getState().incrementReconnectAttempts();
      useSessionStore.getState().incrementReconnectAttempts();
      useSessionStore.getState().resetReconnectAttempts();
      expect(useSessionStore.getState().reconnectAttempts).toBe(0);
    });
  });

  describe("setError", () => {
    it("stores an error string", () => {
      useSessionStore.getState().setError("network failure");
      expect(useSessionStore.getState().error).toBe("network failure");
    });

    it("clears error with null", () => {
      useSessionStore.getState().setError("network failure");
      useSessionStore.getState().setError(null);
      expect(useSessionStore.getState().error).toBeNull();
    });
  });

  describe("setSessionId", () => {
    it("stores a session ID", () => {
      useSessionStore.getState().setSessionId("session_abc");
      expect(useSessionStore.getState().sessionId).toBe("session_abc");
    });

    it("clears session ID with null", () => {
      useSessionStore.getState().setSessionId("session_abc");
      useSessionStore.getState().setSessionId(null);
      expect(useSessionStore.getState().sessionId).toBeNull();
    });
  });

  describe("startSession", () => {
    it("sets status to active and records sessionStartTime", () => {
      const before = Date.now();
      useSessionStore.getState().startSession("session_123");
      const after = Date.now();

      const state = useSessionStore.getState();
      expect(state.status).toBe("active");
      expect(state.sessionId).toBe("session_123");
      expect(state.sessionStartTime).toBeGreaterThanOrEqual(before);
      expect(state.sessionStartTime).toBeLessThanOrEqual(after);
    });
  });

  describe("reset", () => {
    it("returns all state to initial values", () => {
      useSessionStore.getState().setStatus("active");
      useSessionStore.getState().setConnectionQuality("lost");
      useSessionStore.getState().setSessionId("session_abc");
      useSessionStore.getState().setResumptionHandle("handle_xyz");
      useSessionStore.getState().setMicActive(true);
      useSessionStore.getState().setAISpeaking(true);
      useSessionStore.getState().incrementReconnectAttempts();
      useSessionStore.getState().setError("some error");

      useSessionStore.getState().reset();

      const state = useSessionStore.getState();
      expect(state.status).toBe("idle");
      expect(state.connectionQuality).toBe("connected");
      expect(state.sessionId).toBeNull();
      expect(state.resumptionHandle).toBeNull();
      expect(state.isMicActive).toBe(false);
      expect(state.isAISpeaking).toBe(false);
      expect(state.reconnectAttempts).toBe(0);
      expect(state.error).toBeNull();
      expect(state.sessionStartTime).toBeNull();
    });
  });

  describe("external access (non-React)", () => {
    it("getState() works outside React component context", () => {
      const state = useSessionStore.getState();
      expect(state).toBeDefined();
      expect(typeof state.setStatus).toBe("function");
    });

    it("setState() works outside React component context", () => {
      useSessionStore.setState({ status: "connecting" });
      expect(useSessionStore.getState().status).toBe("connecting");
    });
  });
});
