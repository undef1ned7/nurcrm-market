import { useTranslation } from "react-i18next";
import { LanguageSelect } from "@shared/ui/LanguageSelect/LanguageSelect";
import "./General.scss";

const MENU_KEYS = [
  "deals",
  "contacts",
  "finance",
  "projects",
  "dealTasks",
  "mail",
  "knowledgeBase",
  "clientChats",
] as const;

const General = () => {
  const { t } = useTranslation();

  return (
    <div className="general">
      <div className="general__left">
        <h3 className="general__title">{t("settings.general.title")}</h3>
        <div className="general__form">
          <label className="general__label">
            {t("settings.general.address")}
            <input
              type="text"
              value="client-vxyoo"
              disabled
              className="general__input"
            />
          </label>
          <label className="general__label">
            {t("settings.general.language")}
            <LanguageSelect className="general__select" />
          </label>
          <label className="general__label">
            {t("settings.general.currency")}
            <select className="general__select" disabled>
              <option>{t("common.currencySom")}</option>
            </select>
          </label>
          <label className="general__label">
            {t("settings.general.timezone")}
            <select className="general__select" disabled>
              <option>{t("settings.general.timezoneBishkek")}</option>
            </select>
          </label>
        </div>
      </div>

      <div className="general__right">
        <h3 className="general__title">{t("settings.general.menuTitle")}</h3>
        <div className="general__menu">
          {MENU_KEYS.map((item) => (
            <div className="general__menu-item" key={item}>
              <span>{t(`settings.general.menu.${item}`)}</span>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default General;
