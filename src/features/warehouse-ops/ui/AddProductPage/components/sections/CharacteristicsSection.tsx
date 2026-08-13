import { FormBlock } from "../../formLayout";

const CharacteristicsSection = ({ marketData, handleMarketDataChange }) => (
  <>
      <FormBlock id="characteristics">
      <div className="market-product-form__section">
        <h3 className="market-product-form__section-title">
          Характеристики товара
        </h3>
        <div className="market-product-form__characteristics-grid grid-cols-1 sm:grid-cols-2">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">Высота, см</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.height}
              onChange={(e) => handleMarketDataChange("height", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">Ширина, см</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.width}
              onChange={(e) => handleMarketDataChange("width", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">Глубина, см</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.depth}
              onChange={(e) => handleMarketDataChange("depth", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              Фактический вес, кг
            </label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.weight}
              onChange={(e) => handleMarketDataChange("weight", e.target.value)}
            />
          </div>
        </div>
      </div>
      </FormBlock>

      <FormBlock id="description">
      <div className="market-product-form__section">
        <h3 className="market-product-form__section-title">Описание</h3>
        <textarea
          className="market-product-form__textarea"
          placeholder="Введите описание товара"
          value={marketData.description}
          onChange={(e) =>
            handleMarketDataChange("description", e.target.value)
          }
        />
      </div>
      </FormBlock>
  </>
);

export default CharacteristicsSection;
