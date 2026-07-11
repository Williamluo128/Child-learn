export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "zh";

// A string that exists in every supported locale.
export type LocalizedString = Record<Locale, string>;

export function pick(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value[DEFAULT_LOCALE];
}

export function isLocale(v: string | null | undefined): v is Locale {
  return v === "zh" || v === "en";
}
