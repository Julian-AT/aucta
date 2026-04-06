import { View, Text, Pressable, Modal } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { ScreenContainer } from "@/components/common/ScreenContainer";

interface AIDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
}

export function AIDisclosureModal({ visible, onAccept }: AIDisclosureModalProps) {
  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <ScreenContainer>
        <View className="flex-1 items-center justify-center gap-lg px-lg">
          <ShieldAlert color="#2563EB" size={48} />

          <Text className="text-heading text-text-primary text-center">
            AI-Assisted Session
          </Text>

          <Text className="text-body text-text-secondary text-center px-lg">
            You are interacting with an AI system, not a human expert. AI
            guidance does not replace professional training or certification.
          </Text>

          <Pressable
            onPress={onAccept}
            className="min-h-[56px] w-full flex-row items-center justify-center rounded-lg bg-accent"
            accessibilityLabel="I understand, start AI session"
            accessibilityRole="button"
          >
            <Text className="text-body font-semibold text-white">
              I Understand
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </Modal>
  );
}
