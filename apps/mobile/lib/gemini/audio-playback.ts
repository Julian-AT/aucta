import { AUDIO_OUTPUT_SAMPLE_RATE } from "./protocol";

// Lazy import to avoid crashing module evaluation when native module
// is unavailable (e.g., Expo Go without dev build).
// react-native-audio-api requires a dev build with native modules.
function getAudioContext(): typeof import("react-native-audio-api").AudioContext {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-audio-api") as typeof import("react-native-audio-api");
  return mod.AudioContext;
}

/**
 * Decode a base64 string to a Uint8Array.
 * Uses atob() available in React Native 0.83+.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert 16-bit PCM (little-endian signed integers) to Float32Array.
 * Each pair of bytes forms one Int16 sample, divided by 32768 to normalize to -1.0..1.0.
 */
function pcm16ToFloat32(pcmBytes: Uint8Array): Float32Array {
  const sampleCount = Math.floor(pcmBytes.length / 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const byte1 = pcmBytes[i * 2];
    const byte2 = pcmBytes[i * 2 + 1];
    // Reconstruct signed Int16 (little-endian)
    let int16 = byte1 | (byte2 << 8);
    if (int16 >= 32768) {
      int16 -= 65536;
    }
    float32[i] = int16 / 32768.0;
  }
  return float32;
}

/**
 * Plays back Gemini's 24kHz PCM audio response stream using
 * the Web Audio API pattern from react-native-audio-api.
 *
 * Schedules sequential AudioBufferSourceNode instances for gapless playback.
 * Supports barge-in via interrupt() which cancels all scheduled audio.
 */
export class AudioPlayback {
  private ctx: InstanceType<ReturnType<typeof getAudioContext>>;
  private nextStartTime: number;

  constructor() {
    const Ctx = getAudioContext();
    this.ctx = new Ctx({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE });
    this.nextStartTime = this.ctx.currentTime;
  }

  /**
   * Enqueue a base64-encoded PCM 16-bit chunk for gapless playback.
   * Decodes, converts to Float32, creates an AudioBuffer, schedules it.
   */
  enqueueChunk(pcmBase64: string): void {
    const pcmBytes = base64ToUint8Array(pcmBase64);
    const float32 = pcm16ToFloat32(pcmBytes);

    const buffer = this.ctx.createBuffer(1, float32.length, AUDIO_OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    // Schedule seamlessly after previous chunk
    const startTime = Math.max(this.nextStartTime, this.ctx.currentTime);
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  /**
   * On barge-in (D-07): stop all scheduled audio immediately.
   * Closes existing AudioContext and creates a fresh one, cancelling
   * all pre-scheduled AudioBufferSourceNode instances.
   */
  interrupt(): void {
    this.ctx.close();
    const Ctx = getAudioContext();
    this.ctx = new Ctx({ sampleRate: AUDIO_OUTPUT_SAMPLE_RATE });
    this.nextStartTime = this.ctx.currentTime;
  }

  /**
   * Close AudioContext. Called on session end.
   */
  destroy(): void {
    this.ctx.close();
  }
}
