import { View, Text, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

interface ConnectionLostOverlayProps {
  onStartNew: () => void;
}

export function ConnectionLostOverlay({ onStartNew }: ConnectionLostOverlayProps) {
  const { t } = useTranslation();

  return (
    <Animated.View
      className="absolute inset-0 bg-overlay-bg items-center justify-center"
      entering={FadeIn.duration(400)}
    >
      <View className="items-center px-lg">
        <Text className="text-heading text-overlay-text text-center">
          {t("session.connectionLost")}
        </Text>

        <Text className="text-body text-overlay-text-muted text-center px-lg mt-sm">
          {t("session.timeout")}
        </Text>

        <Pressable
          onPress={onStartNew}
          className="min-h-[56px] w-full mt-lg items-center justify-center rounded-lg bg-accent"
          accessibilityLabel={t("session.startSession")}
          accessibilityRole="button"
        >
          <Text className="text-body font-semibold text-white">
            {t("session.startSession")}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
