import React, { createContext, useContext, useMemo, useState } from "react";
import { amharicDictionary } from "./i18n/am";

export type Language = "en" | "am";

export interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
  isAmharic: boolean;
}

const STORAGE_KEY = "staff_review_language";

// English → Amharic dictionary. Any English key without an Amharic translation
// falls back to the English string so the UI never shows a blank.
export const translations: Record<string, { en: string; am: string }> = {};

for (const [en, am] of Object.entries(amharicDictionary)) {
  translations[en] = { en, am };
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k: string) => k,
  isAmharic: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "am" ? "am" : "en";
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = useMemo(
    () => (key: string) => {
      if (lang === "en") return key;
      const entry = translations[key];
      return entry ? entry.am : key;
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, isAmharic: lang === "am" }),
    [lang, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
