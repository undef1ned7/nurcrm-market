/** Settings tab: Моя компания */
export function CompanyTab(props) {
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
                Основная информация
              </h2>

              <div className="settings__form-group">
                <label className="nur-label" htmlFor="companyName">
                  Название компании
                </label>
                <div className="settings__input-wrapper">
                  <input
                    id="companyName"
                    name="name"
                    type="text"
                    className="nur-input"
                    placeholder="Введите название компании"
                    value={companyState.name}
                    onChange={handleCompanyChange}
                  />
                  <div className="settings__input-icon">
                    <svg
                      width="16"
                      height="16"
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
                  </div>
                </div>
              </div>

              {[
                {
                  id: "llc",
                  label: "Название ООО",
                  placeholder: "Введите название ООО",
                },
                { id: "inn", label: "ИНН", placeholder: "Введите ИНН" },
                { id: "okpo", label: "ОКПО", placeholder: "Введите ОКПО" },
                {
                  id: "score",
                  label: "Расчетный счет",
                  placeholder: "Введите расчетный счет",
                },
                { id: "bik", label: "БИК", placeholder: "Введите БИК" },
                {
                  id: "address",
                  label: "Адрес",
                  placeholder: "Введите адрес",
                },
                {
                id: "phones_howcase",
                  label: "Телефоны для витрины (WhatsApp)",
                  placeholder: "Введите телефоны для витрины (WhatsApp)",
                },
              ].map((field) => (
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

              <div
                className="settings__form-group"
                style={{ marginTop: "15px" }}
              >
                <label
                  className="nur-label"
                  htmlFor="scale_barcode_mode"
                >
                  Режим штрихкода весов
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
                  Если весы печатают вес в штрихкоде — выберите «По весу».
                  Если печатают стоимость — «По сумме». «Авто» определяет тип
                  по префиксу штрихкода (20 — вес, 25 — сумма).
                </p>
              </div>

              {isMarketSector && (
                <div
                  className="settings__form-group"
                  style={{ marginTop: "15px" }}
                >
                  <label
                    className="nur-label"
                    htmlFor="cashier_password"
                  >
                    Пароль кассира для удаления из корзины
                  </label>
                  <div className="settings__input-wrapper">
                    <input
                      id="cashier_password"
                      name="cashier_password"
                      type={showPassword.cashier ? "text" : "password"}
                      className="nur-input"
                      placeholder="Введите новый пароль кассира"
                      value={companyState.cashier_password ?? ""}
                      onChange={handleCompanyChange}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="settings__password-toggle"
                      onClick={() => togglePasswordVisibility("cashier")}
                      aria-label="Показать/скрыть пароль кассира"
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
                <svg
                  width="16"
                  height="16"
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
                {saving ? "Сохранение..." : "Сохранить изменения"}
              </button>

              <button
                className="nur-btn nur-btn--secondary"
                type="button"
                onClick={handleResetCompany}
                disabled={saving}
              >
                Отменить
              </button>
            </div>
          )}
        </form>
      );

}
