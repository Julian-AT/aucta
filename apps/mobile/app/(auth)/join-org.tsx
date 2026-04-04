import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { InviteCodeInput } from "@/components/auth/InviteCodeInput";
import { QRScanner } from "@/components/auth/QRScanner";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { useTRPC } from "@/lib/api";
import { API_URL } from "@/lib/api-url";

export default function JoinOrgScreen() {
  const [codeError, setCodeError] = useState<string | undefined>();
  const [showScanner, setShowScanner] = useState(false);

  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const lookupMutation = useMutation({
    mutationFn: (input: { code: string }) =>
      queryClient.fetchQuery(trpc.invite.lookup.queryOptions(input)),
    onSuccess(data) {
      router.push({
        pathname: "/(auth)/join-preview",
        params: {
          code: data.code,
          orgName: data.orgName,
          role: data.role,
          memberCount: String(data.memberCount),
        },
      });
    },
    onError(err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const messageLower = message.toLowerCase();

      console.error("[JoinOrg] Lookup error:", {
        message,
        name: err instanceof Error ? err.name : undefined,
        cause: (err as any)?.cause,
      });

      const isNetworkError =
        message === "Network request failed" ||
        messageLower.includes("fetch failed") ||
        messageLower.includes("failed to fetch");

      if (isNetworkError) {
        setCodeError(
          `Cannot reach server at ${API_URL}. ` +
            "Make sure the API server is running.",
        );
      } else if (messageLower.includes("expired")) {
        setCodeError("This invite code has expired. Ask your supervisor for a new one.");
      } else if (messageLower.includes("limit") || messageLower.includes("used")) {
        setCodeError(
          "This invite code has reached its usage limit. Ask your supervisor for a new one.",
        );
      } else {
        setCodeError("This invite code is not valid. Check the code and try again.");
      }
    },
  });

  function handleCodeComplete(code: string) {
    setCodeError(undefined);
    lookupMutation.mutate({ code });
  }

  function handleQRScan(code: string) {
    setShowScanner(false);
    handleCodeComplete(code);
  }

  if (showScanner) {
    return <QRScanner onScan={handleQRScan} onCancel={() => setShowScanner(false)} />;
  }

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center gap-lg">
        <View className="gap-sm">
          <Text className="text-heading text-text-primary">Join your team</Text>
          <Text className="text-body text-text-secondary">
            Enter the 6-character invite code from your supervisor.
          </Text>
        </View>

        <InviteCodeInput
          onComplete={handleCodeComplete}
          error={codeError}
          isLoading={lookupMutation.isPending}
        />

        {/* Divider */}
        <View className="flex-row items-center gap-md">
          <View className="flex-1 h-[1px] bg-border-default" />
          <Text className="text-label text-text-secondary">or</Text>
          <View className="flex-1 h-[1px] bg-border-default" />
        </View>

        <Pressable
          onPress={() => setShowScanner(true)}
          className="min-h-[56px] flex-row items-center justify-center gap-sm rounded-lg border border-border-default bg-surface"
          accessibilityLabel="Scan QR Code"
          accessibilityRole="button"
        >
          <ScanLine color="#2563EB" size={24} />
          <Text className="text-body font-semibold text-text-primary">Scan QR Code</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
