export const APP_LANGUAGES = ["ru", "ky"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "ru";

export const BUSINESS_TIMEZONE = "Asia/Bishkek";

export function normalizeLanguage(lng?: string | null): AppLanguage {
  const raw = (lng || DEFAULT_LANGUAGE).toLowerCase();
  if (raw === "ky" || raw.startsWith("ky-")) return "ky";
  return "ru";
}

export function toBcp47(lng?: string | null): string {
  return normalizeLanguage(lng) === "ky" ? "ky-KG" : "ru-RU";
}

export function toHtmlLang(lng?: string | null): AppLanguage {
  return normalizeLanguage(lng);
}
