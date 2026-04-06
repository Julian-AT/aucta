import { useState, useCallback } from "react";
import { useCameraPermissions, useMicrophonePermissions } from "expo-camera";

export type PermissionStatus = "undetermined" | "granted" | "denied";

/**
 * Checks and requests camera + microphone permissions using Expo Camera APIs.
 * Both permissions are required before a session can start.
 * expo-camera exposes useMicrophonePermissions alongside useCameraPermissions.
 */
export function usePermissions() {
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();

  const cameraGranted = cameraPermission?.granted ?? false;
  const micGranted = micPermission?.granted ?? false;

  const requestAll = useCallback(async (): Promise<{
    camera: boolean;
    mic: boolean;
  }> => {
    const [camResult, micResult] = await Promise.all([
      requestCamera(),
      requestMic(),
    ]);
    return {
      camera: camResult.granted,
      mic: micResult.granted,
    };
  }, [requestCamera, requestMic]);

  return {
    cameraGranted,
    micGranted,
    allGranted: cameraGranted && micGranted,
    requestAll,
    isChecking: !cameraPermission || !micPermission,
  };
}
