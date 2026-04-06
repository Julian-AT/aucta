import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="org-choice" />
      <Stack.Screen name="create-org" />
      <Stack.Screen name="join-org" />
      <Stack.Screen name="join-preview" />
    </Stack>
  );
}
