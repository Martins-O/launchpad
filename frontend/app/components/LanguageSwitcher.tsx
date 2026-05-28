"use client";

import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLocale } from "../providers/LocaleProvider";

const SUPPORTED_LOCALES = [
  { code: "en" as const, label: "English" },
  { code: "es" as const, label: "Español" },
  { code: "fr" as const, label: "Français" },
  { code: "zh" as const, label: "中文" },
];

type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (code: LocaleCode) => {
    setLocale(code);
    setIsOpen(false);
  };

  const currentLabel =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.label ?? "English";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <Globe className="h-4 w-4 text-stellar-400" />
        <span>{currentLabel}</span>
        <ChevronDown className="h-3 w-3 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Available languages"
            className="absolute left-0 mt-2 w-36 origin-top-left rounded-xl border border-white/10 bg-void-800 p-1 shadow-2xl z-50"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === locale}
                  onClick={() => handleSelect(l.code)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    l.code === locale
                      ? "bg-stellar-500/10 text-stellar-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
