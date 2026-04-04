import { lightColors, darkColors } from "./colors";

export type ThemeMode = "light" | "dark" | "system";

export const themes = {
  light: lightColors,
  dark: darkColors,
} as const;

// Touch target sizes per UI-SPEC / UX-01
export const TOUCH_TARGETS = {
  PRIMARY: 56, // 56x56dp for primary actions
  SECONDARY: 44, // 44x44dp for secondary actions
  TAB_ICON: 24, // Tab bar icon size
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;
