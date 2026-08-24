import { useTranslation } from "react-i18next";
import { GlossaryText } from "@shared/ui/GlossaryText/GlossaryText";
import { LanguageSelect } from "@shared/ui/LanguageSelect/LanguageSelect";

/** Settings tab: Интерфейс */
export function InterfaceTab(props) {
  const { t } = useTranslation();
  const {
    Moon,
    Sun,
    handleSaveInterfaceSettings,
    mode,
    saving,
    setMode,
    setSidebarAutoClose,
    sidebarAutoClose,
  } = props;

  return (
    <form
      onSubmit={handleSaveInterfaceSettings}
      className="settings__tab-form"
    >
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">🧩</span>{" "}
          {t("settings.interface.sectionTitle")}
        </h2>

        <div className="settings__prefRow">
          <div className="settings__prefText">
            <label className="settings__prefLabel" htmlFor="settings-language">
              {t("settings.interface.language")}
            </label>
            <p className="settings__prefHint">
              <GlossaryText>{t("settings.interface.languageHint")}</GlossaryText>
            </p>
          </div>
          <LanguageSelect
            id="settings-language"
            className="settings__languageSelect"
          />
        </div>

        <div className="settings__prefRow">
          <div className="settings__prefText">
            <span className="settings__prefLabel">
              {t("settings.interface.sidebarAutoClose")}
            </span>
            <p className="settings__prefHint">
              <GlossaryText>
                {sidebarAutoClose
                  ? t("settings.interface.sidebarAutoCloseOn")
                  : t("settings.interface.sidebarAutoCloseOff")}
              </GlossaryText>
            </p>
          </div>
          <label className="settings__switch">
            <input
              type="checkbox"
              checked={sidebarAutoClose}
              onChange={(e) => {
                const newValue = e.target.checked;
                setSidebarAutoClose(newValue);
                localStorage.setItem("sidebarAutoClose", String(newValue));
              }}
              className="settings__switch-input"
            />
            <span className="settings__switch-track" aria-hidden="true">
              <span className="settings__switch-thumb" />
            </span>
            <span className="settings__switch-sr">
              {t("settings.interface.sidebarAutoClose")}
            </span>
          </label>
        </div>

        <div className="settings__themeBlock">
          <div className="settings__prefText">
            <span className="settings__prefLabel">
              {t("settings.interface.themeMode")}
            </span>
            <p className="settings__prefHint">
              {t("settings.interface.themeHint")}
            </p>
          </div>

          <div
            className="settings__themeToggle"
            role="radiogroup"
            aria-label={t("settings.interface.themeMode")}
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "light"}
              className={`settings__themeOption${
                mode === "light" ? " settings__themeOption--active" : ""
              }`}
              onClick={() => setMode("light")}
            >
              <Sun size={18} aria-hidden="true" />
              <span>{t("settings.interface.themeLight")}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "dark"}
              className={`settings__themeOption${
                mode === "dark" ? " settings__themeOption--active" : ""
              }`}
              onClick={() => setMode("dark")}
            >
              <Moon size={18} aria-hidden="true" />
              <span>{t("settings.interface.themeDark")}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="settings__actions">
        <button
          className="nur-btn nur-btn--primary"
          type="submit"
          disabled={saving}
        >
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </button>
      </div>
    </form>
  );
}
