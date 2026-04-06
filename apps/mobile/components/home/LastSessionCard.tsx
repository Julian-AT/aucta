import { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { getLastSession, type CachedSession } from "@/lib/storage/session-cache";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Displays the most recent session summary on the Home screen.
 *
 * Reads from MMKV offline cache for instant display.
 * Shows AI-generated badge per COMP-07 and D-10 when summary
 * was produced by the Inngest background job.
 */
export function LastSessionCard() {
  const [session, setSession] = useState<CachedSession | null>(null);

  useEffect(() => {
    const cached = getLastSession();
    setSession(cached);
  }, []);

  if (!session) return null;

  return (
    <View
      className="bg-surface rounded-2xl p-lg"
      accessibilityLabel={`Last session from ${formatDate(session.startedAt)}${
        session.summary ? `, summary: ${session.summary}` : ""
      }`}
      accessibilityRole="summary"
    >
      <View className="flex-row justify-between items-center mb-sm">
        <Text className="text-label text-text-secondary">Last Session</Text>
        <Text className="text-label text-text-secondary">
          {formatDate(session.startedAt)}
        </Text>
      </View>

      {session.durationMs != null && (
        <Text className="text-body text-text-primary mb-xs">
          Duration: {formatDuration(session.durationMs)}
        </Text>
      )}

      {session.summary ? (
        <View>
          <Text className="text-body text-text-primary mt-xs">
            {truncate(session.summary, 150)}
          </Text>

          {/* EU AI Act Art. 50 compliance: label AI-generated content (COMP-07, D-10) */}
          {session.isAiGenerated && (
            <View className="flex-row items-center mt-sm gap-xs">
              <View className="bg-ai-indicator-bg px-sm py-xs rounded-md">
                <Text className="text-[12px] text-overlay-text-muted">
                  AI-generated summary
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <Text className="text-body text-text-secondary italic mt-xs">
          Summary generating...
        </Text>
      )}
    </View>
  );
}
