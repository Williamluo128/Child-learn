"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";

const LABEL: Record<Locale, string> = { zh: "中", en: "EN" };

export function LangToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex rounded-control border-2 border-line bg-surface p-1 shadow-edge-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`min-h-8 rounded-lg px-2.5 py-1 text-sm font-bold transition active:scale-[0.98] ${
            locale === l
              ? "bg-violet-soft text-violet-deep"
              : "text-muted hover:text-ink"
          }`}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
