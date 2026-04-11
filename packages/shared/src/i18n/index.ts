export { default as en } from "./locales/en";
export type { TranslationKeys } from "./locales/en";
export { default as de } from "./locales/de";
export { default as tr } from "./locales/tr";
export { default as sr } from "./locales/sr";
export { default as hr } from "./locales/hr";
export { default as pl } from "./locales/pl";
export { default as ro } from "./locales/ro";

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "sr", name: "Serbian", nativeName: "Srpski" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "ro", name: "Romanian", nativeName: "Română" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: SupportedLanguageCode = "en";

export const FALLBACK_LANGUAGE: SupportedLanguageCode = "en";
