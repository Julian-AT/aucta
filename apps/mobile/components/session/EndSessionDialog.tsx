import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

interface EndSessionDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EndSessionDialog({
  visible,
  onConfirm,
  onCancel,
}: EndSessionDialogProps) {
  if (!visible) return null;

  return (
    <Animated.View
      className="absolute inset-0 bg-overlay-bg items-center justify-center"
      style={{ zIndex: 9998 }}
      entering={FadeIn.duration(200)}
    >
      <Animated.View
        className="bg-background rounded-2xl p-lg mx-lg w-full max-w-sm"
        entering={SlideInDown.duration(200)}
      >
        <Text className="text-heading text-text-primary text-center">
          End this session?
        </Text>

        <Text className="text-body text-text-secondary text-center mt-sm">
          Your session will end and you will return to the home screen.
        </Text>

        <View className="flex-row gap-md mt-lg">
          <Pressable
            onPress={onCancel}
            className="flex-1 min-h-[56px] items-center justify-center rounded-lg bg-surface"
            accessibilityLabel="Continue session"
            accessibilityRole="button"
          >
            <Text className="text-body font-semibold text-text-primary">
              Keep Going
            </Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            className="flex-1 min-h-[56px] items-center justify-center rounded-lg bg-destructive"
            accessibilityLabel="End session and return to home"
            accessibilityRole="button"
          >
            <Text className="text-body font-semibold text-white">
              End Session
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
