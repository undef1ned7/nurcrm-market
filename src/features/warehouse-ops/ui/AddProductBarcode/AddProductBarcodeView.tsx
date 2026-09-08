import { useTranslation } from "react-i18next";
import { PromotionRulesEditor } from "../AddProductPage/components";

const AddProductBarcodeView = (vm) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  const {
    scanningProduct,
    scannedProduct,
    addingToWarehouse,
    barcodeScan,
    setBarcodeScan,
    quantity,
    setQuantity,
    state,
    setState,
    onChange,
    handlePriceChange,
    stockPromo,
    promotionRules,
    setPromotionRules,
    handleStockPromoBarcodeChange,
    debt,
    setDebt,
    amount,
    setAmount,
    debtMonths,
    setDebtMonths,
    clientId,
    setClientId,
    showDebtForm,
    setShowDebtForm,
    showSupplierForm,
    setShowSupplierForm,
    supplierFormState,
    setSupplierFormState,
    creatingSupplier,
    debtState,
    filterClient,
    company,
    warehouseCategories,
    warehouseCategory,
    onWarehouseCategoryChange,
    onChangeDebt,
    handleSupplierFormChange,
    onSubmitSupplier,
    handleAddToWarehouse,
    handleCancel,
    totalAmount,
    warehouseUuid,
    pickClient,
    initialSupplierFormState
  } = vm;

  return (
    <div className="add-product-barcode">
      {/* Индикатор загрузки сканирования */}
      {scanningProduct && (
        <div className="add-product-barcode__loading">{tp("scanSearching")}</div>
      )}

      {/* Информация о найденном товаре */}
      {scannedProduct && (
        <div className="add-product-barcode__product-card">
          <h3 className="add-product-barcode__product-title">
            {tp("scanFoundProduct")}
          </h3>

          <div className="add-product-barcode__form-group">
            <label>{tp("scanNameLabel")}</label>
            <input
              type="text"
              value={state.name}
              onChange={onChange}
              name="name"
              placeholder={tp("scanNamePlaceholder")}
            />
          </div>

          {warehouseUuid && warehouseCategories?.length > 0 && (
            <div className="add-product-barcode__form-group">
              <label>{tp("scanCategoryRequired")}</label>
              <select
                value={warehouseCategory ?? ""}
                onChange={(e) =>
                  onWarehouseCategoryChange?.(e.target.value || undefined)
                }
                className="add-product-barcode__select"
              >
                <option value="">{tp("scanChooseCategory")}</option>
                {warehouseCategories.map((cat, idx) => (
                  <option key={cat.id ?? idx} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="add-product-barcode__grid">
            {scannedProduct.brand && (
              <div className="add-product-barcode__info-row">
                <strong>{tp("scanBrand")}</strong>
                <span>{scannedProduct.brand.name}</span>
              </div>
            )}
            {scannedProduct.category && (
              <div className="add-product-barcode__info-row">
                <strong>{tp("scanCategory")}</strong>
                <span>{scannedProduct.category.name}</span>
              </div>
            )}
            <div className="add-product-barcode__info-row">
              <strong>{tp("scanBarcode")}</strong>
              <span>{scannedProduct.barcode}</span>
            </div>
            {scannedProduct.price && (
              <div className="add-product-barcode__info-row">
                <strong>{tp("scanPrice")}</strong>
                <span>{scannedProduct.price} сом</span>
              </div>
            )}
          </div>

          <div className="add-product-barcode__grid">
            <div className="add-product-barcode__form-group">
              <label>{tp("quantityLabel")}</label>
              <input
                type="number"
                min="1"
                value={state.quantity}
                onChange={onChange}
                name="quantity"
                placeholder="1"
              />
            </div>
            <div className="add-product-barcode__form-group">
              <label>{tp("scanPurchasePriceRequired")}</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="purchase_price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.purchase_price}
                  onChange={onChange}
                  required
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>{tp("markupLabel")}</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="markup"
                  placeholder="0"
                  className="add-product-page__input"
                  value={state.markup}
                  onChange={onChange}
                />
                <span className="add-product-page__currency">%</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>{tp("scanRetailPriceRequired")}</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.price}
                  onChange={handlePriceChange}
                  required
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>{tp("scanWholesalePrice")}</label>
              <div className="add-product-page__price-input">
                <input
                  type="text"
                  name="wholesale_price"
                  placeholder="0.00"
                  className="add-product-page__input"
                  value={state.wholesale_price || ""}
                  onChange={onChange}
                />
                <span className="add-product-page__currency">P</span>
              </div>
            </div>
            <div className="add-product-barcode__form-group">
              <label>{tp("scanPlu")}</label>
              <input
                type="number"
                min="0"
                max="2147483647"
                name="plu"
                value={state.plu}
                onChange={onChange}
                placeholder={tp("scanPluPlaceholder")}
              />
            </div>
          </div>

          <div className="add-product-barcode__form-group">
            <label>{tp("scanScaleType")}</label>
            <select
              name="scale_type"
              value={state.scale_type}
              onChange={onChange}
            >
              <option value="">{tp("scanScaleTypeChoose")}</option>
              <option value="piece">{tp("scanScalePiece")}</option>
              <option value="weight">{tp("scanScaleWeight")}</option>
            </select>
          </div>

          <div className="add-product-barcode__form-group">
            <label>{tp("altBarcodesLabel")}</label>
            <textarea
              className="add-product-page__input"
              rows={3}
              name="alternateBarcodesText"
              placeholder={tp("altBarcodesPlaceholder")}
              value={state.alternateBarcodesText ?? ""}
              onChange={onChange}
            />
            <p className="add-product-page__hint">
              {tp("altBarcodesHint")}
            </p>
          </div>

          <div className="add-product-barcode__form-group add-product-barcode__supplier-row">
            <label>{tp("scanSupplier")}</label>
            <div className="add-product-barcode__supplier-select-wrap">
              <select
                onChange={(e) => {
                  setClientId(e.target.value);
                }}
                value={clientId}
                className="add-product-barcode__select"
              >
                <option value="">{tp("supplierSelectLabel")}</option>
                {filterClient.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-product-barcode__create-supplier-btn"
                onClick={() => setShowSupplierForm(!showSupplierForm)}
              >
                {tp("createSupplier")}
              </button>
            </div>
          </div>
          {showSupplierForm && (
            <form
              className="add-product-barcode__supplier-form"
              onSubmit={onSubmitSupplier}
            >
              <input
                type="text"
                name="full_name"
                placeholder={tp("scanFullNameRequired")}
                value={supplierFormState.full_name}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="phone"
                placeholder={tp("supplierPhone")}
                value={supplierFormState.phone}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="email"
                name="email"
                placeholder={tp("supplierEmail")}
                value={supplierFormState.email}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="llc"
                placeholder={tp("supplierLlc")}
                value={supplierFormState.llc}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="inn"
                placeholder={tp("supplierInn")}
                value={supplierFormState.inn}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <input
                type="text"
                name="address"
                placeholder={tp("supplierAddress")}
                value={supplierFormState.address}
                onChange={handleSupplierFormChange}
                className="add-product-barcode__input"
              />
              <div className="add-product-barcode__supplier-form-actions">
                <button
                  type="button"
                  className="add-product-barcode__btn add-product-barcode__btn--secondary"
                  onClick={() => {
                    setShowSupplierForm(false);
                    setSupplierFormState(initialSupplierFormState);
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="add-product-barcode__btn add-product-barcode__btn--primary"
                  disabled={creatingSupplier}
                >
                  {creatingSupplier ? tp("creatingProduct") : t("common.create")}
                </button>
              </div>
            </form>
          )}

          <PromotionRulesEditor
            compact
            stock={stockPromo}
            onStockChange={handleStockPromoBarcodeChange}
            tiers={promotionRules}
            onTiersChange={setPromotionRules}
            errorText=""
          />

          {/* Переключатель долга */}
          <div className="add-product-barcode__debt-section">
            <label className="add-product-barcode__debt-checkbox">
              <input
                type="checkbox"
                checked={showDebtForm}
                onChange={(e) => setShowDebtForm(e.target.checked)}
              />
              <strong>{tp("addDebtForProduct")}</strong>
            </label>

            {/* Форма долга */}
            {showDebtForm && (
              <div className="add-product-barcode__debt-form">
                {clientId === "" && (
                  <>
                    <p className="add-product-barcode__error-message">
                      {tp("scanDebtNoSupplier")}
                    </p>
                  </>
                )}
                {company?.subscription_plan?.name === "Старт" && clientId && (
                  <div className="add-product-barcode__grid">
                    <div className="add-product-barcode__form-group">
                      <label>{tp("scanDebtPhone")}</label>
                      <input
                        type="text"
                        onChange={onChangeDebt}
                        name="phone"
                        value={debtState.phone}
                        placeholder={tp("scanDebtPhonePlaceholder")}
                      />
                    </div>
                    <div className="add-product-barcode__form-group">
                      <label>{tp("paymentDate")}</label>
                      <input
                        type="date"
                        onChange={onChangeDebt}
                        name="dueDate"
                        value={debtState.dueDate}
                      />
                    </div>
                  </div>
                )}
                <div className="add-product-barcode__form-group">
                  <label>{tp("paymentType")}</label>
                  <select
                    value={debt}
                    onChange={(e) => setDebt(e.target.value)}
                  >
                    <option value="">{tp("paymentType")}</option>
                    <option value="Предоплата">{tp("prepayment")}</option>
                    <option value="Долги">{tp("debtOption")}</option>
                  </select>
                </div>
                {debt === "Предоплата" && (
                  <div className="add-product-barcode__grid">
                    <div className="add-product-barcode__form-group">
                      <label>{tp("prepaymentAmount")}</label>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="add-product-barcode__form-group">
                      <label>{tp("debtTermMonths")}</label>
                      <input
                        type="text"
                        value={debtMonths}
                        onChange={(e) => setDebtMonths(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
                {debt === "Долги" && (
                  <div className="add-product-barcode__form-group">
                    <label>{tp("debtTermMonths")}</label>
                    <input
                      type="text"
                      value={debtMonths}
                      onChange={(e) => setDebtMonths(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
                {debt && clientId && (
                  <div className="add-product-barcode__debt-summary">
                    <strong>{tp("scanDebtSum")}</strong> {totalAmount.toFixed(2)}{" "}
                    сом
                    <br />
                    <strong>{tp("scanDebtSupplier")}</strong>{" "}
                    {pickClient?.full_name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="add-product-barcode__actions">
            <button
              className="add-product-barcode__btn add-product-barcode__btn--secondary"
              onClick={handleCancel}
            >
              {t("common.cancel")}
            </button>
            <button
              className="add-product-barcode__btn add-product-barcode__btn--primary"
              onClick={handleAddToWarehouse}
              disabled={addingToWarehouse}
            >
              {addingToWarehouse ? tp("adding") : tp("scanAddToWarehouse")}
            </button>
          </div>
        </div>
      )}

      {/* Инструкция */}
      {!scannedProduct && !scanningProduct && (
        <div className="add-product-barcode__instruction">
          {tp("scanInstruction")}
        </div>
      )}
    </div>
  );
};

export default AddProductBarcodeView;
