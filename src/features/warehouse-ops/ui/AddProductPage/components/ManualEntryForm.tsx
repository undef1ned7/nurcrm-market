/**
 * Legacy / loading-branch manual entry form preserved from AddProductPage.
 */
import { useTranslation } from "react-i18next";
import { Package, ShoppingBag } from "lucide-react";
import SearchSelect from "@shared/ui/SearchSelect/SearchSelect";

const ManualEntryForm = ({
  productType,
  setProductType,
  newItemData,
  setNewItemData,
  handleChange,
  fieldErrors,
  company,
  brandOptions,
  categoryOptions,
  brandsLoading,
  categoriesLoading,
  hasMoreBrands,
  hasMoreCategories,
  setBrandQuery,
  setCategoryQuery,
  handleLoadMoreBrands,
  handleLoadMoreCategories,
  showBrandInputs,
  setShowBrandInputs,
  newBrand,
  setNewBrand,
  onSubmitBrand,
  isBrandNameTaken,
  showCategoryInputs,
  setShowCategoryInputs,
  newCategory,
  setNewCategory,
  onSubmitCategory,
  isCategoryNameTaken,
  marketData,
  filterClient,
  showInputs,
  setShowInputs,
  onSubmit,
  onChange,
  showDebtForm,
  setShowDebtForm,
  debt,
  setDebt,
  amount,
  setAmount,
  debtMonths,
  setDebtMonths,
  debtState,
  onChangeDebt,
  handleReturn,
  handleSubmit,
  creating,
}) => {
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  const unit = marketData.unit || tp("unitShort");
  return (
<>
  {/* Вкладка ручного ввода (для других секторов) */}
  <div className="add-product-page__form">
    {/* Выбор типа товара */}
    <div className="add-product-page__section">
      <label className="add-product-page__section-label">
        {tp("productTypeLabel")}
      </label>
      <div className="add-product-page__type-selector">
        <button
          className={`add-product-page__type-card ${
            productType === "piece"
              ? "add-product-page__type-card--active"
              : ""
          }`}
          onClick={() => {
            setProductType("piece");
            setNewItemData((prev) => ({
              ...prev,
              scale_type: "piece",
            }));
          }}
        >
          <Package size={32} />
          <span>{tp("typePiece")}</span>
        </button>
        <button
          className={`add-product-page__type-card ${
            productType === "weight"
              ? "add-product-page__type-card--active"
              : ""
          }`}
          onClick={() => {
            setProductType("weight");
            setNewItemData((prev) => ({
              ...prev,
              scale_type: "weight",
            }));
          }}
        >
          <ShoppingBag size={32} />
          <span>{tp("typeWeightKg")}</span>
        </button>
      </div>
    </div>

    {/* Основная информация */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">1</div>
        <h3 className="add-product-page__section-title">
          {tp("sectionBasic")}
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("manualNameLabel")}
        </label>
        <input
          type="text"
          name="name"
          placeholder={tp("manualNamePlaceholder")}
          className="add-product-page__input"
          value={newItemData.name}
          onChange={handleChange}
          required
        />
        {fieldErrors.name && (
          <p className="add-product-page__error">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("barcodeLabelRequired")}
        </label>
        <input
          type="text"
          name="barcode"
          className="add-product-page__input"
          value={newItemData.barcode}
          onChange={handleChange}
          required
        />
        {fieldErrors.barcode && (
          <p className="add-product-page__error">
            {fieldErrors.barcode}
          </p>
        )}
      </div>

      {company?.sector?.name !== "Барбершоп" && (
        <>
          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              {tp("pluForScalesLabel")}
            </label>
            <input
              type="text"
              name="plu"
              placeholder="0001"
              className="add-product-page__input"
              value={newItemData.plu}
              onChange={handleChange}
            />
            <span className="add-product-page__hint">
              {tp("pluForScalesHint")}
            </span>
          </div>

          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              {tp("brandLabelRequired")}
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.brand_name}
                valueLabel={newItemData.brand_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "brand_name", value: v },
                  })
                }
                options={brandOptions}
                placeholder={tp("brandSelectPlaceholder")}
                emptyText={tp("brandEmpty")}
                maxVisible={500}
                onQueryChange={setBrandQuery}
                loading={brandsLoading}
                hasMore={hasMoreBrands}
                onLoadMore={handleLoadMoreBrands}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowBrandInputs(!showBrandInputs)}
                type="button"
              >
                {tp("createBrand")}
              </button>
            </div>
            {showBrandInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitBrand}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewBrand({
                      ...newBrand,
                      name: e.target.value,
                    })
                  }
                  type="text"
                  placeholder={tp("brandNamePlaceholder")}
                  name="name"
                  value={newBrand.name}
                  required
                />
                {isBrandNameTaken && (
                  <p className="add-product-page__error">
                    {tp("brandTaken")}
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowBrandInputs(false);
                      setNewBrand({ name: "" });
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isBrandNameTaken}
                  >
                    {t("common.create")}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="add-product-page__form-group">
            <label className="add-product-page__label">
              {tp("categoryLabelRequired")}
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.category_name}
                valueLabel={newItemData.category_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "category_name", value: v },
                  })
                }
                options={categoryOptions}
                placeholder={tp("categorySelectPlaceholder")}
                emptyText={tp("categoryEmpty")}
                maxVisible={500}
                onQueryChange={setCategoryQuery}
                loading={categoriesLoading}
                hasMore={hasMoreCategories}
                onLoadMore={handleLoadMoreCategories}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() =>
                  setShowCategoryInputs(!showCategoryInputs)
                }
                type="button"
              >
                {tp("createCategory")}
              </button>
            </div>
            {showCategoryInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitCategory}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      name: e.target.value,
                    })
                  }
                  type="text"
                  placeholder={tp("categoryNamePlaceholder")}
                  name="name"
                  value={newCategory.name}
                  required
                />
                {isCategoryNameTaken && (
                  <p className="add-product-page__error">
                    {tp("categoryTaken")}
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowCategoryInputs(false);
                      setNewCategory({ name: "" });
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isCategoryNameTaken}
                  >
                    {t("common.create")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>

    {/* Информация о поставщике */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">2</div>
        <h3 className="add-product-page__section-title">
          {tp("supplierTitle")}
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("supplierLabelRequired")}
        </label>
        <div className="add-product-page__supplier-row">
          <select
            name="client"
            className="add-product-page__input"
            value={newItemData.client}
            onChange={handleChange}
            required
          >
            <option value="">{tp("supplierSelectLabel")}</option>
            {filterClient.map((client, idx) => (
              <option key={client.id ?? idx} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
          <button
            className="add-product-page__create-supplier"
            onClick={() => setShowInputs(!showInputs)}
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
              onChange={onChange}
              type="text"
              placeholder={tp("supplierFullName")}
              name="full_name"
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="llc"
              placeholder={tp("supplierLlc")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="inn"
              placeholder={tp("supplierInn")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="okpo"
              placeholder={tp("supplierOkpo")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="score"
              placeholder={tp("supplierScore")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="bik"
              placeholder={tp("supplierBik")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="address"
              placeholder={tp("supplierAddress")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="text"
              name="phone"
              placeholder={tp("supplierPhone")}
            />
            <input
              className="add-product-page__input"
              onChange={onChange}
              type="email"
              name="email"
              placeholder={tp("supplierEmail")}
            />
            <div className="add-product-page__form-actions">
              <button
                type="button"
                className="add-product-page__cancel-btn"
                onClick={() => setShowInputs(false)}
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

        <label className="add-product-page__checkbox-label">
          <input
            type="checkbox"
            checked={showDebtForm}
            onChange={(e) => setShowDebtForm(e.target.checked)}
          />
          {tp("addDebtForProduct")}
        </label>

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
                  <div className="add-product-page__form-group">
                    <label className="add-product-page__label">
                      {tp("supplierPhoneLabel")}
                    </label>
                    <input
                      type="text"
                      onChange={onChangeDebt}
                      name="phone"
                      value={debtState.phone}
                      className="add-product-page__input"
                    />
                  </div>
                  <div className="add-product-page__form-group">
                    <label className="add-product-page__label">
                      {tp("paymentDate")}
                    </label>
                    <input
                      type="date"
                      onChange={onChangeDebt}
                      name="dueDate"
                      value={debtState.dueDate}
                      className="add-product-page__input"
                    />
                  </div>
                </>
              )}
            <div className="add-product-page__form-group">
              <label className="add-product-page__label">
                {tp("paymentType")}
              </label>
              <select
                value={debt}
                onChange={(e) => setDebt(e.target.value)}
                className="add-product-page__input"
              >
                <option value="">{tp("paymentType")}</option>
                <option value="Предоплата">{tp("prepayment")}</option>
                <option value="Долги">{tp("debtOption")}</option>
              </select>
            </div>
            {debt === "Предоплата" && (
              <>
                <div className="add-product-page__form-group">
                  <label className="add-product-page__label">
                    {tp("prepaymentAmount")}
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="add-product-page__input"
                  />
                </div>
                <div className="add-product-page__form-group">
                  <label className="add-product-page__label">
                    Срок долга (мес.)
                  </label>
                  <input
                    type="text"
                    value={debtMonths}
                    onChange={(e) => setDebtMonths(e.target.value)}
                    className="add-product-page__input"
                  />
                </div>
              </>
            )}
            {debt === "Долги" && (
              <div className="add-product-page__form-group">
                <label className="add-product-page__label">
                  {tp("debtTermMonths")}
                </label>
                <input
                  type="text"
                  value={debtMonths}
                  onChange={(e) => setDebtMonths(e.target.value)}
                  className="add-product-page__input"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Цена и количество */}
    <div className="add-product-page__section">
      <div className="add-product-page__section-header">
        <div className="add-product-page__section-number">3</div>
        <h3 className="add-product-page__section-title">
          {tp("priceQtyTitle")}
        </h3>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("purchasePriceUnitRequired", { unit })}
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="purchase_price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.purchase_price}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">P</span>
        </div>
        {fieldErrors.purchase_price && (
          <p className="add-product-page__error">
            {fieldErrors.purchase_price}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("retailPriceUnitRequired", { unit })}
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.price}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">P</span>
        </div>
        {fieldErrors.price && (
          <p className="add-product-page__error">
            {fieldErrors.price}
          </p>
        )}
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("wholesalePriceUnitPlain", { unit })}
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="wholesale_price"
            placeholder="0.000"
            inputMode="decimal"
            className="add-product-page__input"
            value={newItemData.wholesale_price || ""}
            onChange={handleChange}
          />
          <span className="add-product-page__currency">P</span>
        </div>
      </div>

      <div className="add-product-page__form-group">
        <label className="add-product-page__label">
          {tp("quantityLabel")}
        </label>
        <div className="add-product-page__price-input">
          <input
            type="text"
            name="quantity"
            placeholder="0"
            className="add-product-page__input"
            value={newItemData.quantity}
            onChange={handleChange}
            required
          />
          <span className="add-product-page__currency">
            {marketData.unit || "шт"}
          </span>
        </div>
        {fieldErrors.quantity && (
          <p className="add-product-page__error">
            {fieldErrors.quantity}
          </p>
        )}
      </div>
    </div>

    {/* Кнопки действий */}
    <div className="add-product-page__actions">
      <button
        type="button"
        className="nur-btn nur-btn--secondary add-product-page__cancel-btn"
        onClick={handleReturn}
        disabled={creating}
      >
        {t("common.cancel")}
      </button>
      <button
        type="button"
        className="nur-btn nur-btn--primary add-product-page__submit-btn"
        onClick={handleSubmit}
        disabled={creating}
      >
        {creating ? tp("adding") : tp("addProductBtn")}
      </button>
    </div>
  </div>
</>
  );
};

export default ManualEntryForm;
