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

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  function validate(): boolean {
    const errors: { name?: string; email?: string; password?: string } = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    } else if (name.trim().length > 100) {
      errors.name = "Name must be 100 characters or less.";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!password || password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignUp() {
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        if (
          result.error.message?.toLowerCase().includes("already") ||
          result.error.code === "USER_ALREADY_EXISTS"
        ) {
          setError(
            "An account with this email already exists. Try logging in instead.",
          );
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      router.replace("/(auth)/org-choice");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearFieldError(field: "name" | "email" | "password") {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
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
            <Text className="text-heading text-text-primary">
              Create your account
            </Text>

            {error && (
              <Text className="text-label text-destructive">{error}</Text>
            )}

            <View className="gap-sm">
              <Text className="text-label text-text-primary">Full name</Text>
              <TextInput
                className={`h-[48px] rounded-lg border px-md text-body text-text-primary bg-background ${
                  fieldErrors.name
                    ? "border-destructive"
                    : "border-border-default"
                }`}
                placeholder="Jane Smith"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  clearFieldError("name");
                }}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isLoading}
              />
              {fieldErrors.name && (
                <Text className="text-label text-destructive">
                  {fieldErrors.name}
                </Text>
              )}
            </View>

            <View className="gap-sm">
              <Text className="text-label text-text-primary">Email</Text>
              <TextInput
                ref={emailRef}
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
                  clearFieldError("email");
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
                  clearFieldError("password");
                }}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                editable={!isLoading}
              />
              {fieldErrors.password && (
                <Text className="text-label text-destructive">
                  {fieldErrors.password}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleSignUp}
              disabled={isLoading}
              className="min-h-[56px] items-center justify-center rounded-lg bg-accent"
              style={{ opacity: isLoading ? 0.7 : 1 }}
              accessibilityLabel="Create Account"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-body font-semibold text-white">
                  Create Account
                </Text>
              )}
            </Pressable>

            <View className="items-center">
              <Link href="/(auth)/login" asChild>
                <Pressable accessibilityRole="link">
                  <Text className="text-body text-text-secondary">
                    Already have an account?{" "}
                    <Text className="text-accent font-semibold">Log In</Text>
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
