import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
} from "react-native";

interface InviteCodeInputProps {
  onComplete: (code: string) => void;
  error?: string;
  isLoading?: boolean;
}

const CODE_LENGTH = 6;

export function InviteCodeInput({
  onComplete,
  error,
  isLoading,
}: InviteCodeInputProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  // Shake when error is set
  const prevErrorRef = useRef(error);
  if (error && error !== prevErrorRef.current) {
    shake();
  }
  prevErrorRef.current = error;

  function handleChange(text: string) {
    const sanitized = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const trimmed = sanitized.slice(0, CODE_LENGTH);
    setCode(trimmed);

    if (trimmed.length === CODE_LENGTH) {
      onComplete(trimmed);
    }
  }

  return (
    <View className="gap-sm">
      <Animated.View
        style={{ transform: [{ translateX: shakeAnim }] }}
        className="flex-row justify-center gap-sm"
      >
        {Array.from({ length: CODE_LENGTH }).map((_, index) => {
          const char = code[index] ?? "";
          const isFocused = code.length === index;
          const isFilled = index < code.length;

          return (
            <Pressable
              key={index}
              onPress={() => inputRef.current?.focus()}
              className={`h-[56px] w-[48px] items-center justify-center rounded-lg border ${
                isFocused
                  ? "border-accent border-2"
                  : isFilled
                    ? "border-border-default bg-surface"
                    : "border-border-default"
              }`}
              accessibilityLabel={`Invite code character ${index + 1}`}
            >
              <Text className="text-heading text-text-primary font-mono">
                {char}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      {/* Hidden input that captures keyboard input */}
      <TextInput
        ref={inputRef}
        className="absolute h-0 w-0 opacity-0"
        value={code}
        onChangeText={handleChange}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        editable={!isLoading}
        autoFocus
      />

      {error && (
        <Text className="text-center text-label text-destructive">{error}</Text>
      )}
    </View>
  );
}
