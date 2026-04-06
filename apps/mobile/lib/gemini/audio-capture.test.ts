import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockOnAudioReady = vi.fn().mockReturnValue({ status: "success" });
const mockStart = vi.fn().mockReturnValue({ status: "success" });
const mockStop = vi.fn().mockReturnValue({ status: "success", path: "", size: 0, duration: 0 });
const mockPause = vi.fn();
const mockClearOnAudioReady = vi.fn();
const mockClearOnError = vi.fn();

vi.mock("react-native-audio-api", () => ({
  AudioRecorder: class MockAudioRecorder {
    onAudioReady = mockOnAudioReady;
    start = mockStart;
    stop = mockStop;
    pause = mockPause;
    clearOnAudioReady = mockClearOnAudioReady;
    clearOnError = mockClearOnError;
    isRecording = vi.fn().mockReturnValue(false);
  },
}));

import { AudioCapture, float32ToPcm16Base64 } from "./audio-capture";

describe("AudioCapture", () => {
  let capture: AudioCapture;
  let onChunk: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onChunk = vi.fn();
    capture = new AudioCapture({ onChunk });
  });

  afterEach(() => {
    capture.destroy();
  });

  it("constructs without errors", () => {
    expect(capture).toBeDefined();
  });

  it("start() begins capture and sets internal state", async () => {
    await capture.start();
    expect((capture as any).isCapturing).toBe(true);
    expect(mockStart).toHaveBeenCalled();
  });

  it("start() registers onAudioReady with 16kHz mono 4096 buffer config", async () => {
    await capture.start();
    expect(mockOnAudioReady).toHaveBeenCalledWith(
      {
        sampleRate: 16000,
        bufferLength: 4096,
        channelCount: 1,
      },
      expect.any(Function),
    );
  });

  it("start() is idempotent -- second call is a no-op", async () => {
    await capture.start();
    await capture.start();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("start() throws if onAudioReady returns error", async () => {
    mockOnAudioReady.mockReturnValueOnce({ status: "error", message: "mic denied" });
    await expect(capture.start()).rejects.toThrow("AudioRecorder.onAudioReady failed: mic denied");
  });

  it("start() throws if recorder.start returns error", async () => {
    mockStart.mockReturnValueOnce({ status: "error", message: "already recording" });
    await expect(capture.start()).rejects.toThrow("AudioRecorder.start failed: already recording");
  });

  it("onAudioReady callback fires onChunk with base64 PCM data", async () => {
    await capture.start();

    // Extract the callback registered with onAudioReady
    const callback = mockOnAudioReady.mock.calls[0][1];

    // Simulate an AudioRecorder event with known Float32 data
    const mockFloat32 = new Float32Array([0.0, 0.5, -0.5, 1.0, -1.0]);
    const mockEvent = {
      buffer: {
        getChannelData: (_channel: number) => mockFloat32,
      },
      numFrames: 5,
      when: 0.0,
    };

    callback(mockEvent);

    expect(onChunk).toHaveBeenCalledTimes(1);
    const base64Result = onChunk.mock.calls[0][0];
    expect(typeof base64Result).toBe("string");
    expect(base64Result.length).toBeGreaterThan(0);
  });

  it("stop() pauses the recorder", async () => {
    await capture.start();
    capture.stop();
    expect(mockPause).toHaveBeenCalled();
    expect((capture as any).isCapturing).toBe(false);
  });

  it("destroy() stops and cleans up recorder", async () => {
    await capture.start();
    capture.destroy();
    expect(mockPause).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockClearOnAudioReady).toHaveBeenCalled();
    expect(mockClearOnError).toHaveBeenCalled();
    expect((capture as any).recorder).toBeNull();
  });

  it("onChunk callback is stored in deps", () => {
    expect((capture as any).deps.onChunk).toBe(onChunk);
  });
});

describe("float32ToPcm16Base64", () => {
  it("correctly converts known Float32 values to Int16 base64", () => {
    const input = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
    const result = float32ToPcm16Base64(input);

    // Decode back to verify
    const binary = atob(result);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Read as Int16 little-endian
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(0, true)).toBe(0);          // 0.0 -> 0
    expect(view.getInt16(2, true)).toBe(16383);       // 0.5 * 32767 = 16383.5 -> 16383
    expect(view.getInt16(4, true)).toBe(-16384);      // -0.5 * 32768 = -16384
    expect(view.getInt16(6, true)).toBe(32767);       // 1.0 * 32767 = 32767
    expect(view.getInt16(8, true)).toBe(-32768);      // -1.0 * 32768 = -32768
  });

  it("clamps values outside -1.0 to 1.0 range", () => {
    const input = new Float32Array([2.0, -2.0]);
    const result = float32ToPcm16Base64(input);

    const binary = atob(result);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(0, true)).toBe(32767);   // clamped to 1.0
    expect(view.getInt16(2, true)).toBe(-32768);  // clamped to -1.0
  });

  it("returns a non-empty base64 string for non-empty input", () => {
    const input = new Float32Array([0.1, 0.2, 0.3]);
    const result = float32ToPcm16Base64(input);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns empty string for empty input", () => {
    const input = new Float32Array([]);
    const result = float32ToPcm16Base64(input);
    expect(result).toBe("");
  });
});
