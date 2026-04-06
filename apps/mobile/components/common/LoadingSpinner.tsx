import { ActivityIndicator, View } from "react-native";
import { lightColors } from "@/constants/colors";

interface LoadingSpinnerProps {
  size?: "small" | "large";
}

export function LoadingSpinner({ size = "large" }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size={size} color={lightColors.accent} />
    </View>
  );
}
