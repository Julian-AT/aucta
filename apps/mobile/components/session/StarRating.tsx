import { View, Pressable } from "react-native";
import { useCallback } from "react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  size?: number;
}

/**
 * 1-5 star rating input. Each star has a 56x56dp minimum
 * touch target for glove-friendly interaction (UX-01).
 */
export function StarRating({ value, onChange, size = 32 }: StarRatingProps) {
  return (
    <View className="flex-row items-center justify-center gap-sm">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarButton
          key={star}
          star={star}
          filled={star <= value}
          size={size}
          onChange={onChange}
        />
      ))}
    </View>
  );
}

function StarButton({
  star,
  filled,
  size,
  onChange,
}: {
  star: number;
  filled: boolean;
  size: number;
  onChange: (rating: number) => void;
}) {
  const handlePress = useCallback(() => {
    onChange(star);
  }, [onChange, star]);

  return (
    <Pressable
      onPress={handlePress}
      className="min-w-[56px] min-h-[56px] items-center justify-center"
      accessibilityLabel={`Rate ${star} of 5 stars`}
      accessibilityRole="button"
      accessibilityState={{ selected: filled }}
    >
      <View
        className={`items-center justify-center rounded-full ${
          filled ? "bg-accent/20" : "bg-surface"
        }`}
        style={{ width: size + 16, height: size + 16 }}
      >
        <StarIcon size={size} filled={filled} />
      </View>
    </Pressable>
  );
}

function StarIcon({ size, filled }: { size: number; filled: boolean }) {
  // Unicode star with color-coded fill/outline
  const { Text } = require("react-native");
  return (
    <Text
      style={{ fontSize: size, lineHeight: size + 4 }}
      className={filled ? "text-[#F59E0B]" : "text-text-secondary"}
    >
      {filled ? "\u2605" : "\u2606"}
    </Text>
  );
}
