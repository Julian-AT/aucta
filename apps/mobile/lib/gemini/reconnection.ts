import type { ConnectionQuality } from "../../stores/session-store";
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_JITTER_MS,
  RECONNECT_TIMEOUT_MS,
} from "./protocol";

export interface ReconnectDeps {
  connect: () => Promise<boolean>;
  onSuccess: () => void;
  onGiveUp: () => void;
  getSessionStore: () => {
    setConnectionQuality: (quality: ConnectionQuality) => void;
  };
}

export function calculateBackoff(attempt: number): number {
  const exponential = Math.min(
    BACKOFF_MAX_MS,
    BACKOFF_BASE_MS * Math.pow(2, attempt),
  );
  return exponential + Math.random() * BACKOFF_JITTER_MS;
}

export async function reconnectWithBackoff(
  deps: ReconnectDeps,
): Promise<void> {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < RECONNECT_TIMEOUT_MS) {
    const delay = calculateBackoff(attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Check timeout again after waiting
    if (Date.now() - startTime >= RECONNECT_TIMEOUT_MS) break;

    deps.getSessionStore().setConnectionQuality("reconnecting");

    const success = await deps.connect();
    if (success) {
      deps.onSuccess();
      return;
    }

    attempt++;
  }

  deps.getSessionStore().setConnectionQuality("lost");
  deps.onGiveUp();
}
