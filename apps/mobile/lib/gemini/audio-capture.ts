import { AUDIO_INPUT_SAMPLE_RATE, AUDIO_INPUT_CHANNELS } from "./protocol";

/**
 * Convert Float32 PCM samples (-1.0 to 1.0) to base64-encoded Int16 PCM.
 * Gemini Live API expects 16-bit PCM, 16kHz, little-endian.
 */
function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 32768 : s * 32767;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface AudioCaptureDeps {
  onChunk: (pcmBase64: string) => void;
}

/**
 * Captures microphone audio as PCM 16kHz chunks using react-native-audio-api's
 * AudioRecorder. Streams Float32 PCM from onAudioReady callback, converts to
 * Int16 base64, and delivers via deps.onChunk().
 *
 * Contract: chunks of base64-encoded 16-bit PCM data at 16kHz flow to the onChunk callback.
 */
export class AudioCapture {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recorder: any = null;
  private isCapturing = false;

  constructor(private deps: AudioCaptureDeps) {}

  /**
   * Begin microphone capture.
   * Creates an AudioRecorder, registers onAudioReady with 16kHz/mono/4096 config,
   * and starts streaming PCM chunks to deps.onChunk().
   */
  async start(): Promise<void> {
    if (this.isCapturing) return;

    // Lazy-load to avoid Expo Go crash at module evaluation time.
    // react-native-audio-api is a native module only available in development builds.
    let AudioRecorder;
    try {
      const mod = await import("react-native-audio-api");
      AudioRecorder = mod.AudioRecorder;
    } catch {
      throw new Error(
        "react-native-audio-api not available. Audio capture requires a development build (not Expo Go).",
      );
    }
    this.recorder = new AudioRecorder();

    const result = this.recorder.onAudioReady(
      {
        sampleRate: AUDIO_INPUT_SAMPLE_RATE,
        bufferLength: 4096,
        channelCount: AUDIO_INPUT_CHANNELS,
      },
      (event: { buffer: { getChannelData(channel: number): Float32Array } }) => {
        const float32 = event.buffer.getChannelData(0);
        const base64Pcm = float32ToPcm16Base64(float32);
        this.deps.onChunk(base64Pcm);
      },
    );

    if (result.status === "error") {
      throw new Error(`AudioRecorder.onAudioReady failed: ${result.message}`);
    }

    const startResult = this.recorder.start();
    if (startResult.status === "error") {
      throw new Error(`AudioRecorder.start failed: ${startResult.message}`);
    }

    this.isCapturing = true;
  }

  /**
   * Pause microphone capture. Disconnects audio stream without releasing recorder.
   */
  stop(): void {
    this.recorder?.pause();
    this.isCapturing = false;
  }

  /**
   * Stop recording and release all resources.
   */
  destroy(): void {
    this.stop();
    this.recorder?.stop();
    this.recorder?.clearOnAudioReady();
    this.recorder?.clearOnError();
    this.recorder = null;
  }
}

export { float32ToPcm16Base64 };
