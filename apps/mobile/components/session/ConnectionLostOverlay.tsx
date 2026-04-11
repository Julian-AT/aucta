import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface ConnectionLostOverlayProps {
  onStartNew: () => void;
}

export function ConnectionLostOverlay({ onStartNew }: ConnectionLostOverlayProps) {
  return (
    <Animated.View
      className="absolute inset-0 bg-overlay-bg items-center justify-center"
      entering={FadeIn.duration(400)}
    >
      <View className="items-center px-lg">
        <Text className="text-heading text-overlay-text text-center">
          Connection Lost
        </Text>

        <Text className="text-body text-overlay-text-muted text-center px-lg mt-sm">
          Your session has ended due to a network issue. Your work is not
          affected.
        </Text>

        <Pressable
          onPress={onStartNew}
          className="min-h-[56px] w-full mt-lg items-center justify-center rounded-lg bg-accent"
          accessibilityLabel="Start a new AI session"
          accessibilityRole="button"
        >
          <Text className="text-body font-semibold text-white">
            Start New Session
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
