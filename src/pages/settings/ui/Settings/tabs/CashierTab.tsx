/** Settings tab: Касса */
export function CashierTab(props) {
  const {
    cashierSettings,
    cashierSettingsError,
    cashierSettingsLoading,
    cashierSettingsSaving,
    handleSaveCashierSettings,
    setCashierSettings,
    setShowCashierDeleteCode,
    showCashierDeleteCode,
  } = props;

      return (
        <form
          onSubmit={handleSaveCashierSettings}
          className="settings__tab-form"
        >
          <div className="settings__section">
            <h2 className="settings__section-title">
              <span className="settings__emoji">🔐</span> Код на удаление из
              корзины
            </h2>

            <div className="settings__form-group">
              <p className="settings__mutedText">
                Если код задан, кассир сможет удалить товар из корзины только
                после его ввода. Оставьте поле пустым — товары будут удаляться
                без подтверждения. Владелец и админ удаляют без кода.
              </p>

              <label className="nur-label" htmlFor="delete_item_code">
                Код подтверждения (4–8 цифр)
              </label>
              <div className="settings__input-wrapper">
                <input
                  id="delete_item_code"
                  name="delete_item_code"
                  type={showCashierDeleteCode ? "text" : "password"}
                  inputMode="numeric"
                  className="nur-input"
                  placeholder="Например, 1234"
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
                  aria-label="Показать/скрыть код"
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
                  Убрать код
                </button>
              ) : (
                <p
                  className="settings__mutedText"
                  style={{ marginTop: 8 }}
                >
                  Сейчас код не требуется — удаление проходит без
                  подтверждения.
                </p>
              )}
            </div>
          </div>

          <div className="settings__section">
            <h2 className="settings__section-title">
              <span className="settings__emoji">％</span> Максимальная скидка
            </h2>

            <div className="settings__form-group">
              <p className="settings__mutedText">
                Ограничение для сотрудников: скидка на позицию и на весь чек
                не сможет превысить указанный процент. Пустое поле — без
                ограничения. На владельца и админа ограничение не действует.
              </p>

              <label
                className="nur-label"
                htmlFor="max_discount_percent"
              >
                Максимальная скидка, %
              </label>
              <input
                id="max_discount_percent"
                name="max_discount_percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="nur-input"
                placeholder="Без ограничения"
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
              {cashierSettingsSaving ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </form>
      );

}
