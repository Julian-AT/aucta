import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateBackoff, reconnectWithBackoff } from "./reconnection";
import type { ReconnectDeps } from "./reconnection";
import type { ConnectionQuality } from "@/stores/session-store";
import {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_JITTER_MS,
  RECONNECT_TIMEOUT_MS,
} from "./protocol";

describe("calculateBackoff", () => {
  it("returns approximately BACKOFF_BASE_MS for attempt 0", () => {
    const delay = calculateBackoff(0);
    expect(delay).toBeGreaterThanOrEqual(BACKOFF_BASE_MS);
    expect(delay).toBeLessThanOrEqual(BACKOFF_BASE_MS + BACKOFF_JITTER_MS);
  });

  it("returns approximately 2000ms for attempt 1", () => {
    const delay = calculateBackoff(1);
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(2000 + BACKOFF_JITTER_MS);
  });

  it("returns approximately 4000ms for attempt 2", () => {
    const delay = calculateBackoff(2);
    expect(delay).toBeGreaterThanOrEqual(4000);
    expect(delay).toBeLessThanOrEqual(4000 + BACKOFF_JITTER_MS);
  });

  it("does not exceed BACKOFF_MAX_MS + BACKOFF_JITTER_MS for high attempts", () => {
    const delay = calculateBackoff(10);
    expect(delay).toBeLessThanOrEqual(BACKOFF_MAX_MS + BACKOFF_JITTER_MS);
  });

  it("follows exponential growth pattern", () => {
    // With jitter stripped, the base should double each attempt
    // We test multiple samples to account for random jitter
    const attempt3Base = BACKOFF_BASE_MS * Math.pow(2, 3); // 8000
    const delay = calculateBackoff(3);
    expect(delay).toBeGreaterThanOrEqual(attempt3Base);
    expect(delay).toBeLessThanOrEqual(attempt3Base + BACKOFF_JITTER_MS);
  });
});

describe("reconnectWithBackoff", () => {
  let mockConnect: ReturnType<typeof vi.fn>;
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnGiveUp: ReturnType<typeof vi.fn>;
  let mockSetConnectionQuality: ReturnType<typeof vi.fn>;

  function createDeps(overrides?: Partial<ReconnectDeps>): ReconnectDeps {
    return {
      connect: mockConnect as unknown as ReconnectDeps["connect"],
      onSuccess: mockOnSuccess as unknown as ReconnectDeps["onSuccess"],
      onGiveUp: mockOnGiveUp as unknown as ReconnectDeps["onGiveUp"],
      getSessionStore: () => ({
        setConnectionQuality: mockSetConnectionQuality as unknown as (quality: ConnectionQuality) => void,
      }),
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    mockConnect = vi.fn().mockResolvedValue(false);
    mockOnSuccess = vi.fn();
    mockOnGiveUp = vi.fn();
    mockSetConnectionQuality = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls connect repeatedly with increasing delays", async () => {
    mockConnect.mockResolvedValue(false);

    const promise = reconnectWithBackoff(createDeps());

    // First attempt after ~1000ms base delay
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Second attempt after ~2000ms more
    await vi.advanceTimersByTimeAsync(2500);
    expect(mockConnect).toHaveBeenCalledTimes(2);

    // Let the loop run to completion (give-up)
    await vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT_MS);
    await promise;
  });

  it("stops and calls onSuccess when connect returns true", async () => {
    mockConnect
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const promise = reconnectWithBackoff(createDeps());

    // Advance past first attempt
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockOnSuccess).not.toHaveBeenCalled();

    // Advance past second attempt
    await vi.advanceTimersByTimeAsync(2500);
    await promise;

    expect(mockConnect).toHaveBeenCalledTimes(2);
    expect(mockOnSuccess).toHaveBeenCalledOnce();
    expect(mockOnGiveUp).not.toHaveBeenCalled();
  });

  it("calls onGiveUp after RECONNECT_TIMEOUT_MS", async () => {
    mockConnect.mockResolvedValue(false);

    const promise = reconnectWithBackoff(createDeps());

    // Advance well past the 2-minute timeout
    await vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT_MS + 60_000);
    await promise;

    expect(mockOnGiveUp).toHaveBeenCalledOnce();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("updates connectionQuality to 'reconnecting' during attempts", async () => {
    mockConnect
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const promise = reconnectWithBackoff(createDeps());

    // Advance past first attempt
    await vi.advanceTimersByTimeAsync(1500);
    expect(mockSetConnectionQuality).toHaveBeenCalledWith("reconnecting");

    await vi.advanceTimersByTimeAsync(2500);
    await promise;
  });

  it("updates connectionQuality to 'lost' on give-up", async () => {
    mockConnect.mockResolvedValue(false);

    const promise = reconnectWithBackoff(createDeps());

    await vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT_MS + 60_000);
    await promise;

    expect(mockSetConnectionQuality).toHaveBeenCalledWith("lost");
  });

  it("calls onSuccess immediately if first connect succeeds", async () => {
    mockConnect.mockResolvedValueOnce(true);

    const promise = reconnectWithBackoff(createDeps());

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockOnSuccess).toHaveBeenCalledOnce();
  });
});
