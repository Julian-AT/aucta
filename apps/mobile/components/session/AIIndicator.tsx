import { View, Text } from "react-native";

/**
 * Non-dismissible "AI" pill badge visible during the entire session.
 * Satisfies EU AI Act Art. 50 transparency requirement (COMP-01).
 * zIndex 9999 ensures it renders above all other UI elements.
 * Position is controlled by the parent SessionHUD.
 */
export function AIIndicator() {
  return (
    <View
      className="bg-ai-indicator-bg rounded-xl px-sm py-xs"
      style={{ zIndex: 9999 }}
      accessibilityLabel="AI-assisted session active"
      accessibilityRole="text"
    >
      <Text className="text-label text-overlay-text">AI</Text>
    </View>
  );
}
