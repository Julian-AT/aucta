import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MockAudioContext } from "./__mocks__/audio";

vi.mock("react-native-audio-api", () => ({
  AudioContext: MockAudioContext,
}));

import { AudioCapture } from "./audio-capture";

describe("AudioCapture", () => {
  let capture: AudioCapture;
  let onChunk: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
  });

  it("stop() stops capture", async () => {
    await capture.start();
    capture.stop();
    expect((capture as any).isCapturing).toBe(false);
  });

  it("uses AUDIO_INPUT_SAMPLE_RATE (16000)", async () => {
    await capture.start();
    const ctx = (capture as any).ctx as MockAudioContext;
    expect(ctx.sampleRate).toBe(16000);
  });

  it("destroy() releases resources", async () => {
    await capture.start();
    const ctx = (capture as any).ctx as MockAudioContext;
    capture.destroy();
    expect(ctx.state).toBe("closed");
    expect((capture as any).ctx).toBeNull();
  });

  it("onChunk callback is stored in deps", () => {
    expect((capture as any).deps.onChunk).toBe(onChunk);
  });
});
