import { FormBlock } from "../../formLayout";

const ServicePricingSection = ({ newItemData, marketData, handleChange, handleMarketDataChange }) => (
  <div className="market-product-form__section">
    <h3 className="market-product-form__section-title">Цены</h3>
    <div className="market-product-form__prices-grid">
      <div className="market-product-form__form-group">
        <label className="market-product-form__label">
          Цена продажи
        </label>
        <div className="market-product-form__price-input">
          <input
            type="text"
            name="price"
            className="market-product-form__input"
            value={newItemData.price}
            onChange={handleChange}
            placeholder="0.000"
            inputMode="decimal"
          />
          <span className="market-product-form__currency">COM</span>
        </div>
      </div>
      <FormBlock id="discount">
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
      </FormBlock>
    </div>
  </div>
);

export default ServicePricingSection;
