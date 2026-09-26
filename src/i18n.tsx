import React, { createContext, useContext, useMemo, useState } from "react";
import { amharicDictionary } from "./i18n/am";

export type Language = "en" | "am";

export interface LanguageContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
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

  // Substitutes {placeholders} from vars into the resolved string. Untranslated
  // keys fall back to the English key, and a key with no vars is returned
  // untouched, so this is a no-op for the common case.
  const t = useMemo(
    () => (key: string, vars?: Record<string, string | number>) => {
      const template = lang === "en" ? key : translations[key]?.am ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match
      );
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
