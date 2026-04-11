import { Stack } from "expo-router";
import { SessionProvider, useSession } from "@/providers/session-provider";
import { TRPCProviderWrapper } from "@/providers/trpc-provider";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import "@/global.css";

export default function RootLayout() {
  return (
    <SessionProvider>
      <TRPCProviderWrapper>
        <RootNavigator />
      </TRPCProviderWrapper>
    </SessionProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, hasOrganization, isLoading } = useSession();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isAuthenticated && hasOrganization}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated || !hasOrganization}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
