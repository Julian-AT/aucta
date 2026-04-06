export const lightColors = {
  background: "#FFFFFF",
  surface: "#F8FAFC",
  accent: "#2563EB",
  destructive: "#DC2626",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textOnAccent: "#FFFFFF",
  borderDefault: "#E2E8F0",
  borderFocus: "#2563EB",
} as const;

export const darkColors = {
  background: "#0F172A",
  surface: "#1E293B",
  accent: "#3B82F6",
  destructive: "#EF4444",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textOnAccent: "#FFFFFF",
  borderDefault: "#334155",
  borderFocus: "#3B82F6",
} as const;

export const overlayColors = {
  overlayBg: "rgba(0, 0, 0, 0.6)",
  overlayBgLight: "rgba(0, 0, 0, 0.4)",
  overlayText: "#FFFFFF",
  overlayTextMuted: "rgba(255, 255, 255, 0.7)",
  statusConnected: "#22C55E",
  statusReconnecting: "#F59E0B",
  statusLost: "#EF4444",
  aiIndicatorBg: "rgba(0, 0, 0, 0.7)",
} as const;
