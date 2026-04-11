import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";

/**
 * Non-dismissible "AI" pill badge visible during the entire session.
 * Satisfies EU AI Act Art. 50 transparency requirement (COMP-01).
 * zIndex 9999 ensures it renders above all other UI elements.
 * Position is controlled by the parent SessionHUD.
 */
export function AIIndicator() {
  const { t } = useTranslation();

  return (
    <View
      className="bg-ai-indicator-bg rounded-xl px-sm py-xs"
      style={{ zIndex: 9999 }}
      accessibilityLabel={t("aiDisclosure.indicator")}
      accessibilityRole="text"
    >
      <Text className="text-label text-overlay-text">AI</Text>
    </View>
  );
}
