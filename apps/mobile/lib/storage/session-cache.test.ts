import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory storage mock for react-native-mmkv
const memoryStore = new Map<string, string>();

vi.mock("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => memoryStore.get(key),
    set: (key: string, value: string) => memoryStore.set(key, value),
    remove: (key: string) => memoryStore.delete(key),
  }),
}));

import {
  cacheSession,
  getLastSession,
  getCachedSessions,
  clearCache,
  getLastSynced,
  setLastSynced,
  type CachedSession,
} from "./session-cache";

function makeSession(id: string, overrides?: Partial<CachedSession>): CachedSession {
  return {
    id,
    summary: `Summary for ${id}`,
    isAiGenerated: true,
    durationMs: 60000,
    languageDetected: "en",
    toolsUsed: ["lookupErrorCode"],
    feedbackRating: 4,
    startedAt: "2026-04-04T10:00:00Z",
    endedAt: "2026-04-04T10:01:00Z",
    ...overrides,
  };
}

describe("session-cache", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  describe("cacheSession", () => {
    it("stores and retrieves a session", () => {
      const session = makeSession("ses_001");
      cacheSession(session);

      const cached = getLastSession();
      expect(cached).toEqual(session);
    });

    it("puts the newest session first", () => {
      cacheSession(makeSession("ses_001"));
      cacheSession(makeSession("ses_002"));

      const last = getLastSession();
      expect(last?.id).toBe("ses_002");
    });

    it("does not duplicate session IDs when re-caching", () => {
      cacheSession(makeSession("ses_001"));
      cacheSession(makeSession("ses_002"));
      cacheSession(makeSession("ses_001", { summary: "Updated" }));

      const all = getCachedSessions();
      expect(all).toHaveLength(2);
      expect(all[0]?.id).toBe("ses_001");
      expect(all[0]?.summary).toBe("Updated");
    });
  });

  describe("eviction", () => {
    it("evicts oldest sessions when cache exceeds 20", () => {
      for (let i = 1; i <= 22; i++) {
        cacheSession(makeSession(`ses_${String(i).padStart(3, "0")}`));
      }

      const all = getCachedSessions();
      expect(all).toHaveLength(20);
      expect(all[0]?.id).toBe("ses_022");

      // ses_001 and ses_002 should be evicted
      const ids = all.map((s) => s.id);
      expect(ids).not.toContain("ses_001");
      expect(ids).not.toContain("ses_002");
    });
  });

  describe("getLastSession", () => {
    it("returns null when cache is empty", () => {
      expect(getLastSession()).toBeNull();
    });

    it("returns most recently cached session", () => {
      cacheSession(makeSession("ses_001"));
      cacheSession(makeSession("ses_002"));
      cacheSession(makeSession("ses_003"));

      expect(getLastSession()?.id).toBe("ses_003");
    });
  });

  describe("getCachedSessions", () => {
    it("returns empty array when no sessions cached", () => {
      expect(getCachedSessions()).toEqual([]);
    });

    it("returns all cached sessions in order", () => {
      cacheSession(makeSession("ses_001"));
      cacheSession(makeSession("ses_002"));
      cacheSession(makeSession("ses_003"));

      const all = getCachedSessions();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.id)).toEqual(["ses_003", "ses_002", "ses_001"]);
    });
  });

  describe("clearCache", () => {
    it("removes all cached sessions and metadata", () => {
      cacheSession(makeSession("ses_001"));
      cacheSession(makeSession("ses_002"));
      setLastSynced("2026-04-04T12:00:00Z");

      clearCache();

      expect(getLastSession()).toBeNull();
      expect(getCachedSessions()).toEqual([]);
      expect(getLastSynced()).toBeNull();
    });
  });

  describe("lastSynced", () => {
    it("returns null when never synced", () => {
      expect(getLastSynced()).toBeNull();
    });

    it("stores and retrieves last synced timestamp", () => {
      setLastSynced("2026-04-04T12:00:00Z");
      expect(getLastSynced()).toBe("2026-04-04T12:00:00Z");
    });
  });
});
