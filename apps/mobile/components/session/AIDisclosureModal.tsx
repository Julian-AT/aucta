import { View, Text, Pressable, Modal } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/common/ScreenContainer";

interface AIDisclosureModalProps {
  visible: boolean;
  onAccept: () => void;
}

export function AIDisclosureModal({ visible, onAccept }: AIDisclosureModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <ScreenContainer>
        <View className="flex-1 items-center justify-center gap-lg px-lg">
          <ShieldAlert color="#2563EB" size={48} />

          <Text className="text-heading text-text-primary text-center">
            {t("aiDisclosure.title")}
          </Text>

          <Text className="text-body text-text-secondary text-center px-lg">
            {t("aiDisclosure.body")}
          </Text>

          <Pressable
            onPress={onAccept}
            className="min-h-[56px] w-full flex-row items-center justify-center rounded-lg bg-accent"
            accessibilityLabel={t("aiDisclosure.accept")}
            accessibilityRole="button"
          >
            <Text className="text-body font-semibold text-white">
              {t("aiDisclosure.accept")}
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </Modal>
  );
}
