import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockAudioContext, MockAudioBufferSourceNode, MockAudioBuffer } from "./__mocks__/audio";

vi.mock("react-native-audio-api", () => ({
  AudioContext: MockAudioContext,
}));

import { AudioPlayback } from "./audio-playback";

/**
 * Helper: encode a 16-bit PCM buffer (little-endian) as base64.
 * Each sample is two bytes; values are signed Int16.
 */
function pcm16ToBase64(samples: number[]): string {
  const bytes = new Uint8Array(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    bytes[i * 2] = s & 0xff;
    bytes[i * 2 + 1] = (s >> 8) & 0xff;
  }
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

describe("AudioPlayback", () => {
  let playback: AudioPlayback;

  beforeEach(() => {
    playback = new AudioPlayback();
  });

  it("creates AudioContext with 24000 sample rate", () => {
    const ctx = (playback as any).ctx as MockAudioContext;
    expect(ctx.sampleRate).toBe(24000);
  });

  it("enqueueChunk converts base64 PCM to Float32Array in -1.0 to 1.0 range", () => {
    // Known PCM samples: 0, 16384 (~0.5), -16384 (~-0.5), 32767 (~1.0)
    const samples = [0, 16384, -16384, 32767];
    const base64 = pcm16ToBase64(samples);

    playback.enqueueChunk(base64);

    const ctx = (playback as any).ctx as MockAudioContext;
    expect(ctx._buffers).toHaveLength(1);

    const buffer = ctx._buffers[0];
    const channelData = buffer.getChannelData(0);
    expect(channelData).toHaveLength(4);
    expect(channelData[0]).toBeCloseTo(0, 5);           // 0 / 32768
    expect(channelData[1]).toBeCloseTo(0.5, 2);         // 16384 / 32768
    expect(channelData[2]).toBeCloseTo(-0.5, 2);        // -16384 / 32768
    expect(channelData[3]).toBeCloseTo(32767 / 32768, 4); // ~1.0
  });

  it("enqueueChunk schedules AudioBufferSourceNode with correct sample rate", () => {
    const base64 = pcm16ToBase64([100, 200, 300, 400]);
    playback.enqueueChunk(base64);

    const ctx = (playback as any).ctx as MockAudioContext;
    expect(ctx._sources).toHaveLength(1);

    const source = ctx._sources[0];
    expect(source.connected).toBe(true);
    expect(source.startTime).not.toBeNull();
    expect(source.buffer).not.toBeNull();
    expect(source.buffer!.sampleRate).toBe(24000);
  });

  it("consecutive enqueueChunk calls schedule buffers at increasing start times", () => {
    const base64 = pcm16ToBase64([100, 200, 300, 400]);

    playback.enqueueChunk(base64);
    playback.enqueueChunk(base64);

    const ctx = (playback as any).ctx as MockAudioContext;
    expect(ctx._sources).toHaveLength(2);

    const firstStart = ctx._sources[0].startTime!;
    const secondStart = ctx._sources[1].startTime!;
    expect(secondStart).toBeGreaterThan(firstStart);

    // Second start should equal first start + first buffer duration
    const firstDuration = ctx._buffers[0].duration;
    expect(secondStart).toBeCloseTo(firstStart + firstDuration, 10);
  });

  it("interrupt() stops all scheduled playback and resets nextStartTime", () => {
    const base64 = pcm16ToBase64([100, 200, 300, 400]);
    playback.enqueueChunk(base64);

    const oldCtx = (playback as any).ctx as MockAudioContext;
    playback.interrupt();

    const newCtx = (playback as any).ctx as MockAudioContext;
    expect(newCtx).not.toBe(oldCtx);
    expect(oldCtx.state).toBe("closed");
    expect((playback as any).nextStartTime).toBe(newCtx.currentTime);
  });

  it("enqueueChunk after interrupt() resumes scheduling from current time", () => {
    const base64 = pcm16ToBase64([100, 200]);

    playback.enqueueChunk(base64);
    playback.interrupt();

    // Simulate time advancing on the new context
    const ctx = (playback as any).ctx as MockAudioContext;
    ctx.currentTime = 5.0;
    (playback as any).nextStartTime = ctx.currentTime;

    playback.enqueueChunk(base64);

    // The source scheduled on the new context should start at >= 5.0
    expect(ctx._sources).toHaveLength(1);
    expect(ctx._sources[0].startTime).toBeGreaterThanOrEqual(5.0);
  });

  it("destroy() closes AudioContext", async () => {
    const ctx = (playback as any).ctx as MockAudioContext;
    playback.destroy();
    expect(ctx.state).toBe("closed");
  });
});
