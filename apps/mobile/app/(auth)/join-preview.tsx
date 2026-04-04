import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Building2, Users, Shield } from "lucide-react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useTRPC } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { API_URL } from "@/lib/api-url";

export default function JoinPreviewScreen() {
  const { code, orgName, role, memberCount } = useLocalSearchParams<{
    code: string;
    orgName: string;
    role: string;
    memberCount: string;
  }>();

  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const joinMutation = useMutation(
    trpc.invite.join.mutationOptions({
      async onSuccess(data) {
        console.log("[JoinOrg] Mutation succeeded, orgId:", data.orgId);
        try {
          await authClient.organization.setActive({
            organizationId: data.orgId,
          });
          console.log("[JoinOrg] setActive done, refetching session...");
        } catch (e) {
          console.error("[JoinOrg] setActive failed:", e);
        }
        try {
          const refreshed = await authClient.getSession();
          console.log(
            "[JoinOrg] Session refreshed, activeOrgId:",
            refreshed.data?.session?.activeOrganizationId,
          );
        } catch (e) {
          console.error("[JoinOrg] Session refresh failed:", e);
        }
      },
      onError(err) {
        console.error("[JoinOrg] Mutation error:", {
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
        } else if (err.message?.toLowerCase().includes("already")) {
          setError("You already belong to an organization.");
        } else {
          setError(err.message || "Something went wrong. Please try again.");
        }
      },
    }),
  );

  function handleJoin() {
    if (!code) return;
    setError(null);
    joinMutation.mutate({ code });
  }

  const roleLabel =
    role === "manager" ? "Manager" : "Technician";
  const parsedMemberCount = Number(memberCount) || 0;

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-lg">
        <View className="gap-sm">
          <Text className="text-heading text-text-primary">
            Join {orgName}?
          </Text>
          <Text className="text-body text-text-secondary">
            You will join as {roleLabel}.
          </Text>
        </View>

        {error && (
          <Text className="text-label text-destructive">{error}</Text>
        )}

        {/* OrgPreviewCard */}
        <View className="rounded-lg bg-surface p-lg gap-md">
          <View className="flex-row items-center gap-md">
            <View className="h-[40px] w-[40px] items-center justify-center rounded-lg bg-accent">
              <Building2 color="#FFFFFF" size={20} />
            </View>
            <Text className="text-body font-semibold text-text-primary flex-1">
              {orgName}
            </Text>
          </View>

          <View className="flex-row items-center gap-sm">
            <Shield color="#475569" size={16} />
            <Text className="text-label text-text-secondary">
              Role: {roleLabel}
            </Text>
          </View>

          <View className="flex-row items-center gap-sm">
            <Users color="#475569" size={16} />
            <Text className="text-label text-text-secondary">
              {parsedMemberCount} {parsedMemberCount === 1 ? "member" : "members"}
            </Text>
          </View>
        </View>

        <View className="gap-md">
          <Pressable
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            className="min-h-[56px] items-center justify-center rounded-lg bg-accent"
            style={{ opacity: joinMutation.isPending ? 0.7 : 1 }}
            accessibilityLabel="Join Organization"
            accessibilityRole="button"
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-body font-semibold text-white">
                Join Organization
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            disabled={joinMutation.isPending}
            className="min-h-[44px] items-center justify-center rounded-lg border border-border-default"
            accessibilityLabel="Cancel"
            accessibilityRole="button"
          >
            <Text className="text-body text-text-primary">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
