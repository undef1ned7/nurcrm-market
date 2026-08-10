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
}: any) => {
  return (
    <div className="market-product-form__section">
      <div className="market-product-form__unit-row justify-between !items-end">
        <div className="market-product-form__form-group w-full !mb-0">
          <label className="market-product-form__label">
            Единица измерения
          </label>
          <p className="market-product-form__hint mb-2">
            Цена закупки и цена продажи указываются за 1{" "}
            {marketData.unit || "единицу учета"}.
          </p>
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              className="market-product-form__input"
              value={marketData.unit}
              onChange={(e) => handleMarketDataChange("unit", e.target.value)}
            />
            {itemType === "product" && (
              <label className="market-product-form__toggle">
                <input
                  type="checkbox"
                  checked={Boolean(marketData.enablePieceSale)}
                  onChange={(e) => handleTogglePieceSale(e.target.checked)}
                />
                <span>Поштучная продажа</span>
              </label>
            )}
            {(itemType !== "product" || marketData.enablePieceSale) && (
              <button
                type="button"
                className="market-product-form__add-packaging-btn"
                onClick={handleAddPackaging}
              >
                Добавить упаковку
              </button>
            )}
          </div>
        </div>

        {/* Чекбокс показывается только для товара и услуги, не для комплекта */}
        {itemType !== "kit" && (
          <div className="market-product-form__toggle-group">
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
                {itemType === "product" ? "Весовой товар" : "Дробная услуга"}
              </span>
            </label>
          </div>
        )}
      </div>
      {(itemType !== "product" || marketData.enablePieceSale) &&
        marketData.packagings &&
        marketData.packagings.length > 0 && (
          <div className="market-product-form__packaging-list">
            {marketData.packagings.map((packaging) => (
              <div
                key={packaging.id}
                className="market-product-form__packaging-item"
              >
                <div className="market-product-form__packaging-item-row mt-[20px]">
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      Упаковка
                    </label>
                    <input
                      type="text"
                      className="market-product-form__input"
                      placeholder="Введите название упаковки"
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
                      Количество в упаковке
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
                        ШТ
                      </span>
                      <button
                        type="button"
                        className="market-product-form__remove-packaging-btn"
                        onClick={() => handleRemovePackaging(packaging.id)}
                        title="Удалить упаковку"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="market-product-form__form-group">
                    <label className="market-product-form__label">
                      Цена за штуку
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
      {(itemType !== "product" || marketData.enablePieceSale) &&
        fieldErrors.packagings && (
          <p className="add-product-page__error">{fieldErrors.packagings}</p>
        )}
      <div className="market-product-form__form-group mt-4">
        <label className="market-product-form__label">Количество *</label>
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
