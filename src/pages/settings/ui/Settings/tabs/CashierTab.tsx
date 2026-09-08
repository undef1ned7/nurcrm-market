import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  getDrawerSettings,
  saveDrawerSettings,
} from "@pages/sell/ui/services/printService";
import type { DrawerWhen } from "@pages/sell/ui/services/print/drawer";
import { GlossaryText } from "@shared/ui/GlossaryText/GlossaryText";
import {
  getCustomerDisplaySlidesText,
  getCustomerDisplayTheme,
  getCustomerDisplayWelcome,
  isCustomerDisplayEnabled,
  openCustomerDisplayWindow,
  setCustomerDisplayEnabled,
  setCustomerDisplaySlides,
  setCustomerDisplayTheme,
  setCustomerDisplayWelcome,
} from "@features/customer-display";
import type { CustomerDisplayTheme } from "@features/customer-display";

/** Settings tab: Касса */
export function CashierTab(props) {
  const { t } = useTranslation();
  const {
    cashierSettings,
    cashierSettingsError,
    cashierSettingsLoading,
    cashierSettingsSaving,
    handleSaveCashierSettings,
    setCashierSettings,
    setShowCashierDeleteCode,
    showCashierDeleteCode,
    isMarketSector,
  } = props;
  const [drawerEnabled, setDrawerEnabled] = useState(
    () => getDrawerSettings().enabled,
  );
  const [drawerWhen, setDrawerWhen] = useState<DrawerWhen>(
    () => getDrawerSettings().when,
  );
  const [displayEnabled, setDisplayEnabled] = useState(isCustomerDisplayEnabled);
  const [welcomeText, setWelcomeText] = useState(() =>
    getCustomerDisplayWelcome(),
  );
  const [slidesText, setSlidesText] = useState(getCustomerDisplaySlidesText);
  const [displayTheme, setDisplayTheme] = useState<CustomerDisplayTheme>(
    getCustomerDisplayTheme,
  );

  return (
    <form onSubmit={handleSaveCashierSettings} className="settings__tab-form">
      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">🔐</span>{" "}
          {t("settings.cashier.deleteCodeTitle")}
        </h2>

        <div className="settings__form-group">
          <p className="settings__mutedText">
            <GlossaryText>{t("settings.cashier.deleteCodeHint")}</GlossaryText>
          </p>

          <label className="nur-label" htmlFor="delete_item_code">
            {t("settings.cashier.deleteCodeLabel")}
          </label>
          <div className="settings__input-wrapper">
            <input
              id="delete_item_code"
              name="delete_item_code"
              type={showCashierDeleteCode ? "text" : "password"}
              inputMode="numeric"
              className="nur-input"
              placeholder={t("settings.cashier.deleteCodePlaceholder")}
              autoComplete="off"
              disabled={cashierSettingsLoading}
              value={cashierSettings.deleteCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                setCashierSettings((prev) => ({
                  ...prev,
                  deleteCode: value,
                }));
              }}
            />
            <button
              type="button"
              className="settings__password-toggle"
              onClick={() => setShowCashierDeleteCode((prev) => !prev)}
              aria-label={t("settings.cashier.showCode")}
            >
              {showCashierDeleteCode ? "🙈" : "👁️"}
            </button>
          </div>

          {cashierSettings.deleteCode ? (
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              style={{ marginTop: 10, width: "auto" }}
              onClick={() =>
                setCashierSettings((prev) => ({
                  ...prev,
                  deleteCode: "",
                }))
              }
            >
              {t("settings.cashier.removeCode")}
            </button>
          ) : (
            <p className="settings__mutedText" style={{ marginTop: 8 }}>
              {t("settings.cashier.deleteCodeNotRequired")}
            </p>
          )}
        </div>
      </div>

      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">📅</span>{" "}
          {t("settings.cashier.debtTitle")}
        </h2>
        <p className="settings__mutedText">{t("settings.cashier.debtHint")}</p>
        <div className="settings__prefRow">
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            disabled={cashierSettingsLoading}
            style={{
              width: "auto",
              opacity: cashierSettings.debtScheduleVersion === "v2" ? 1 : 0.65,
              outline:
                cashierSettings.debtScheduleVersion === "v2"
                  ? "2px solid var(--nur-primary, #f7d74f)"
                  : undefined,
            }}
            onClick={() =>
              setCashierSettings((prev) => ({
                ...prev,
                debtScheduleVersion: "v2",
              }))
            }
          >
            {t("settings.cashier.debtV2")}
          </button>
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            disabled={cashierSettingsLoading}
            style={{
              width: "auto",
              opacity: cashierSettings.debtScheduleVersion === "v1" ? 1 : 0.65,
              outline:
                cashierSettings.debtScheduleVersion === "v1"
                  ? "2px solid var(--nur-primary, #f7d74f)"
                  : undefined,
            }}
            onClick={() =>
              setCashierSettings((prev) => ({
                ...prev,
                debtScheduleVersion: "v1",
              }))
            }
          >
            {t("settings.cashier.debtV1")}
          </button>
        </div>
      </div>

      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">％</span>{" "}
          {t("settings.cashier.maxDiscountTitle")}
        </h2>

        <div className="settings__form-group">
          <p className="settings__mutedText">
            <GlossaryText>{t("settings.cashier.maxDiscountHint")}</GlossaryText>
          </p>

          <label className="nur-label" htmlFor="max_discount_percent">
            {t("settings.cashier.maxDiscountLabel")}
          </label>
          <input
            id="max_discount_percent"
            name="max_discount_percent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="nur-input"
            placeholder={t("settings.cashier.maxDiscountPlaceholder")}
            disabled={cashierSettingsLoading}
            value={cashierSettings.maxDiscountPercent}
            onChange={(e) =>
              setCashierSettings((prev) => ({
                ...prev,
                maxDiscountPercent: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {isMarketSector ? (
        <div className="settings__section">
          <h2 className="settings__section-title">
            <span className="settings__emoji">💵</span>{" "}
            {t("settings.cashier.drawerTitle")}
          </h2>
          <p className="settings__mutedText">{t("settings.cashier.drawerHint")}</p>
          <div className="settings__prefRow">
            <div className="settings__prefText">
              <span className="settings__prefLabel">
                {t("settings.cashier.drawerEnabled")}
              </span>
              <p className="settings__prefHint">
                {t("settings.cashier.drawerEnabledHint")}
              </p>
            </div>
            <label className="settings__switch">
              <input
                type="checkbox"
                className="settings__switch-input"
                checked={drawerEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setDrawerEnabled(enabled);
                  const current = getDrawerSettings();
                  saveDrawerSettings({
                    enabled,
                    when: drawerWhen,
                    command: current.command,
                  });
                }}
              />
              <span className="settings__switch-track" aria-hidden="true">
                <span className="settings__switch-thumb" />
              </span>
            </label>
          </div>
          {drawerEnabled ? (
            <div className="settings__form-group">
              <div className="nur-label">{t("settings.cashier.drawerWhenLabel")}</div>
              <div className="settings__segmented">
                <button
                  type="button"
                  className={`settings__segBtn ${drawerWhen === "before" ? "settings__segBtn--active" : ""}`}
                  onClick={() => {
                    setDrawerWhen("before");
                    const current = getDrawerSettings();
                    saveDrawerSettings({
                      enabled: drawerEnabled,
                      when: "before",
                      command: current.command,
                    });
                  }}
                >
                  {t("settings.cashier.drawerBefore")}
                </button>
                <button
                  type="button"
                  className={`settings__segBtn ${drawerWhen === "after" ? "settings__segBtn--active" : ""}`}
                  onClick={() => {
                    setDrawerWhen("after");
                    const current = getDrawerSettings();
                    saveDrawerSettings({
                      enabled: drawerEnabled,
                      when: "after",
                      command: current.command,
                    });
                  }}
                >
                  {t("settings.cashier.drawerAfter")}
                </button>
              </div>
            </div>
          ) : null}
          <p className="settings__mutedText">
            {t("settings.cashier.drawerAdvanced")}{" "}
            <Link to="/crm/pos-print-settings">{t("settings.cashier.drawerAdvancedLink")}</Link>
          </p>
        </div>
      ) : null}

      <div className="settings__section">
        <h2 className="settings__section-title">
          <span className="settings__emoji">🖥️</span>{" "}
          {t("settings.cashier.customerDisplayTitle")}
        </h2>
        <p className="settings__mutedText">
          <GlossaryText>{t("settings.cashier.customerDisplayHint")}</GlossaryText>
        </p>
        <div className="settings__prefRow">
          <div className="settings__prefText">
            <span className="settings__prefLabel">
              {t("settings.cashier.customerDisplayEnable")}
            </span>
            <p className="settings__prefHint">
              {t("settings.cashier.customerDisplayEnableHint")}
            </p>
          </div>
          <label className="settings__switch">
            <input
              type="checkbox"
              className="settings__switch-input"
              checked={displayEnabled}
              onChange={(e) => {
                setDisplayEnabled(e.target.checked);
                setCustomerDisplayEnabled(e.target.checked);
              }}
            />
            <span className="settings__switch-track" aria-hidden="true">
              <span className="settings__switch-thumb" />
            </span>
          </label>
        </div>
        <div className="settings__form-group nur-field">
          <label className="nur-label" htmlFor="customer-display-theme">
            {t("settings.cashier.customerDisplayTheme")}
          </label>
          <select
            id="customer-display-theme"
            className="nur-input"
            value={displayTheme}
            onChange={(e) => {
              const next = e.target.value === "light" ? "light" : "dark";
              setDisplayTheme(next);
              setCustomerDisplayTheme(next);
            }}
          >
            <option value="dark">{t("settings.cashier.customerDisplayThemeDark")}</option>
            <option value="light">{t("settings.cashier.customerDisplayThemeLight")}</option>
          </select>
        </div>
        <div className="settings__form-group nur-field">
          <label className="nur-label" htmlFor="customer-display-welcome">
            {t("settings.cashier.customerDisplayWelcome")}
          </label>
          <input
            id="customer-display-welcome"
            className="nur-input"
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
            onBlur={() => setCustomerDisplayWelcome(welcomeText)}
          />
        </div>
        <div className="settings__form-group nur-field">
          <label className="nur-label" htmlFor="customer-display-slides">
            {t("settings.cashier.customerDisplaySlides")}
          </label>
          <textarea
            id="customer-display-slides"
            className="nur-input"
            rows={3}
            value={slidesText}
            onChange={(e) => setSlidesText(e.target.value)}
            onBlur={() => setCustomerDisplaySlides(slidesText)}
          />
        </div>
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          disabled={!displayEnabled}
          onClick={() => openCustomerDisplayWindow()}
        >
          {t("settings.cashier.customerDisplayOpen")}
        </button>
      </div>

      {cashierSettingsError ? (
        <p
          className="settings__mutedText"
          style={{ color: "#dc2626", marginBottom: 12 }}
        >
          {cashierSettingsError}
        </p>
      ) : null}

      <div className="settings__actions">
        <button
          className="nur-btn nur-btn--primary"
          type="submit"
          disabled={cashierSettingsSaving || cashierSettingsLoading}
        >
          {cashierSettingsSaving ? t("settings.saving") : t("settings.saveChanges")}
        </button>
      </div>
    </form>
  );
}
