import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect } from "react";

interface ConnectionStatusProps {
  quality: "connected" | "reconnecting" | "lost";
}

const STATUS_CONFIG = {
  connected: { label: "Connected", dotClass: "bg-status-connected" },
  reconnecting: { label: "Reconnecting...", dotClass: "bg-status-reconnecting" },
  lost: { label: "Connection lost", dotClass: "bg-status-lost" },
} as const;

export function ConnectionStatus({ quality }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[quality];
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (quality === "reconnecting") {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
  }, [quality, pulseOpacity]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View
      className="flex-row items-center gap-xs bg-overlay-bg-light rounded-lg px-sm py-xs"
      accessibilityLabel={`Connection status: ${config.label}`}
      accessibilityRole="text"
    >
      <Animated.View
        className={`w-[8px] h-[8px] rounded-full ${config.dotClass}`}
        style={dotAnimatedStyle}
      />
      <Text className="text-label text-overlay-text">{config.label}</Text>
    </View>
  );
}
