import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Manages background audio lifecycle for active sessions.
 *
 * Android: Creates a foreground service notification via @notifee/react-native
 * to keep the audio pipeline alive when the app is backgrounded (D-08).
 *
 * iOS: Background audio mode is configured in app.json (UIBackgroundModes: ["audio"]).
 * No runtime code needed beyond keeping AudioContext alive.
 */
export function useBackgroundAudio(isSessionActive: boolean) {
  useEffect(() => {
    if (!isSessionActive) return;

    if (Platform.OS === "android") {
      let cancelled = false;

      const startForegroundService = async () => {
        try {
          const notifee = await import("@notifee/react-native");
          if (cancelled) return;

          const channelId = await notifee.default.createChannel({
            id: "session",
            name: "AI Session",
            importance: 3,
          });

          if (cancelled) return;

          await notifee.default.displayNotification({
            title: "Aucta AI Session",
            body: "AI session is active",
            android: {
              channelId,
              asForegroundService: true,
              ongoing: true,
            },
          });
        } catch {
          // Notifee may not be available in dev builds -- log but don't crash
          console.warn("[BackgroundAudio] Failed to start foreground service");
        }
      };

      startForegroundService();

      return () => {
        cancelled = true;
        import("@notifee/react-native")
          .then((notifee) => {
            notifee.default.cancelAllNotifications();
          })
          .catch(() => {});
      };
    }

    // iOS: background audio mode is configured in app.json (UIBackgroundModes: ["audio"])
    return undefined;
  }, [isSessionActive]);
}
