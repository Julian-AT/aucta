import { View } from "react-native";
import { Mic } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useEffect } from "react";

interface AudioIndicatorProps {
  isAISpeaking: boolean;
}

const BAR_COUNT = 3;
const BAR_MIN_HEIGHT = 12;
const BAR_MAX_HEIGHT = 24;
const LOOP_DURATION = 600;
const STAGGER_DELAY = 200;

function WaveformBar({ index }: { index: number }) {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  useEffect(() => {
    height.value = withDelay(
      index * STAGGER_DELAY,
      withRepeat(
        withTiming(BAR_MAX_HEIGHT, {
          duration: LOOP_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );

    return () => {
      cancelAnimation(height);
    };
  }, [height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      className="w-[4px] rounded-full bg-overlay-text"
      style={barStyle}
    />
  );
}

export function AudioIndicator({ isAISpeaking }: AudioIndicatorProps) {
  return (
    <View
      className="bg-overlay-bg rounded-full px-md py-sm"
      accessibilityLabel={isAISpeaking ? "AI is speaking" : "Listening"}
      accessibilityRole="text"
    >
      {isAISpeaking ? (
        <Animated.View
          className="flex-row items-center gap-xs"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          key="waveform"
        >
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <WaveformBar key={i} index={i} />
          ))}
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          key="mic"
        >
          <Mic color="#FFFFFF" size={24} />
        </Animated.View>
      )}
    </View>
  );
}
