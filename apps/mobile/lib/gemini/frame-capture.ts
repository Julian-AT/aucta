import type { CameraView } from "expo-camera";
import { CAPTURE_INTERVAL_MS, JPEG_QUALITY } from "./protocol";

export interface FrameCaptureDeps {
  cameraRef: React.RefObject<CameraView>;
  onFrame: (jpegBase64: string) => void;
}

/**
 * Captures JPEG frames from the expo-camera CameraView ref at 1 FPS.
 * Includes a guard flag to prevent concurrent captures (pitfall #2 from research:
 * takePictureAsync may take 200-500ms on some devices).
 */
export class FrameCapture {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isCapturing = false;

  constructor(private deps: FrameCaptureDeps) {}

  /**
   * Start interval-based frame capture at CAPTURE_INTERVAL_MS (1000ms = 1 FPS).
   */
  start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = setInterval(async () => {
      // Skip if previous capture still in progress (concurrent guard)
      if (this.isCapturing) return;
      // Skip if camera ref is not available (app may be backgrounded per D-08)
      if (!this.deps.cameraRef.current) return;

      this.isCapturing = true;
      try {
        const photo = await this.deps.cameraRef.current.takePictureAsync({
          base64: true,
          quality: JPEG_QUALITY,
        });
        if (photo?.base64) {
          this.deps.onFrame(photo.base64);
        }
      } catch {
        // Camera may be paused when app is backgrounded (D-08), skip frame silently
      } finally {
        this.isCapturing = false;
      }
    }, CAPTURE_INTERVAL_MS);
  }

  /**
   * Stop frame capture. Clears the interval.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
