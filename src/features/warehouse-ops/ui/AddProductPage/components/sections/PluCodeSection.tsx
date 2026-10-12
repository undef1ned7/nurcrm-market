import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { FormBlock } from "../../formLayout";

const PluCodeSection = ({ itemType, marketData, handleMarketDataChange }) => {
  const [showPluTooltip, setShowPluTooltip] = useState(false);
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  if (
    !(
      (itemType === "product" && marketData.isWeightProduct) ||
      (itemType === "service" && marketData.isFractionalService)
    )
  ) {
    return null;
  }
  return (
        <FormBlock id="plu">
        <div className="market-product-form__section">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              {tp("pluAddLabel")}
            </label>
            <div className="market-product-form__plu-input-wrapper">
              <input
                type="text"
                className="market-product-form__input"
                placeholder={tp("pluPlaceholder")}
                value={marketData.plu}
                onChange={(e) => handleMarketDataChange("plu", e.target.value)}
              />
              <div className="market-product-form__help-wrapper">
                <button
                  type="button"
                  className="market-product-form__help-btn"
                  onMouseEnter={() => setShowPluTooltip(true)}
                  onMouseLeave={() => setShowPluTooltip(false)}
                >
                  <HelpCircle size={20} />
                </button>
                {showPluTooltip && (
                  <div className="market-product-form__tooltip">
                    <p>{tp("pluTooltip")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </FormBlock>
  );
};

export default PluCodeSection;
