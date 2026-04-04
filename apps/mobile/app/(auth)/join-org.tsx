import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { InviteCodeInput } from "@/components/auth/InviteCodeInput";
import { QRScanner } from "@/components/auth/QRScanner";
import { useTRPC } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export default function JoinOrgScreen() {
  const [codeError, setCodeError] = useState<string | undefined>();
  const [showScanner, setShowScanner] = useState(false);

  const trpc = useTRPC();
  const lookupMutation = useMutation(
    trpc.invite.lookup.mutationOptions({
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
      onError(err) {
        const message = err.message?.toLowerCase() ?? "";
        if (message.includes("expired")) {
          setCodeError(
            "This invite code has expired. Ask your supervisor for a new one.",
          );
        } else if (message.includes("limit") || message.includes("used")) {
          setCodeError(
            "This invite code has reached its usage limit. Ask your supervisor for a new one.",
          );
        } else {
          setCodeError(
            "This invite code is not valid. Check the code and try again.",
          );
        }
      },
    }),
  );

  function handleCodeComplete(code: string) {
    setCodeError(undefined);
    lookupMutation.mutate({ code });
  }

  function handleQRScan(code: string) {
    setShowScanner(false);
    handleCodeComplete(code);
  }

  if (showScanner) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onCancel={() => setShowScanner(false)}
      />
    );
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
          <Text className="text-body font-semibold text-text-primary">
            Scan QR Code
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
