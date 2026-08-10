import CountryField from "../CountryField";
import PricingSection from "../PricingSection";

const ProductWarehouseSection = ({
  marketData,
  handleMarketDataChange,
  newItemData,
  fieldErrors,
  handleChange,
  handlePurchasePriceChange,
  handleMarkupFieldChange,
  handlePriceChange,
  filterClient,
  showInputs,
  setShowInputs,
  state,
  setState,
  onSubmit,
  showDebtForm,
  setShowDebtForm,
  company,
  onChangeDebt,
  debtState,
  debt,
  setDebt,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
}) => (
  <>
          {/* Страна */}
          <CountryField
            country={marketData.country}
            onChange={(name) => handleMarketDataChange("country", name)}
          />

          {/* Цены для товара */}
          <PricingSection
            marketData={marketData}
            newItemData={newItemData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleMarketDataChange={handleMarketDataChange}
            handlePurchasePriceChange={handlePurchasePriceChange}
            handleMarkupFieldChange={handleMarkupFieldChange}
            handlePriceChange={handlePriceChange}
          />

          {/* Склад для товара */}
          <div className="market-product-form__section">
            <h3 className="market-product-form__section-title">Склад</h3>
            <div className="market-product-form__form-group">
              <label className="market-product-form__label">
                Выберите поставщика
              </label>
              <div className="add-product-page__supplier-row">
                <select
                  className="market-product-form__input"
                  value={newItemData.client}
                  onChange={handleChange}
                  name="client"
                >
                  <option value="">Выберите поставщика</option>
                  {filterClient.map((client, idx) => (
                    <option key={client.id || idx} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
                <button
                  className="add-product-page__create-supplier"
                  onClick={() => setShowInputs(!showInputs)}
                  type="button"
                >
                  + Создать поставщика
                </button>
              </div>
              {showInputs && (
                <form
                  className="add-product-page__supplier-form"
                  onSubmit={onSubmit}
                >
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    placeholder="ФИО"
                    name="full_name"
                    value={state.full_name}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="llc"
                    placeholder="ОсОО"
                    value={state.llc}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="inn"
                    placeholder="ИНН"
                    value={state.inn}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="okpo"
                    placeholder="ОКПО"
                    value={state.okpo}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="score"
                    placeholder="Р/СЧЁТ"
                    value={state.score}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="bik"
                    placeholder="БИК"
                    value={state.bik}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="address"
                    placeholder="Адрес"
                    value={state.address}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="phone"
                    placeholder="Телефон"
                    value={state.phone}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="email"
                    name="email"
                    placeholder="Почта"
                    value={state.email}
                  />
                  <div className="add-product-page__form-actions">
                    <button
                      type="button"
                      className="add-product-page__cancel-btn"
                      onClick={() => {
                        setShowInputs(false);
                        setState({
                          full_name: "",
                          phone: "",
                          email: "",
                          date: new Date().toISOString().split("T")[0],
                          type: "suppliers",
                          llc: "",
                          inn: "",
                          okpo: "",
                          score: "",
                          bik: "",
                          address: "",
                        });
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="add-product-page__save-btn"
                    >
                      Создать
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Чекбокс для добавления долга */}
            <label className="add-product-page__checkbox-label">
              <input
                type="checkbox"
                checked={showDebtForm}
                onChange={(e) => setShowDebtForm(e.target.checked)}
              />
              Добавить долг по этому товару
            </label>

            {/* Форма долга */}
            {showDebtForm && (
              <div className="add-product-page__debt-form">
                {!newItemData.client && (
                  <p className="add-product-page__error">
                    Выберите поставщика в форме выше!
                  </p>
                )}
                {company?.subscription_plan?.name === "Старт" &&
                  newItemData.client && (
                    <>
                      <div className="market-product-form__form-group">
                        <label className="market-product-form__label">
                          Телефон поставщика
                        </label>
                        <input
                          type="text"
                          onChange={onChangeDebt}
                          name="phone"
                          value={debtState.phone}
                          className="market-product-form__input"
                        />
                      </div>
                      <div className="market-product-form__form-group">
                        <label className="market-product-form__label">
                          Дата оплаты
                        </label>
                        <input
                          type="date"
                          onChange={onChangeDebt}
                          name="dueDate"
                          value={debtState.dueDate}
                          className="market-product-form__input"
                        />
                      </div>
                    </>
                  )}
                <div className="market-product-form__form-group">
                  <label className="market-product-form__label">
                    Тип оплаты
                  </label>
                  <select
                    value={debt}
                    onChange={(e) => setDebt(e.target.value)}
                    className="market-product-form__input"
                  >
                    <option value="">Тип оплаты</option>
                    <option value="Предоплата">Предоплата</option>
                    <option value="Долги">Долг</option>
                  </select>
                </div>
                {debt === "Предоплата" && (
                  <>
                    <div className="market-product-form__form-group">
                      <label className="market-product-form__label">
                        Сумма предоплаты
                      </label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="market-product-form__input"
                      />
                    </div>
                    <div className="market-product-form__form-group">
                      <label className="market-product-form__label">
                        Срок долга (мес.)
                      </label>
                      <input
                        type="text"
                        value={debtMonths}
                        onChange={(e) => setDebtMonths(e.target.value)}
                        className="market-product-form__input"
                      />
                    </div>
                  </>
                )}
                {debt === "Долги" && (
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      Срок долга (мес.)
                    </label>
                    <input
                      type="text"
                      value={debtMonths}
                      onChange={(e) => setDebtMonths(e.target.value)}
                      className="market-product-form__input"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="market-product-form__form-group">
              <label className="market-product-form__label">
                Минимальный остаток
              </label>
              <input
                type="text"
                className="market-product-form__input"
                value={marketData.minStock}
                onChange={(e) =>
                  handleMarketDataChange("minStock", e.target.value)
                }
              />
            </div>
          </div>

          {/* Срок годности */}
          <div className="market-product-form__section">
            <h3 className="market-product-form__section-title">
              Срок годности
            </h3>
            <div className="market-product-form__form-group">
              <input
                type="date"
                className="market-product-form__input"
                value={marketData.expiryDate}
                onChange={(e) =>
                  handleMarketDataChange("expiryDate", e.target.value)
                }
                placeholder="дд. мм. гггг"
              />
            </div>
          </div>
  </>
);

export default ProductWarehouseSection;
