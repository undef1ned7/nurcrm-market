import { useTranslation } from "react-i18next";
import { FormBlock, useOptionalProductFormLayout } from "../formLayout";

const PackagingSection = ({
  itemType,
  marketData,
  newItemData,
  handleMarketDataChange,
  handleChange,
  handleTogglePieceSale,
  handleAddPackaging,
  handleUpdatePackaging,
  handleRemovePackaging,
  fieldErrors = {},
  onAdultEnabled,
}: any) => {
  const layout = useOptionalProductFormLayout();
  const showUnit = !layout || layout.isVisible("unit");
  const { t } = useTranslation();
  const tp = (k: string, o?: any): string => t(`crm.warehouse.addProduct.${k}`, o) as string;
  return (
    <div className="market-product-form__section">
      <div className="market-product-form__unit-block">
        {showUnit ? (
          <>
            <label className="market-product-form__label">
              {tp("unitLabel")}
            </label>
            <p className="market-product-form__hint">
              {tp("unitHint", {
                unit: marketData.unit || tp("unitFallback"),
              })}
            </p>
          </>
        ) : null}
        <div className="market-product-form__unit-controls">
          <FormBlock id="unit" inline>
          <input
            type="text"
            className="market-product-form__input market-product-form__unit-input"
            value={marketData.unit}
            onChange={(e) => handleMarketDataChange("unit", e.target.value)}
          />
          </FormBlock>
          <div className="market-product-form__flags">
            {itemType === "product" && (
              <FormBlock id="pieceSale" inline>
              <label className="market-product-form__toggle">
                <input
                  type="checkbox"
                  checked={Boolean(marketData.enablePieceSale)}
                  onChange={(e) => handleTogglePieceSale(e.target.checked)}
                />
                <span>{tp("pieceSale")}</span>
              </label>
              </FormBlock>
            )}
            {itemType !== "kit" && (
              <FormBlock id="weight" inline>
              <label className="market-product-form__toggle">
                <input
                  type="checkbox"
                  checked={
                    itemType === "product"
                      ? marketData.isWeightProduct
                      : marketData.isFractionalService
                  }
                  onChange={(e) =>
                    handleMarketDataChange(
                      itemType === "product"
                        ? "isWeightProduct"
                        : "isFractionalService",
                      e.target.checked,
                    )
                  }
                />
                <span>
                  {itemType === "product"
                    ? tp("weightProduct")
                    : tp("fractionalService")}
                </span>
              </label>
              </FormBlock>
            )}
            {itemType === "product" && (
              <FormBlock id="adult" inline>
              <label
                className={`market-product-form__toggle${
                  marketData.isAdult
                    ? " market-product-form__toggle--adult"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(marketData.isAdult)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    handleMarketDataChange("isAdult", checked);
                    if (checked) onAdultEnabled?.();
                  }}
                />
                <span>{tp("adultFlag")}</span>
              </label>
              </FormBlock>
            )}
          </div>
          {(itemType !== "product" || marketData.enablePieceSale) && (
            <FormBlock id="packaging" inline>
            <button
              type="button"
              className="market-product-form__add-packaging-btn"
              onClick={handleAddPackaging}
            >
              {tp("addPackaging")}
            </button>
            </FormBlock>
          )}
        </div>
        {itemType === "product" && marketData.isAdult ? (
          <p className="market-product-form__adult-hint">
            {tp("adultHint")}
          </p>
        ) : null}
      </div>
      {(itemType !== "product" || marketData.enablePieceSale) &&
        ((marketData.packagings && marketData.packagings.length > 0) ||
          fieldErrors.packagings) && (
      <FormBlock id="packaging">
      {marketData.packagings && marketData.packagings.length > 0 && (
          <div className="market-product-form__packaging-list">
            {marketData.packagings.map((packaging) => (
              <div
                key={packaging.id}
                className="market-product-form__packaging-item"
              >
                <div className="market-product-form__packaging-item-row mt-[20px]">
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      {tp("packagingName")}
                    </label>
                    <input
                      type="text"
                      className="market-product-form__input"
                      placeholder={tp("packagingNamePlaceholder")}
                      value={packaging.name}
                      onChange={(e) =>
                        handleUpdatePackaging(
                          packaging.id,
                          "name",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      {tp("packagingQty")}
                    </label>
                    <div className="market-product-form__packaging-quantity">
                      <input
                        type="text"
                        className="market-product-form__input"
                        value={packaging.quantity}
                        onChange={(e) =>
                          handleUpdatePackaging(
                            packaging.id,
                            "quantity",
                            e.target.value,
                          )
                        }
                      />
                      <span className="market-product-form__unit-label">
                        {tp("pcsShort")}
                      </span>
                      <button
                        type="button"
                        className="market-product-form__remove-packaging-btn"
                        onClick={() => handleRemovePackaging(packaging.id)}
                        title={tp("removePackaging")}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      {tp("pricePerPiece")}
                    </label>
                    <div className="market-product-form__packaging-quantity">
                      <input
                        type="text"
                        className="market-product-form__input"
                        placeholder="0.000"
                        inputMode="decimal"
                        value={packaging.pieceUnitPrice || ""}
                        onChange={(e) =>
                          handleUpdatePackaging(
                            packaging.id,
                            "pieceUnitPrice",
                            e.target.value,
                          )
                        }
                      />
                      <span className="market-product-form__unit-label">
                        COM
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}
      {fieldErrors.packagings && (
          <p className="add-product-page__error">{fieldErrors.packagings}</p>
        )}
      </FormBlock>
      )}
      <div className="market-product-form__form-group mt-4">
        <label className="market-product-form__label">
          {tp("quantityLabel")}
        </label>
        <div className="market-product-form__price-input">
          <input
            type="text"
            name="quantity"
            className="market-product-form__input"
            value={newItemData.quantity}
            onChange={handleChange}
            placeholder="0"
            required
          />
          <span className="market-product-form__currency">
            {marketData.unit || "шт"}
          </span>
        </div>
      </div>

      {/* Список упаковок */}
    </div>
  );
};

export default PackagingSection;
