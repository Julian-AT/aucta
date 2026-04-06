import { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FeedbackScreen } from "@/components/session/FeedbackScreen";

export default function FeedbackRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();

  const handleDone = useCallback(() => {
    router.replace("/(app)/(tabs)");
  }, [router]);

  return (
    <FeedbackScreen
      sessionId={sessionId ?? ""}
      onSubmit={handleDone}
      onSkip={handleDone}
    />
  );
}
