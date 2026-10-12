import { useTranslation } from "react-i18next";
import { GlossaryText } from "@shared/ui/GlossaryText/GlossaryText";

/** Settings tab: Токен для весов */
export function ScalesTokenTab(props) {
  const { t } = useTranslation();
  const { handleCreateScalesToken } = props;

  return (
    <div className="settings__tab-content">
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">⚙️</span>{" "}
          {t("settings.scalesToken.sectionTitle")}
        </h2>

        <div className="settings__form-group">
          <p className="settings__mutedText">
            <GlossaryText>{t("settings.scalesToken.hint")}</GlossaryText>
          </p>

          <button
            type="button"
            className="nur-btn nur-btn--primary"
            onClick={handleCreateScalesToken}
          >
            {t("settings.scalesToken.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
