import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import {
  en,
  de,
  tr,
  sr,
  hr,
  pl,
  ro,
  FALLBACK_LANGUAGE,
  SUPPORTED_LANGUAGES,
} from "@aucta/shared/i18n";

const resources = {
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
  sr: { translation: sr },
  hr: { translation: hr },
  pl: { translation: pl },
  ro: { translation: ro },
} as const;

const supportedCodes = SUPPORTED_LANGUAGES.map((l) => l.code);

function getDeviceLanguage(): string {
  const locales = getLocales();
  if (locales.length === 0) return FALLBACK_LANGUAGE;

  // Try exact match first (e.g., "de"), then language prefix (e.g., "de-AT" → "de")
  for (const locale of locales) {
    const code = locale.languageCode;
    if (code && supportedCodes.includes(code as (typeof supportedCodes)[number])) {
      return code;
    }
  }

  return FALLBACK_LANGUAGE;
}

i18next.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: supportedCodes,
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Required for React Native
  },
});

export default i18next;
