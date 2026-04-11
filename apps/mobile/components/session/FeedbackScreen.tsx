import { useState, useCallback } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTRPC } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSessionStore, type SessionRecap } from "@/stores/session-store";
import { StarRating } from "./StarRating";
import { cacheSession, type CachedSession } from "@/lib/storage/session-cache";

interface FeedbackScreenProps {
  sessionId: string;
  onSubmit: () => void;
  onSkip: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} sec`;
  return `${minutes} min ${seconds} sec`;
}

/**
 * Post-session feedback screen.
 *
 * Displays session recap (duration, tools used, language) and
 * collects a 1-5 star rating (required) plus optional text note.
 * Per D-02, the Skip button is de-emphasized (text-only).
 */
export function FeedbackScreen({
  sessionId,
  onSubmit,
  onSkip,
}: FeedbackScreenProps) {
  const trpc = useTRPC();
  const { t } = useTranslation();

  // Capture recap data from Zustand on mount so it survives store reset
  const [recap] = useState<SessionRecap | null>(() => {
    const state = useSessionStore.getState();
    return state.getSessionRecap();
  });

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");

  const submitFeedbackMutation = useMutation(
    trpc.session.submitFeedback.mutationOptions(),
  );

  const getSessionQuery = useQuery(
    trpc.session.getSession.queryOptions(
      { sessionId },
      { enabled: false },
    ),
  );

  // Cache session to MMKV and clean up store
  const cacheAndCleanup = useCallback(
    async (feedbackRating: number | null) => {
      // Fetch full session data from server for caching
      try {
        const sessionData = await getSessionQuery.refetch();
        if (sessionData.data) {
          const cached: CachedSession = {
            id: sessionData.data.id,
            summary: sessionData.data.summary,
            isAiGenerated: sessionData.data.isAiGenerated,
            durationMs: sessionData.data.durationMs,
            languageDetected: sessionData.data.languageDetected,
            toolsUsed: sessionData.data.toolsUsed,
            feedbackRating: feedbackRating,
            // tRPC JSON transport delivers dates as strings
            startedAt: String(sessionData.data.startedAt),
            endedAt: sessionData.data.endedAt
              ? String(sessionData.data.endedAt)
              : null,
          };
          cacheSession(cached);
        }
      } catch {
        // Cache failure is non-critical -- session data is still on server
      }

      // Reset the Zustand store now that recap has been captured
      useSessionStore.getState().reset();
    },
    [getSessionQuery],
  );

  const handleSubmit = useCallback(async () => {
    try {
      await submitFeedbackMutation.mutateAsync({
        sessionId,
        rating,
        note: note.trim() || undefined,
      });
    } catch {
      // Feedback submission failure is non-critical
    }

    await cacheAndCleanup(rating);
    onSubmit();
  }, [
    submitFeedbackMutation,
    sessionId,
    rating,
    note,
    cacheAndCleanup,
    onSubmit,
  ]);

  const handleSkip = useCallback(async () => {
    await cacheAndCleanup(null);
    onSkip();
  }, [cacheAndCleanup, onSkip]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-md py-lg"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-display text-text-primary text-center mt-lg">
          {t("session.completed")}
        </Text>

        {/* Session Recap */}
        <View className="bg-surface rounded-2xl p-lg mt-lg">
          <Text className="text-label text-text-secondary mb-sm">
            {t("session.findings")}
          </Text>

          <View className="gap-xs">
            <RecapRow
              label={t("session.duration")}
              value={recap ? formatDuration(recap.durationMs) : "--"}
            />
            <RecapRow
              label={t("session.toolCalls")}
              value={
                recap && recap.toolNames.length > 0
                  ? recap.toolNames.join(", ")
                  : "None"
              }
            />
            <RecapRow
              label="Language"
              value={recap?.languageDetected ?? "Auto-detected"}
            />
          </View>
        </View>

        {/* Star Rating */}
        <View className="mt-xl items-center">
          <Text className="text-heading text-text-primary mb-md">
            {t("session.feedbackTitle")}
          </Text>

          <StarRating value={rating} onChange={setRating} />
        </View>

        {/* Optional Note */}
        <TextInput
          className="bg-surface text-body text-text-primary rounded-xl p-md mt-lg min-h-[100px]"
          placeholder={t("session.feedbackPlaceholder")}
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          textAlignVertical="top"
          value={note}
          onChangeText={setNote}
          accessibilityLabel={t("session.feedbackPlaceholder")}
        />

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={rating === 0 || submitFeedbackMutation.isPending}
          className={`min-h-[56px] items-center justify-center rounded-lg mt-lg ${
            rating > 0 ? "bg-accent" : "bg-surface"
          }`}
          accessibilityLabel={t("session.feedbackSubmit")}
          accessibilityRole="button"
          accessibilityState={{ disabled: rating === 0 }}
        >
          <Text
            className={`text-body font-semibold ${
              rating > 0 ? "text-white" : "text-text-secondary"
            }`}
          >
            {submitFeedbackMutation.isPending
              ? t("common.loading")
              : t("session.feedbackSubmit")}
          </Text>
        </Pressable>

        {/* Skip Button (de-emphasized per D-02) */}
        <Pressable
          onPress={handleSkip}
          className="min-h-[56px] items-center justify-center mt-sm"
          accessibilityLabel={t("session.feedbackSkip")}
          accessibilityRole="button"
        >
          <Text className="text-body text-text-secondary">{t("session.feedbackSkip")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-xs">
      <Text className="text-body text-text-secondary">{label}</Text>
      <Text className="text-body text-text-primary font-semibold">
        {value}
      </Text>
    </View>
  );
}
