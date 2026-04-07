import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  useColorScheme,
} from "react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useSession } from "@/providers/session-provider";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Moon, Sun, Smartphone } from "lucide-react-native";
import type { ThemeMode } from "@/constants/theme";

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: typeof Sun }[] = [
  { label: "Light", value: "light", icon: Sun },
  { label: "Dark", value: "dark", icon: Moon },
  { label: "System", value: "system", icon: Smartphone },
];

export default function SettingsScreen() {
  const { session } = useSession();
  const systemTheme = useColorScheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("system");
  const [isSigningOut, setIsSigningOut] = useState(false);

  const trpc = useTRPC();
  const orgQuery = useQuery(
    trpc.org.getCurrent.queryOptions(undefined, {
      enabled: !!session?.activeOrganizationId,
    }),
  );

  const userName = session?.user.name ?? "User";
  const userEmail = session?.user.email ?? "";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleThemeChange(theme: ThemeMode) {
    setSelectedTheme(theme);
    // Theme change applies immediately via NativeWind CSS variables
  }

  function handleSignOut() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await authClient.signOut();
            } catch {
              // Session cleanup happens regardless
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerClassName="py-lg gap-xl"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-heading text-text-primary">Settings</Text>

        {/* Section 1: Profile */}
        <View className="rounded-lg bg-surface p-lg gap-md">
          <View className="flex-row items-center gap-md">
            <View className="h-[40px] w-[40px] items-center justify-center rounded-full bg-accent">
              <Text className="text-label text-white">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-body text-text-primary">{userName}</Text>
              <Text className="text-label text-text-secondary">
                {userEmail}
              </Text>
            </View>
            {session?.activeOrganizationId && (
              <View className="rounded-full bg-accent/10 px-sm py-xs">
                <Text
                  className="text-[12px] font-semibold text-accent"
                  accessibilityLabel={`${orgQuery.data?.currentUserRole ? orgQuery.data.currentUserRole.charAt(0).toUpperCase() + orgQuery.data.currentUserRole.slice(1) : "Member"} role`}
                >
                  {orgQuery.data?.currentUserRole
                    ? orgQuery.data.currentUserRole.charAt(0).toUpperCase() +
                      orgQuery.data.currentUserRole.slice(1)
                    : "Member"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 2: Appearance */}
        <View className="gap-sm">
          <Text className="text-label text-text-secondary px-xs">
            Appearance
          </Text>
          <View className="rounded-lg bg-surface p-md">
            <Text className="text-body text-text-primary mb-md">Theme</Text>
            <View className="flex-row gap-sm">
              {THEME_OPTIONS.map(({ label, value, icon: Icon }) => {
                const isActive = selectedTheme === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => handleThemeChange(value)}
                    className={`flex-1 min-h-[44px] flex-row items-center justify-center gap-xs rounded-lg ${
                      isActive
                        ? "bg-accent"
                        : "bg-background border border-border-default"
                    }`}
                    accessibilityLabel={`${label} theme`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Icon
                      color={isActive ? "#FFFFFF" : "#475569"}
                      size={16}
                    />
                    <Text
                      className={`text-label ${
                        isActive ? "text-white" : "text-text-primary"
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Section 3: Organization */}
        <View className="gap-sm">
          <Text className="text-label text-text-secondary px-xs">
            Organization
          </Text>
          <View className="rounded-lg bg-surface p-lg gap-sm">
            <Text className="text-body text-text-primary">
              {session?.activeOrganizationId
                ? orgQuery.data?.name ?? "Your Organization"
                : "No organization"}
            </Text>
          </View>
        </View>

        {/* Section 4: Account */}
        <View className="gap-sm">
          <Text className="text-label text-text-secondary px-xs">Account</Text>
          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            className="min-h-[44px] flex-row items-center justify-center gap-sm rounded-lg bg-surface"
            accessibilityLabel="Sign Out"
            accessibilityRole="button"
          >
            <LogOut color="#DC2626" size={20} />
            <Text className="text-body font-semibold text-destructive">
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
