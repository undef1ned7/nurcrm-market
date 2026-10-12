import { useTranslation } from "react-i18next";
import { FormBlock } from "../formLayout";

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
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  const unit = marketData.unit || tp("unitShort");
  return (
    <div className="market-product-form__section">
      <h3 className="market-product-form__section-title">
        {tp("sectionPrices")}
      </h3>
      <div className="market-product-form__prices-grid">
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            {tp("purchasePriceUnit", { unit })}
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
        <FormBlock id="markup">
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            {tp("markupLabel")}
          </label>
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
        </FormBlock>
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            {tp("sellPriceUnit", { unit })}
          </label>
          <div className="market-product-form__price-input">
            <input
              type="text"
              name="price"
              className="market-product-form__input"
              value={newItemData.price}
              onChange={handlePriceChange}
              placeholder={tp("sellPricePlaceholderAuto")}
              inputMode="decimal"
            />
            <span className="market-product-form__currency">COM</span>
          </div>
          {fieldErrors.price && (
            <p className="add-product-page__error">{fieldErrors.price}</p>
          )}
        </div>
        <FormBlock id="wholesale">
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            {tp("wholesalePriceUnit", { unit })}
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
        </FormBlock>
        <FormBlock id="discount">
        <div className="market-product-form__form-group">
          <label className="market-product-form__label">
            {tp("discountLabel")}
          </label>
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
        </FormBlock>
      </div>
    </div>
  );
};

export default PricingSection;
