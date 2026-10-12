import { useTranslation } from "react-i18next";
import { FormBlock } from "../../formLayout";

const CharacteristicsSection = ({ marketData, handleMarketDataChange }) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  return (
  <>
      <FormBlock id="characteristics">
      <div className="market-product-form__section">
        <h3 className="market-product-form__section-title">
          {tp("charTitle")}
        </h3>
        <div className="market-product-form__characteristics-grid grid-cols-1 sm:grid-cols-2">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">{tp("heightCm")}</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.height}
              onChange={(e) => handleMarketDataChange("height", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">{tp("widthCm")}</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.width}
              onChange={(e) => handleMarketDataChange("width", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">{tp("depthCm")}</label>
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.depth}
              onChange={(e) => handleMarketDataChange("depth", e.target.value)}
            />
          </div>
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              {tp("weightKg")}
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
        <h3 className="market-product-form__section-title">{tp("descTitle")}</h3>
        <textarea
          className="market-product-form__textarea"
          placeholder={tp("descPlaceholder")}
          value={marketData.description}
          onChange={(e) =>
            handleMarketDataChange("description", e.target.value)
          }
        />
      </div>
      </FormBlock>
  </>
  );
};

export default CharacteristicsSection;
