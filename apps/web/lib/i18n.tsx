"use client";

import i18next from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
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

function getBrowserLanguage(): string {
  if (typeof navigator === "undefined") return FALLBACK_LANGUAGE;

  for (const lang of navigator.languages) {
    const code = lang.split("-")[0];
    if (code && supportedCodes.includes(code as (typeof supportedCodes)[number])) {
      return code;
    }
  }

  return FALLBACK_LANGUAGE;
}

const i18nInstance = i18next.createInstance();
i18nInstance.use(initReactI18next).init({
  resources,
  lng: getBrowserLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: supportedCodes,
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>
  );
}

export { i18nInstance as i18n };
