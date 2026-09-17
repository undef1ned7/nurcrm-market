import { useTranslation } from "react-i18next";
import CountryField from "../CountryField";
import PricingSection from "../PricingSection";
import {
  FormBlock,
  useOptionalProductFormLayout,
} from "../../formLayout";
import { isBatchExpiryEnabled } from "@entities/product";

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
}) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  const layout = useOptionalProductFormLayout();
  const showWarehouseCard =
    !layout ||
    layout.isVisible("supplier") ||
    layout.isVisible("debt") ||
    layout.isVisible("minStock");

  return (
  <>
          <FormBlock id="country">
          <CountryField
            country={marketData.country}
            onChange={(name) => handleMarketDataChange("country", name)}
          />
          </FormBlock>

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

          {showWarehouseCard ? (
          <div className="market-product-form__section">
            <h3 className="market-product-form__section-title">
              {tp("warehouseTitle")}
            </h3>
            <FormBlock id="supplier">
            <div className="market-product-form__form-group">
              <label className="market-product-form__label">
                {tp("supplierSelectLabel")}
              </label>
              <div className="add-product-page__supplier-row">
                <select
                  className="market-product-form__input"
                  value={newItemData.client}
                  onChange={handleChange}
                  name="client"
                >
                  <option value="">{tp("supplierSelectLabel")}</option>
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
                  {tp("createSupplier")}
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
                    placeholder={tp("supplierFullName")}
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
                    placeholder={tp("supplierLlc")}
                    value={state.llc}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="inn"
                    placeholder={tp("supplierInn")}
                    value={state.inn}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="okpo"
                    placeholder={tp("supplierOkpo")}
                    value={state.okpo}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="score"
                    placeholder={tp("supplierScore")}
                    value={state.score}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="bik"
                    placeholder={tp("supplierBik")}
                    value={state.bik}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="address"
                    placeholder={tp("supplierAddress")}
                    value={state.address}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="text"
                    name="phone"
                    placeholder={tp("supplierPhone")}
                    value={state.phone}
                  />
                  <input
                    className="add-product-page__input"
                    onChange={(e) =>
                      setState({ ...state, [e.target.name]: e.target.value })
                    }
                    type="email"
                    name="email"
                    placeholder={tp("supplierEmail")}
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
                      {t("common.cancel")}
                    </button>
                    <button
                      type="submit"
                      className="add-product-page__save-btn"
                    >
                      {t("common.create")}
                    </button>
                  </div>
                </form>
              )}
            </div>
            </FormBlock>

            <FormBlock id="debt">
            <label className="add-product-page__checkbox-label">
              <input
                type="checkbox"
                checked={showDebtForm}
                onChange={(e) => setShowDebtForm(e.target.checked)}
              />
              {tp("addDebtForProduct")}
            </label>

            {/* Форма долга */}
            {showDebtForm && (
              <div className="add-product-page__debt-form">
                {!newItemData.client && (
                  <p className="add-product-page__error">
                    {tp("selectSupplierAbove")}
                  </p>
                )}
                {company?.subscription_plan?.name === "Старт" &&
                  newItemData.client && (
                    <>
                      <div className="market-product-form__form-group">
                        <label className="market-product-form__label">
                          {tp("supplierPhoneLabel")}
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
                          {tp("paymentDate")}
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
                    {tp("paymentType")}
                  </label>
                  <select
                    value={debt}
                    onChange={(e) => setDebt(e.target.value)}
                    className="market-product-form__input"
                  >
                    <option value="">{tp("paymentType")}</option>
                    <option value="Предоплата">{tp("prepayment")}</option>
                    <option value="Долги">{tp("debtOption")}</option>
                  </select>
                </div>
                {debt === "Предоплата" && (
                  <>
                    <div className="market-product-form__form-group">
                      <label className="market-product-form__label">
                        {tp("prepaymentAmount")}
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
                      {tp("debtTermMonths")}
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
            </FormBlock>

            <FormBlock id="minStock">
            <div className="market-product-form__form-group">
              <label className="market-product-form__label">
                {tp("minStockLabel")}
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
            </FormBlock>
          </div>
          ) : null}

          <FormBlock id="expiry">
          <div className="market-product-form__section">
            <h3 className="market-product-form__section-title">
              {tp("shelfLifeTitle")}
            </h3>
            {isBatchExpiryEnabled() ? (
              <div className="market-product-form__form-group">
                <p className="add-product-page__hint">
                  {tp("shelfLifeDurationHint")}
                </p>
                <div className="add-product-page__shelf-life-row">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="market-product-form__input"
                    value={marketData.shelfLifeValue}
                    onChange={(e) =>
                      handleMarketDataChange("shelfLifeValue", e.target.value)
                    }
                    placeholder={tp("shelfLifeValuePlaceholder")}
                  />
                  <select
                    className="market-product-form__input"
                    value={marketData.shelfLifeUnit}
                    onChange={(e) =>
                      handleMarketDataChange("shelfLifeUnit", e.target.value)
                    }
                  >
                    <option value="days">{tp("shelfLifeUnitDays")}</option>
                    <option value="months">{tp("shelfLifeUnitMonths")}</option>
                  </select>
                </div>
              </div>
            ) : (
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
            )}
          </div>
          </FormBlock>
  </>
  );
};

export default ProductWarehouseSection;
