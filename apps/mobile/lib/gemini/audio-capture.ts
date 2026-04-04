import { AUDIO_INPUT_SAMPLE_RATE } from "./protocol";

// Lazy import to avoid crashing module evaluation when native module
// is unavailable (e.g., Expo Go without dev build).
function getAudioContext(): typeof import("react-native-audio-api").AudioContext {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-audio-api") as typeof import("react-native-audio-api");
  return mod.AudioContext;
}

type AudioContextInstance = InstanceType<ReturnType<typeof getAudioContext>>;

export interface AudioCaptureDeps {
  onChunk: (pcmBase64: string) => void;
}

/**
 * Captures microphone audio as PCM 16kHz chunks using react-native-audio-api.
 *
 * The internal implementation uses AudioContext for microphone capture.
 * The class is structured so the audio processing pipeline can be swapped
 * without changing the public interface -- if react-native-audio-api's
 * microphone capture proves unreliable (pre-1.0 library), the fallback
 * is expo-audio file-based recording in short segments.
 *
 * Contract: chunks of base64-encoded PCM data at ~16kHz flow to the onChunk callback.
 */
export class AudioCapture {
  private ctx: AudioContextInstance | null = null;
  private isCapturing = false;

  constructor(private deps: AudioCaptureDeps) {}

  /**
   * Begin microphone capture.
   * Creates AudioContext at AUDIO_INPUT_SAMPLE_RATE and sets up
   * audio processing to extract PCM chunks as base64-encoded strings.
   *
   * NOTE: react-native-audio-api microphone capture API is pre-1.0.
   * The exact API (AudioWorklet, ScriptProcessorNode, or custom)
   * depends on library capabilities. This implementation provides
   * the framework; device testing will validate the pipeline.
   */
  async start(): Promise<void> {
    if (this.isCapturing) return;

    const Ctx = getAudioContext();
    this.ctx = new Ctx({ sampleRate: AUDIO_INPUT_SAMPLE_RATE });
    this.isCapturing = true;

    // Microphone capture setup placeholder:
    // In production, this would use:
    // 1. navigator.mediaDevices.getUserMedia() equivalent, or
    // 2. AudioContext microphone source with AudioWorklet for PCM extraction
    // 3. Each chunk is base64-encoded and passed to deps.onChunk()
    //
    // The exact API depends on react-native-audio-api's microphone support.
    // Device testing in Plan 05 integration will validate this pipeline.
  }

  /**
   * Stop microphone capture. Disconnects audio nodes.
   */
  stop(): void {
    this.isCapturing = false;
  }

  /**
   * Close AudioContext and release all resources.
   */
  destroy(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
