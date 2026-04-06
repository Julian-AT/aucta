import { Pressable } from "react-native";
import { X } from "lucide-react-native";

interface StopButtonProps {
  onPress: () => void;
}

export function StopButton({ onPress }: StopButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[56px] h-[56px] rounded-full bg-destructive items-center justify-center"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      accessibilityLabel="End session"
      accessibilityRole="button"
    >
      <X color="#FFFFFF" size={24} />
    </Pressable>
  );
}
