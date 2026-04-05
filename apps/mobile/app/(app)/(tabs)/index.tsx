import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScreenContainer } from "@/components/common/ScreenContainer";
import { LastSessionCard } from "@/components/home/LastSessionCard";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react-native";
import {
  cacheSession,
  setLastSynced,
  type CachedSession,
} from "@/lib/storage/session-cache";

export default function HomeScreen() {
  const { session } = useSession();
  const trpc = useTRPC();
  const router = useRouter();
  const [syncKey, setSyncKey] = useState(0);

  const orgQuery = useQuery(
    trpc.org.getCurrent.queryOptions(undefined, {
      enabled: !!session?.activeOrganizationId,
    }),
  );

  // Sync recent sessions from server on mount (D-14: sync on app open)
  const recentSessionsQuery = useQuery(
    trpc.session.getRecentSessions.queryOptions(undefined, {
      enabled: !!session?.activeOrganizationId,
    }),
  );

  useEffect(() => {
    if (recentSessionsQuery.data) {
      for (const s of recentSessionsQuery.data) {
        const cached: CachedSession = {
          id: s.id,
          summary: s.summary,
          isAiGenerated: s.isAiGenerated,
          durationMs: s.durationMs,
          languageDetected: s.languageDetected,
          toolsUsed: s.toolsUsed,
          feedbackRating: s.feedbackRating,
          // tRPC JSON transport delivers dates as strings
          startedAt: String(s.startedAt),
          endedAt: s.endedAt ? String(s.endedAt) : null,
        };
        cacheSession(cached);
      }
      setLastSynced(new Date().toISOString());
      // Trigger LastSessionCard re-render after sync
      setSyncKey((k) => k + 1);
    }
  }, [recentSessionsQuery.data]);

  const handleStartSession = useCallback(() => {
    router.push("/(app)/session");
  }, [router]);

  return (
    <ScreenContainer>
      <View className="flex-1 justify-center items-center gap-xl">
        <Text className="text-display text-text-primary text-center">
          {orgQuery.data?.name ?? "Aucta"}
        </Text>

        <LastSessionCard key={syncKey} />

        <Pressable
          onPress={handleStartSession}
          className="min-h-[56px] w-full flex-row items-center justify-center gap-sm rounded-lg bg-accent px-xl"
          accessibilityLabel="Start Session"
          accessibilityRole="button"
        >
          <Zap color="#FFFFFF" size={24} />
          <Text className="text-body font-semibold text-white">
            Start Session
          </Text>
        </Pressable>

        <Text className="text-body text-text-secondary text-center px-lg">
          Point your camera at any HVAC unit and ask a question.
        </Text>
      </View>
    </ScreenContainer>
  );
}
