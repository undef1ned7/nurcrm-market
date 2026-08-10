import { useState } from "react";
import { HelpCircle } from "lucide-react";

const PluCodeSection = ({ itemType, marketData, handleMarketDataChange }) => {
  const [showPluTooltip, setShowPluTooltip] = useState(false);
  if (
    !(
      (itemType === "product" && marketData.isWeightProduct) ||
      (itemType === "service" && marketData.isFractionalService)
    )
  ) {
    return null;
  }
  return (
        <div className="market-product-form__section">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              Добавить PLU код
            </label>
            <div className="market-product-form__plu-input-wrapper">
              <input
                type="text"
                className="market-product-form__input"
                placeholder="Введите PLU код"
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
                    <p>
                      PLU код применяется в весах с печатью этикетки содержащей
                      информацию о весе товара. Формат штрих-кода для настройки
                      весов: undefined PPPPP WWWWW S где: PPPPP - PLU код
                      товара; WWWWW - вес товара в тысячных единицах; S -
                      контрольная сумма
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
  );
};

export default PluCodeSection;
