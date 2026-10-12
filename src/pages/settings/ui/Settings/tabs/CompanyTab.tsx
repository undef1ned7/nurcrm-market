import { useTranslation } from "react-i18next";
import { GlossaryText } from "@shared/ui/GlossaryText/GlossaryText";

/** Settings tab: Моя компания */
export function CompanyTab(props) {
  const { t } = useTranslation();
  const {
    SCALE_BARCODE_MODE_OPTIONS,
    companyState,
    handleCompanyChange,
    handleResetCompany,
    handleSaveCompany,
    isMarketSector,
    profile,
    saving,
    showPassword,
    togglePasswordVisibility,
  } = props;

  const fields = [
    {
      id: "llc",
      label: t("settings.company.llc"),
      placeholder: t("settings.company.llcPlaceholder"),
    },
    {
      id: "inn",
      label: t("settings.company.inn"),
      placeholder: t("settings.company.innPlaceholder"),
    },
    {
      id: "okpo",
      label: t("settings.company.okpo"),
      placeholder: t("settings.company.okpoPlaceholder"),
    },
    {
      id: "score",
      label: t("settings.company.score"),
      placeholder: t("settings.company.scorePlaceholder"),
    },
    {
      id: "bik",
      label: t("settings.company.bik"),
      placeholder: t("settings.company.bikPlaceholder"),
    },
    {
      id: "address",
      label: t("settings.company.address"),
      placeholder: t("settings.company.addressPlaceholder"),
    },
    {
      id: "phones_howcase",
      label: t("settings.company.phonesShowcase"),
      placeholder: t("settings.company.phonesShowcasePlaceholder"),
    },
  ];

  return (
    <form onSubmit={handleSaveCompany} className="settings__tab-form">
      {profile?.role === "owner" && (
        <div className="settings__section">
          <h2 className="settings__section-title">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 7L10 17L5 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("settings.company.sectionTitle")}
          </h2>

          <div className="settings__form-group">
            <label className="nur-label" htmlFor="companyName">
              {t("settings.company.name")}
            </label>
            <div className="settings__input-wrapper">
              <input
                id="companyName"
                name="name"
                type="text"
                className="nur-input"
                placeholder={t("settings.company.namePlaceholder")}
                value={companyState.name}
                onChange={handleCompanyChange}
              />
            </div>
          </div>

          {fields.map((field) => (
            <div
              key={field.id}
              className="settings__form-group"
              style={{ marginTop: "15px" }}
            >
              <label className="nur-label" htmlFor={field.id}>
                {field.label}
              </label>
              <div className="settings__input-wrapper">
                <input
                  id={field.id}
                  name={field.id}
                  type="text"
                  className="nur-input"
                  placeholder={field.placeholder}
                  value={companyState[field.id] ?? ""}
                  onChange={handleCompanyChange}
                />
              </div>
            </div>
          ))}

          <div className="settings__form-group" style={{ marginTop: "15px" }}>
            <label className="nur-label" htmlFor="scale_barcode_mode">
              {t("settings.company.scaleBarcodeMode")}
            </label>
            <select
              id="scale_barcode_mode"
              name="scale_barcode_mode"
              className="nur-select"
              value={companyState.scale_barcode_mode || "auto"}
              onChange={handleCompanyChange}
            >
              {SCALE_BARCODE_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="settings__mutedText" style={{ marginTop: 8 }}>
              <GlossaryText>
                {t("settings.company.scaleBarcodeModeHint")}
              </GlossaryText>
            </p>
          </div>

          {isMarketSector && (
            <div className="settings__form-group" style={{ marginTop: "15px" }}>
              <label className="nur-label" htmlFor="cashier_password">
                {t("settings.company.cashierDeletePassword")}
              </label>
              <div className="settings__input-wrapper">
                <input
                  id="cashier_password"
                  name="cashier_password"
                  type={showPassword.cashier ? "text" : "password"}
                  className="nur-input"
                  placeholder={t(
                    "settings.company.cashierDeletePasswordPlaceholder",
                  )}
                  value={companyState.cashier_password ?? ""}
                  onChange={handleCompanyChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="settings__password-toggle"
                  onClick={() => togglePasswordVisibility("cashier")}
                  aria-label={t("settings.company.showCashierPassword")}
                >
                  {showPassword.cashier ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {profile?.role === "owner" && (
        <div className="settings__actions">
          <button
            className="nur-btn nur-btn--primary"
            type="submit"
            disabled={saving}
          >
            {saving ? t("settings.saving") : t("settings.saveChanges")}
          </button>

          <button
            className="nur-btn nur-btn--secondary"
            type="button"
            onClick={handleResetCompany}
            disabled={saving}
          >
            {t("settings.cancel")}
          </button>
        </div>
      )}
    </form>
  );
}
