import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FrameCapture } from "./frame-capture";

describe("FrameCapture", () => {
  let frameCapture: FrameCapture;
  let onFrame: ReturnType<typeof vi.fn>;
  let mockTakePictureAsync: ReturnType<typeof vi.fn>;
  let cameraRef: { current: { takePictureAsync: ReturnType<typeof vi.fn> } | null };

  beforeEach(() => {
    vi.useFakeTimers();
    onFrame = vi.fn();
    mockTakePictureAsync = vi.fn().mockResolvedValue({ base64: "test-jpeg-data" });
    cameraRef = { current: { takePictureAsync: mockTakePictureAsync } };
    frameCapture = new FrameCapture({
      cameraRef: cameraRef as any,
      onFrame,
    });
  });

  afterEach(() => {
    frameCapture.stop();
    vi.useRealTimers();
  });

  it("start() begins interval-based capture at CAPTURE_INTERVAL_MS (1000ms)", async () => {
    frameCapture.start();

    // No calls immediately
    expect(mockTakePictureAsync).not.toHaveBeenCalled();

    // Advance by one interval (async to let promises resolve + unlock isCapturing)
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);

    // Advance by another interval
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(2);
  });

  it("each interval calls takePictureAsync with base64 and quality options", async () => {
    frameCapture.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(mockTakePictureAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        base64: true,
        quality: 0.6,
      }),
    );
  });

  it("onFrame callback receives base64 string from captured photo", async () => {
    frameCapture.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onFrame).toHaveBeenCalledWith("test-jpeg-data");
  });

  it("concurrent capture guard prevents overlapping takePictureAsync calls", async () => {
    // Make takePictureAsync take a long time (stays pending until we resolve)
    let resolveCapture!: (v: any) => void;
    mockTakePictureAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCapture = resolve;
        }),
    );

    frameCapture.start();

    // First interval triggers capture
    vi.advanceTimersByTime(1000);
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);

    // Second interval fires while first is still pending -- guard prevents call
    vi.advanceTimersByTime(1000);
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(1);

    // Resolve the first capture to unlock the guard
    resolveCapture({ base64: "delayed-data" });
    await vi.advanceTimersByTimeAsync(0);

    // Third interval should now be able to capture
    vi.advanceTimersByTime(1000);
    expect(mockTakePictureAsync).toHaveBeenCalledTimes(2);
  });

  it("stop() clears the interval", () => {
    frameCapture.start();
    frameCapture.stop();

    vi.advanceTimersByTime(5000);
    expect(mockTakePictureAsync).not.toHaveBeenCalled();
  });

  it("takePictureAsync failure is caught silently, frame skipped", async () => {
    mockTakePictureAsync.mockRejectedValue(new Error("Camera paused"));

    frameCapture.start();
    await vi.advanceTimersByTimeAsync(1000);

    // Should not throw, and onFrame should not be called
    expect(onFrame).not.toHaveBeenCalled();
  });

  it("skips frame when camera ref is null", async () => {
    cameraRef.current = null;

    frameCapture.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onFrame).not.toHaveBeenCalled();
  });
});
