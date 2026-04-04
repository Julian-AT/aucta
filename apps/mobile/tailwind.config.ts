import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        accent: "var(--color-accent)",
        destructive: "var(--color-destructive)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "border-default": "var(--color-border-default)",
        "border-focus": "var(--color-border-focus)",
      },
      fontSize: {
        body: ["16px", { lineHeight: "24px" }],
        label: ["14px", { lineHeight: "20px" }],
        heading: ["20px", { lineHeight: "24px" }],
        display: ["28px", { lineHeight: "32px" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
    },
  },
  plugins: [],
} satisfies Config;
