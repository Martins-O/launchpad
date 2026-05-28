"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AbstractIntlMessages } from "next-intl";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";
import frMessages from "../../messages/fr.json";
import zhMessages from "../../messages/zh.json";

type Locale = "en" | "es" | "fr" | "zh";

interface LocaleContextType {
  locale: Locale;
  messages: AbstractIntlMessages;
  setLocale: (locale: Locale) => void;
}

const SUPPORTED_LOCALES: Locale[] = ["en", "es", "fr", "zh"];

const STORAGE_KEY = "soropad:locale";

const MESSAGE_MAP: Record<Locale, AbstractIntlMessages> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  zh: zhMessages,
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  messages: MESSAGE_MAP.en,
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
  } catch {}
  return "en";
}

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<AbstractIntlMessages>(MESSAGE_MAP.en);

  useEffect(() => {
    const storedLocale = getInitialLocale();
    if (storedLocale !== "en") {
      setLocaleState(storedLocale);
      setMessages(MESSAGE_MAP[storedLocale]);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setMessages(MESSAGE_MAP[newLocale]);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {}
  };

  return (
    <LocaleContext.Provider value={{ locale, messages, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}
