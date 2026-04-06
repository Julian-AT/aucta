import { useState } from "react";
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
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useTRPC } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { INDUSTRY_TYPES, type IndustryType } from "@aucta/shared/constants/industries";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/api-url";

const INDUSTRY_LABELS: Record<IndustryType, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  refrigeration: "Refrigeration",
  building_maintenance: "Building Maintenance",
  general_contractor: "General Contractor",
  other: "Other",
};

export default function CreateOrgScreen() {
  const [name, setName] = useState("");
  const [industryType, setIndustryType] = useState<IndustryType | "">("");
  const [location, setLocation] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    industryType?: string;
    location?: string;
  }>({});

  const trpc = useTRPC();
  const createOrgMutation = useMutation(
    trpc.org.create.mutationOptions({
      async onSuccess(data) {
        console.log("[CreateOrg] Mutation succeeded, orgId:", data.id);
        try {
          console.log("[CreateOrg] Calling setActive...");
          await authClient.organization.setActive({
            organizationId: data.id,
          });
          console.log("[CreateOrg] setActive done, refetching session...");
        } catch (e) {
          console.error("[CreateOrg] setActive failed:", e);
        }
        // Force session refetch so SessionProvider picks up activeOrganizationId
        try {
          const refreshed = await authClient.getSession();
          console.log(
            "[CreateOrg] Session refreshed, activeOrgId:",
            refreshed.data?.session?.activeOrganizationId,
          );
        } catch (e) {
          console.error("[CreateOrg] Session refresh failed:", e);
        }
      },
      onError(err) {
        console.error("[CreateOrg] Mutation error:", {
          message: err.message,
          cause: (err as any).cause,
        });

        const isNetworkError =
          err.message === "Network request failed" ||
          err.message.includes("fetch failed") ||
          err.message.includes("Failed to fetch");

        if (isNetworkError) {
          setError(
            `Cannot reach server at ${API_URL}. ` +
              "Make sure the API server is running and the URL is correct for your device.",
          );
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      },
    }),
  );

  function validate(): boolean {
    const errors: {
      name?: string;
      industryType?: string;
      location?: string;
    } = {};

    if (!name.trim() || name.trim().length < 2) {
      errors.name = "Company name is required.";
    } else if (name.trim().length > 100) {
      errors.name = "Company name must be 100 characters or less.";
    }

    if (!industryType) {
      errors.industryType = "Select an industry type.";
    }

    if (!location.trim() || location.trim().length < 2) {
      errors.location = "Location is required.";
    } else if (location.trim().length > 200) {
      errors.location = "Location must be 200 characters or less.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    setError(null);
    if (!validate()) return;
    if (!industryType) return;

    createOrgMutation.mutate({
      name: name.trim(),
      industryType,
      location: location.trim(),
    });
  }

  const isLoading = createOrgMutation.isPending;

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
              Create organization
            </Text>

            {error && (
              <Text className="text-label text-destructive">{error}</Text>
            )}

            <View className="gap-sm">
              <Text className="text-label text-text-primary">
                Company name
              </Text>
              <TextInput
                className={`h-[48px] rounded-lg border px-md text-body text-text-primary bg-background ${
                  fieldErrors.name
                    ? "border-destructive"
                    : "border-border-default"
                }`}
                placeholder="Acme HVAC Services"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isLoading}
              />
              {fieldErrors.name && (
                <Text className="text-label text-destructive">
                  {fieldErrors.name}
                </Text>
              )}
            </View>

            <View className="gap-sm">
              <Text className="text-label text-text-primary">
                Industry type
              </Text>
              <Pressable
                onPress={() => setShowPicker(!showPicker)}
                className={`h-[48px] flex-row items-center rounded-lg border px-md ${
                  fieldErrors.industryType
                    ? "border-destructive"
                    : "border-border-default"
                } bg-background`}
                disabled={isLoading}
                accessibilityLabel="Select industry"
                accessibilityRole="button"
              >
                <Text
                  className={`text-body ${
                    industryType ? "text-text-primary" : "text-[#94A3B8]"
                  }`}
                >
                  {industryType
                    ? INDUSTRY_LABELS[industryType]
                    : "Select industry"}
                </Text>
              </Pressable>
              {fieldErrors.industryType && (
                <Text className="text-label text-destructive">
                  {fieldErrors.industryType}
                </Text>
              )}

              {showPicker && (
                <View className="rounded-lg border border-border-default bg-surface">
                  {INDUSTRY_TYPES.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setIndustryType(type);
                        setShowPicker(false);
                        if (fieldErrors.industryType) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            industryType: undefined,
                          }));
                        }
                      }}
                      className={`min-h-[44px] justify-center px-md ${
                        industryType === type ? "bg-accent/10" : ""
                      }`}
                      accessibilityRole="menuitem"
                    >
                      <Text
                        className={`text-body ${
                          industryType === type
                            ? "text-accent font-semibold"
                            : "text-text-primary"
                        }`}
                      >
                        {INDUSTRY_LABELS[type]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View className="gap-sm">
              <Text className="text-label text-text-primary">Location</Text>
              <TextInput
                className={`h-[48px] rounded-lg border px-md text-body text-text-primary bg-background ${
                  fieldErrors.location
                    ? "border-destructive"
                    : "border-border-default"
                }`}
                placeholder="Frankfurt, Germany"
                placeholderTextColor="#94A3B8"
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  if (fieldErrors.location) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      location: undefined,
                    }));
                  }
                }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                editable={!isLoading}
              />
              {fieldErrors.location && (
                <Text className="text-label text-destructive">
                  {fieldErrors.location}
                </Text>
              )}
            </View>

            <Pressable
              onPress={handleCreate}
              disabled={isLoading}
              className="min-h-[56px] items-center justify-center rounded-lg bg-accent"
              style={{ opacity: isLoading ? 0.7 : 1 }}
              accessibilityLabel="Create Organization"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-body font-semibold text-white">
                  Create Organization
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
