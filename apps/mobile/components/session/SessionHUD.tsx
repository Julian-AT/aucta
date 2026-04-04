import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AIIndicator } from "./AIIndicator";
import { ConnectionStatus } from "./ConnectionStatus";
import { AudioIndicator } from "./AudioIndicator";
import { StopButton } from "./StopButton";

interface SessionHUDProps {
  orientation: "portrait" | "landscape";
  connectionQuality: "connected" | "reconnecting" | "lost";
  isAISpeaking: boolean;
  showAudioIndicator: boolean;
  showStopButton: boolean;
  onStopPress: () => void;
}

export function SessionHUD({
  orientation,
  connectionQuality,
  isAISpeaking,
  showAudioIndicator,
  showStopButton,
  onStopPress,
}: SessionHUDProps) {
  const insets = useSafeAreaInsets();

  const isLandscape = orientation === "landscape";

  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      {/* Top row: AI indicator (left) + Connection status (right) */}
      <View
        className="absolute left-0 right-0 flex-row justify-between items-center px-md"
        style={{ top: insets.top + 16 }}
        pointerEvents="box-none"
      >
        <AIIndicator />
        <ConnectionStatus quality={connectionQuality} />
      </View>

      {isLandscape ? (
        <>
          {/* Landscape: audio indicator center-right, left of stop button */}
          {showAudioIndicator && (
            <View
              className="absolute"
              style={{
                right: insets.right + 112,
                top: "50%",
                transform: [{ translateY: -20 }],
              }}
              pointerEvents="box-none"
            >
              <AudioIndicator isAISpeaking={isAISpeaking} />
            </View>
          )}

          {/* Landscape: stop button right edge, vertically centered */}
          {showStopButton && (
            <View
              className="absolute"
              style={{
                right: insets.right + 32,
                top: "50%",
                transform: [{ translateY: -28 }],
              }}
              pointerEvents="box-none"
            >
              <StopButton onPress={onStopPress} />
            </View>
          )}
        </>
      ) : (
        <>
          {/* Portrait: audio indicator center-bottom, above stop button */}
          {showAudioIndicator && (
            <View
              className="absolute self-center"
              style={{ bottom: insets.bottom + 120 }}
              pointerEvents="box-none"
            >
              <AudioIndicator isAISpeaking={isAISpeaking} />
            </View>
          )}

          {/* Portrait: stop button bottom center */}
          {showStopButton && (
            <View
              className="absolute self-center"
              style={{ bottom: insets.bottom + 32 }}
              pointerEvents="box-none"
            >
              <StopButton onPress={onStopPress} />
            </View>
          )}
        </>
      )}
    </View>
  );
}
