import { useTranslation } from "react-i18next";

/** Settings tab: Безопасность */
export function SecurityTab(props) {
  const { t } = useTranslation();
  const {
    errors,
    formData,
    handlePasswordInputChange,
    handleResetPassword,
    handleSavePassword,
    passwordsMismatch,
    saving,
    showPassword,
    togglePasswordVisibility,
  } = props;

  return (
    <form onSubmit={handleSavePassword} className="settings__tab-form">
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
              d="M12 15V3M12 15L8 11M12 15L16 11M2 17L2.621 19.485C2.72915 19.9177 2.97882 20.3018 3.33033 20.5763C3.68184 20.8508 4.11501 20.9999 4.561 21H19.439C19.885 20.9999 20.3182 20.8508 20.6697 20.5763C21.0212 20.3018 21.2708 19.9177 21.379 19.485L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {t("settings.security.sectionTitle")}
        </h2>

        <div className="settings__form-group">
          {!formData.current_password.trim() && errors?.current_password ? (
            <label
              style={{ color: "red" }}
              className="nur-label"
              htmlFor="currentPassword"
            >
              {errors.current_password[0]}
            </label>
          ) : (
            <label className="nur-label" htmlFor="currentPassword">
              {t("settings.security.currentPassword")}
            </label>
          )}

          <div className="settings__input-wrapper">
            <input
              id="currentPassword"
              name="current_password"
              type={showPassword.current ? "text" : "password"}
              className="nur-input"
              placeholder={t("settings.security.currentPasswordPlaceholder")}
              value={formData.current_password}
              onChange={handlePasswordInputChange}
              autoComplete="current-password"
            />

            <button
              type="button"
              className="settings__password-toggle"
              onClick={() => togglePasswordVisibility("current")}
              aria-label={t("settings.company.showPassword")}
            >
              {showPassword.current ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="settings__form-group">
          {!formData.new_password.trim() && errors?.new_password ? (
            <label
              style={{ color: "red" }}
              className="nur-label"
              htmlFor="newPassword"
            >
              {errors.new_password[0]}
            </label>
          ) : (
            <label className="nur-label" htmlFor="newPassword">
              {t("settings.security.newPassword")}
            </label>
          )}

          <div className="settings__input-wrapper">
            <input
              id="newPassword"
              name="new_password"
              type={showPassword.new ? "text" : "password"}
              className="nur-input"
              placeholder={t("settings.security.newPasswordPlaceholder")}
              value={formData.new_password}
              onChange={handlePasswordInputChange}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="settings__password-toggle"
              onClick={() => togglePasswordVisibility("new")}
              aria-label={t("settings.company.showPassword")}
            >
              {showPassword.new ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="settings__password-strength">
            <div className="settings__strength-bar">
              <div
                className={`settings__strength-fill ${
                  formData.new_password.length > 8
                    ? "strong"
                    : formData.new_password.length > 5
                      ? "medium"
                      : "weak"
                }`}
              />
            </div>
            <span className="settings__strength-text">
              {formData.new_password.length === 0
                ? t("settings.security.enterPassword")
                : formData.new_password.length < 6
                  ? t("settings.security.passwordWeak")
                  : formData.new_password.length < 9
                    ? t("settings.security.passwordMedium")
                    : t("settings.security.passwordStrong")}
            </span>
          </div>
        </div>

        <div className="settings__form-group">
          {!formData.new_password2.trim() && errors?.new_password2 ? (
            <label
              style={{ color: "red" }}
              className="nur-label"
              htmlFor="repeatPassword"
            >
              {errors.new_password2[0]}
            </label>
          ) : (
            <label className="nur-label" htmlFor="repeatPassword">
              {t("settings.security.repeatPassword")}
            </label>
          )}

          <div className="settings__input-wrapper">
            <input
              id="repeatPassword"
              name="new_password2"
              type={showPassword.repeat ? "text" : "password"}
              className={`nur-input ${passwordsMismatch ? "error" : ""}`}
              placeholder={t("settings.security.repeatPasswordPlaceholder")}
              value={formData.new_password2}
              onChange={handlePasswordInputChange}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="settings__password-toggle"
              onClick={() => togglePasswordVisibility("repeat")}
              aria-label={t("settings.company.showPassword")}
            >
              {showPassword.repeat ? "🙈" : "👁️"}
            </button>
          </div>

          {passwordsMismatch && (
            <p className="settings__error-text">
              {t("settings.security.passwordMismatch")}
            </p>
          )}
        </div>
      </div>

      <div className="settings__actions">
        <button
          className="nur-btn nur-btn--primary"
          type="submit"
          disabled={passwordsMismatch || saving}
          title={
            passwordsMismatch
              ? t("settings.security.passwordMismatch")
              : undefined
          }
        >
          {saving ? t("settings.saving") : t("settings.saveChanges")}
        </button>

        <button
          className="nur-btn nur-btn--secondary"
          type="button"
          onClick={handleResetPassword}
          disabled={saving}
        >
          {t("settings.cancel")}
        </button>
      </div>
    </form>
  );
}
