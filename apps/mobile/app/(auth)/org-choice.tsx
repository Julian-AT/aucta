import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Building2, Users } from "lucide-react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";

export default function OrgChoiceScreen() {
  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-lg">
        <View className="gap-sm">
          <Text className="text-heading text-text-primary">
            Set up your workspace
          </Text>
          <Text className="text-body text-text-secondary">
            Create a new organization or join your team with an invite code.
          </Text>
        </View>

        <View className="gap-lg">
          <Pressable
            onPress={() => router.push("/(auth)/create-org")}
            className="min-h-[56px] flex-row items-center gap-md rounded-lg bg-accent px-lg"
            accessibilityLabel="Create Organization"
            accessibilityRole="button"
          >
            <Building2 color="#FFFFFF" size={24} />
            <Text className="text-body font-semibold text-white">
              Create Organization
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/join-org")}
            className="min-h-[56px] flex-row items-center gap-md rounded-lg border border-border-default bg-surface px-lg"
            accessibilityLabel="Join with invite code"
            accessibilityRole="button"
          >
            <Users color="#2563EB" size={24} />
            <Text className="text-body font-semibold text-text-primary">
              Join with invite code
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
