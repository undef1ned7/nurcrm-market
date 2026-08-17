import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { APP_LANGUAGES, normalizeLanguage, type AppLanguage } from "@shared/config/locale";

type LanguageSelectProps = {
  className?: string;
  id?: string;
};

export function LanguageSelect({ className, id }: LanguageSelectProps) {
  const { t, i18n: i18nInstance } = useTranslation();
  const current = normalizeLanguage(
    i18nInstance.resolvedLanguage || i18nInstance.language,
  );

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as AppLanguage;
    void i18nInstance.changeLanguage(next);
  };

  return (
    <select
      id={id}
      className={className}
      value={current}
      onChange={onChange}
      aria-label={t("settings.general.language")}
    >
      {APP_LANGUAGES.map((lng) => (
        <option key={lng} value={lng}>
          {t(`language.${lng}`)}
        </option>
      ))}
    </select>
  );
}
