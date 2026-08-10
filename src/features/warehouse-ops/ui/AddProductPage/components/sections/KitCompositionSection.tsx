import { HelpCircle } from "lucide-react";
import KitProductsPickerModal from "../KitProductsPickerModal";

const KitCompositionSection = ({
  marketData,
  handleMarketDataChange,
  handleUpdateKitProductQuantity,
  removeProductFromKit,
  openKitPicker,
  kitPickerOpen,
  setKitPickerOpen,
  kitPickerSearch,
  setKitPickerSearch,
  kitPickerCategory,
  setKitPickerCategory,
  categories,
  kitPickerList,
  kitPickerSelected,
  toggleKitPickerItem,
  toggleKitPickerSelectAll,
  isAllKitPickerSelected,
  applyKitPickerSelection,
  kitPickerLoading,
  kitPickerCandidates,
  newItemData,
  handleChange,
  recalculateKitPrice,
  showKitRecalculateTooltip,
  setShowKitRecalculateTooltip,
}) => (
  <>
          {/* Состав комплекта */}
          <div className="market-product-form__section">
            <h3 className="market-product-form__section-title">
              Состав комплекта
            </h3>

            {/* Список товаров в комплекте */}
            {marketData.kitProducts.length > 0 && (
              <div className="market-product-form__kit-products">
                {marketData.kitProducts.map((product) => (
                  <div
                    key={product.id}
                    className="market-product-form__kit-product-item"
                  >
                    <span>{product.name}</span>
                    <div className="market-product-form__kit-product-actions">
                      <input
                        type="text"
                        className="market-product-form__kit-quantity-input"
                        value={product.quantity || 1}
                        min="1"
                        onChange={(e) =>
                          handleUpdateKitProductQuantity(
                            product.id,
                            e.target.value,
                          )
                        }
                      />
                      <button
                        className="market-product-form__remove-kit-btn"
                        onClick={() => removeProductFromKit(product.id)}
                        title="Удалить из комплекта"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <button className="market-product-form__show-more-btn">
                  ПОКАЗАТЬ ЕЩЕ
                </button>
              </div>
            )}

            {/* Область для выбора товаров карточками */}
            <button
              type="button"
              className="market-product-form__kit-selection-area"
              onClick={() => void openKitPicker()}
            >
              <p>← Выберите товары</p>
              <span className="market-product-form__kit-selection-hint">
                Откроется список товаров в наличии с поиском и фильтром по
                категории
              </span>
            </button>
          </div>

          <KitProductsPickerModal
            open={kitPickerOpen}
            onClose={() => setKitPickerOpen(false)}
            searchValue={kitPickerSearch}
            onSearchChange={setKitPickerSearch}
            categoryId={kitPickerCategory}
            onCategoryChange={setKitPickerCategory}
            categories={categories}
            items={kitPickerList}
            selectedIds={kitPickerSelected}
            onToggle={toggleKitPickerItem}
            onToggleSelectAll={toggleKitPickerSelectAll}
            isAllFilteredSelected={isAllKitPickerSelected}
            onConfirm={applyKitPickerSelection}
            loading={kitPickerLoading}
            confirmLabel={
              kitPickerSelected.size > 0
                ? `Добавить (${kitPickerSelected.size})`
                : "Добавить выбранные"
            }
            emptyText={
              kitPickerCandidates.length === 0
                ? "Нет товаров в наличии для добавления в комплект"
                : "Товары не найдены. Измените поиск или категорию."
            }
          />

          {/* Цены для комплекта */}
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
                  <div className="market-product-form__recalculate-wrapper">
                    <button
                      className="market-product-form__recalculate-btn"
                      onClick={recalculateKitPrice}
                    >
                      Пересчитать стоимость
                    </button>
                    <div className="market-product-form__help-wrapper">
                      <button
                        type="button"
                        className="market-product-form__help-btn"
                        onMouseEnter={() => setShowKitRecalculateTooltip(true)}
                        onMouseLeave={() => setShowKitRecalculateTooltip(false)}
                      >
                        <HelpCircle size={20} />
                      </button>
                      {showKitRecalculateTooltip && (
                        <div className="market-product-form__tooltip market-product-form__tooltip--kit">
                          <p>
                            Цена продажи комплекта будет пересчитана и равна
                            сумме стоимостей товаров состава по текущим ценам
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
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
  </>
);

export default KitCompositionSection;
