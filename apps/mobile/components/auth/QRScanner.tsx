import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

interface QRScannerProps {
  onScan: (code: string) => void;
  onCancel: () => void;
}

export function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    // Support deep link format: aucta://join/{CODE} or raw 6-char code
    const deepLinkMatch = data.match(/aucta:\/\/join\/([A-Za-z0-9]{6})/);
    if (deepLinkMatch) {
      onScan(deepLinkMatch[1].toUpperCase());
      return;
    }

    const rawMatch = data.match(/^[A-Za-z0-9]{6}$/);
    if (rawMatch) {
      onScan(data.toUpperCase());
      return;
    }

    // Invalid QR, allow re-scanning
    setScanned(false);
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-body text-white">Requesting camera access...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black gap-lg px-md">
        <Text className="text-heading text-white text-center">
          Camera access needed
        </Text>
        <Text className="text-body text-white/70 text-center">
          Allow camera access to scan QR codes for invite codes.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="min-h-[56px] items-center justify-center rounded-lg bg-accent px-xl"
          accessibilityLabel="Allow Camera Access"
          accessibilityRole="button"
        >
          <Text className="text-body font-semibold text-white">
            Allow Camera Access
          </Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          className="min-h-[44px] items-center justify-center"
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text className="text-body text-white/70">Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        className="flex-1"
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay with scan frame */}
        <View className="flex-1 items-center justify-center">
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text className="mt-lg text-body text-white text-center">
            Point at a QR code to scan
          </Text>
        </View>

        {/* Bottom controls */}
        <View className="items-center pb-2xl gap-md">
          <Pressable
            onPress={onCancel}
            className="min-h-[56px] items-center justify-center rounded-lg bg-white/20 px-xl"
            accessibilityLabel="Cancel scanning"
            accessibilityRole="button"
          >
            <Text className="text-body font-semibold text-white">Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            className="min-h-[44px] items-center justify-center"
            accessibilityLabel="Enter code manually"
            accessibilityRole="link"
          >
            <Text className="text-label text-white/70">
              Enter code manually
            </Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
});
