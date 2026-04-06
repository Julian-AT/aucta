import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/api-url";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin() {
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        console.error("[Login] Sign-in error:", result.error);
        const msg = result.error.message?.toLowerCase() ?? "";
        if (msg.includes("network") || msg.includes("fetch")) {
          setError(
            `Cannot reach server at ${API_URL}. Make sure the API server is running.`,
          );
        } else {
          setError(
            "Incorrect email or password. Check your credentials and try again.",
          );
        }
        return;
      }

      console.log("[Login] Sign-in succeeded, checking for existing org...");

      // Better Auth doesn't restore activeOrganizationId on fresh login.
      // Check if the user already belongs to an org and re-activate it.
      const orgs = await authClient.organization.list();
      console.log("[Login] User orgs:", orgs.data?.length ?? 0);

      if (orgs.data && orgs.data.length > 0) {
        await authClient.organization.setActive({
          organizationId: orgs.data[0].id,
        });
        console.log("[Login] Restored active org:", orgs.data[0].id);
        // Session refresh triggers SessionProvider -> navigates to (app)
        await authClient.getSession();
      } else {
        router.replace("/(auth)/org-choice");
      }
    } catch (e) {
      console.error("[Login] Sign-in threw:", e);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-1 justify-center"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-lg">
            <Text className="text-heading text-text-primary">Welcome back</Text>

            {error && (
              <Text className="text-label text-destructive">{error}</Text>
            )}

            <View className="gap-sm">
              <Text className="text-label text-text-primary">Email</Text>
              <TextInput
                className={`h-[48px] rounded-lg border px-md text-body text-text-primary bg-background ${
                  fieldErrors.email
                    ? "border-destructive"
                    : "border-border-default"
                }`}
                placeholder="you@company.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading}
              />
              {fieldErrors.email && (
                <Text className="text-label text-destructive">
                  {fieldErrors.email}
                </Text>
              )}
            </View>

            <View className="gap-sm">
              <Text className="text-label text-text-primary">Password</Text>
              <TextInput
                ref={passwordRef}
                className={`h-[48px] rounded-lg border px-md text-body text-text-primary bg-background ${
                  fieldErrors.password
                    ? "border-destructive"
                    : "border-border-default"
                }`}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }
                }}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
              />
              {fieldErrors.password && (
                <Text className="text-label text-destructive">
                  {fieldErrors.password}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              className="min-h-[56px] items-center justify-center rounded-lg bg-accent"
              style={{ opacity: isLoading ? 0.7 : 1 }}
              accessibilityLabel="Log In"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-body font-semibold text-white">
                  Log In
                </Text>
              )}
            </Pressable>

            <View className="items-center">
              <Link href="/(auth)/sign-up" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-body text-text-secondary">
                    Don't have an account?{" "}
                    <Text className="text-accent font-semibold">
                      Create Account
                    </Text>
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
