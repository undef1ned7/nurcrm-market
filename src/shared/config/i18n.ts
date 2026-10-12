import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import {
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  toHtmlLang,
} from "./locale";

function syncDocumentLang(lng?: string) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = toHtmlLang(lng);
  document.documentElement.dir = "ltr";
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...APP_LANGUAGES],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    ns: ["translation"],
    defaultNS: "translation",
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    syncDocumentLang(i18n.language);
  });

i18n.on("languageChanged", (lng) => {
  syncDocumentLang(lng);
});

export default i18n;
