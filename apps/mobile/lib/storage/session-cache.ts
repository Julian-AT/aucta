/**
 * MMKV requires NitroModules which is only available in development builds.
 * When running in Expo Go, fall back to an in-memory Map so the app still works
 * (cache won't persist across reloads, but no crash).
 */
interface KVStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function createStorage(): KVStorage {
  try {
    const { createMMKV } = require("react-native-mmkv");
    return createMMKV({ id: "session-cache" });
  } catch {
    console.warn("[session-cache] MMKV unavailable, using in-memory fallback");
    const map = new Map<string, string>();
    return {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => { map.set(key, value); },
      remove: (key: string) => { map.delete(key); },
    };
  }
}

const storage = createStorage();

const KEYS = {
  sessionIds: "cache:sessionIds",
  session: (id: string) => `cache:session:${id}`,
  lastSynced: "cache:lastSynced",
} as const;

const MAX_CACHED = 20;

export interface CachedSession {
  id: string;
  summary: string | null;
  isAiGenerated: boolean;
  durationMs: number | null;
  languageDetected: string | null;
  toolsUsed: string[] | null;
  feedbackRating: number | null;
  startedAt: string;
  endedAt: string | null;
}

function getSessionIds(): string[] {
  const raw = storage.getString(KEYS.sessionIds);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}

function setSessionIds(ids: string[]): void {
  storage.set(KEYS.sessionIds, JSON.stringify(ids));
}

export function cacheSession(session: CachedSession): void {
  storage.set(KEYS.session(session.id), JSON.stringify(session));

  const ids = getSessionIds().filter((id) => id !== session.id);
  ids.unshift(session.id);

  // Evict oldest sessions beyond the cache limit
  while (ids.length > MAX_CACHED) {
    const evicted = ids.pop()!;
    storage.remove(KEYS.session(evicted));
  }

  setSessionIds(ids);
}

export function getLastSession(): CachedSession | null {
  const ids = getSessionIds();
  if (ids.length === 0) return null;

  const raw = storage.getString(KEYS.session(ids[0]!));
  if (!raw) return null;

  return JSON.parse(raw) as CachedSession;
}

export function getCachedSessions(): CachedSession[] {
  const ids = getSessionIds();
  const sessions: CachedSession[] = [];

  for (const id of ids) {
    const raw = storage.getString(KEYS.session(id));
    if (raw) {
      sessions.push(JSON.parse(raw) as CachedSession);
    }
  }

  return sessions;
}

export function clearCache(): void {
  const ids = getSessionIds();
  for (const id of ids) {
    storage.remove(KEYS.session(id));
  }
  storage.remove(KEYS.sessionIds);
  storage.remove(KEYS.lastSynced);
}

export function getLastSynced(): string | null {
  return storage.getString(KEYS.lastSynced) ?? null;
}

export function setLastSynced(iso: string): void {
  storage.set(KEYS.lastSynced, iso);
}
