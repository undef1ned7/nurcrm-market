
const PricingSection = ({
  marketData,
  newItemData,
  fieldErrors = {},
  handleChange,
  handleMarketDataChange,
  handlePurchasePriceChange,
  handleMarkupFieldChange,
  handlePriceChange,
}: any) => {
  return (
    <div className="market-product-form__section">
      <h3 className="market-product-form__section-title">Цены</h3>
      <div className="market-product-form__prices-grid">
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            Цена закупки (за 1 {marketData.unit || "ед."})
          </label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              name="purchase_price"
              className="market-product-form__input"
              value={newItemData.purchase_price}
              onChange={handlePurchasePriceChange}
              placeholder="0.000"
              inputMode="decimal"
            />
            <span className="market-product-form__currency">COM</span>
          </div>
          {fieldErrors.purchase_price && (
            <p className="add-product-page__error">
              {fieldErrors.purchase_price}
            </p>
          )}
        </div>
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">Наценка</label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.markup}
              onChange={handleMarkupFieldChange}
            />
            <span className="market-product-form__currency">%</span>
          </div>
        </div>
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            Цена продажи (за 1 {marketData.unit || "ед."})
          </label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              name="price"
              className="market-product-form__input"
              value={newItemData.price}
              onChange={handlePriceChange}
              placeholder="0.000 или рассчитывается автоматически"
              inputMode="decimal"
            />
            <span className="market-product-form__currency">COM</span>
          </div>
          {fieldErrors.price && (
            <p className="add-product-page__error">{fieldErrors.price}</p>
          )}
        </div>
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            Оптовая цена (за 1 {marketData.unit || "ед."})
          </label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              name="wholesale_price"
              className="market-product-form__input"
              value={newItemData.wholesale_price || ""}
              onChange={handleChange}
              placeholder="0.000"
              inputMode="decimal"
            />
            <span className="market-product-form__currency">COM</span>
          </div>
        </div>
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">Скидка</label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.discount}
              onChange={(e) =>
                handleMarketDataChange("discount", e.target.value)
              }
            />
            <span className="market-product-form__currency">%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
