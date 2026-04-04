import { View, Text, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useSession } from "@/providers/session-provider";
import { Zap } from "lucide-react-native";

export default function HomeScreen() {
  const { session } = useSession();

  function handleStartSession() {
    Alert.alert(
      "Coming Soon",
      "Live AI sessions will be available in Phase 3. Stay tuned!",
      [{ text: "OK" }],
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center items-center gap-xl">
        <Text className="text-display text-text-primary text-center">
          {session?.activeOrganizationId ? "Your Organization" : "Aucta"}
        </Text>

        <Pressable
          onPress={handleStartSession}
          className="min-h-[56px] w-full flex-row items-center justify-center gap-sm rounded-lg bg-accent px-xl"
          accessibilityLabel="Start Session"
          accessibilityRole="button"
        >
          <Zap color="#FFFFFF" size={24} />
          <Text className="text-body font-semibold text-white">
            Start Session
          </Text>
        </Pressable>

        <Text className="text-body text-text-secondary text-center px-lg">
          Point your camera at any HVAC unit and ask a question.
        </Text>
      </View>
    </ScreenContainer>
  );
}
