import { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { useSessionStore } from "@/stores/session-store";
import { useGeminiSession } from "@/hooks/useGeminiSession";
import { usePermissions } from "@/hooks/usePermissions";
import { useBackgroundAudio } from "@/hooks/useBackgroundAudio";
import { SessionHUD } from "./SessionHUD";
import { AIDisclosureModal } from "./AIDisclosureModal";
import { EndSessionDialog } from "./EndSessionDialog";
import { ConnectionLostOverlay } from "./ConnectionLostOverlay";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

/**
 * Full-screen camera with HUD overlay -- the main session interface.
 *
 * Manages the complete session lifecycle state machine:
 * idle -> requesting-permissions -> disclosure -> connecting -> active -> completed
 *
 * Camera fills the entire screen (D-01). HUD floats as translucent overlay.
 * Two-tap start: Start Session (Home) + I Understand (disclosure) per SESS-01.
 */
export function SessionScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const { width, height } = useWindowDimensions();
  const orientation = width > height ? "landscape" : "portrait";

  const [showEndDialog, setShowEndDialog] = useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  const { allGranted, requestAll, isChecking } = usePermissions();
  const {
    startSession,
    endSession,
    status,
    connectionQuality,
    isAISpeaking,
  } = useGeminiSession(cameraRef);

  // Keep audio pipeline alive when backgrounded (D-08)
  useBackgroundAudio(
    status === "active" ||
      status === "connecting" ||
      status === "reconnecting",
  );

  // Permission + disclosure flow on mount
  useEffect(() => {
    if (isChecking) return;

    if (!allGranted) {
      useSessionStore.getState().setStatus("requesting-permissions");
      requestAll().then((result) => {
        if (result.camera && result.mic) {
          useSessionStore.getState().setStatus("disclosure");
        } else {
          useSessionStore
            .getState()
            .setError(
              "Camera and microphone access is required for AI-assisted sessions. Please enable them in Settings.",
            );
          useSessionStore.getState().setStatus("failed");
        }
      });
    } else if (status === "idle") {
      useSessionStore.getState().setStatus("disclosure");
    }
  }, [isChecking, allGranted, requestAll, status]);

  const handleDisclosureAccept = useCallback(() => {
    setDisclosureAccepted(true);
    startSession();
  }, [startSession]);

  const handleEndConfirm = useCallback(() => {
    setShowEndDialog(false);
    endSession();
    const serverSessionId = useSessionStore.getState().serverSessionId;
    if (serverSessionId) {
      router.replace({
        pathname: "/(app)/feedback",
        params: { sessionId: serverSessionId },
      });
    } else {
      router.replace("/(app)/(tabs)");
    }
  }, [endSession, router]);

  const handleStartNew = useCallback(() => {
    endSession();
    const serverSessionId = useSessionStore.getState().serverSessionId;
    if (serverSessionId) {
      router.replace({
        pathname: "/(app)/feedback",
        params: { sessionId: serverSessionId },
      });
    } else {
      router.replace("/(app)/(tabs)");
    }
  }, [endSession, router]);

  return (
    <View style={styles.container}>
      {/* Camera (absolute fill) -- shown after disclosure accepted (D-10: camera-first) */}
      {disclosureAccepted && (
        <CameraView
          ref={cameraRef}
          facing="back"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* HUD overlay (absolute fill, on top of camera) */}
      {disclosureAccepted && status !== "idle" && status !== "completed" && (
        <SessionHUD
          orientation={orientation}
          connectionQuality={connectionQuality}
          isAISpeaking={isAISpeaking}
          showAudioIndicator={status === "active"}
          showStopButton={
            status !== "failed" &&
            status !== "timeout" &&
            status !== "completed"
          }
          onStopPress={() => setShowEndDialog(true)}
        />
      )}

      {/* AI Disclosure Modal -- blocks until acknowledged (COMP-02) */}
      <AIDisclosureModal
        visible={status === "disclosure"}
        onAccept={handleDisclosureAccept}
      />

      {/* End Session Dialog (D-11) */}
      <EndSessionDialog
        visible={showEndDialog}
        onConfirm={handleEndConfirm}
        onCancel={() => setShowEndDialog(false)}
      />

      {/* Connection Lost Overlay (D-14) */}
      {(status === "failed" || status === "timeout") && (
        <ConnectionLostOverlay onStartNew={handleStartNew} />
      )}

      {/* Loading state while checking permissions */}
      {status === "requesting-permissions" && <LoadingSpinner />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
});
