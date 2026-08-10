import SearchSelect from "@shared/ui/SearchSelect/SearchSelect";

const BrandCategorySection = ({
  newItemData,
  handleChange,
  categoryOptions,
  brandOptions,
  showCategoryInputs,
  setShowCategoryInputs,
  newCategory,
  setNewCategory,
  onSubmitCategory,
  isCategoryNameTaken,
  showBrandInputs,
  setShowBrandInputs,
  newBrand,
  setNewBrand,
  onSubmitBrand,
  isBrandNameTaken,
}) => (
      <div className="market-product-form__section">
        <div className="market-product-form__two-columns">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">Категория</label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.category_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "category_name", value: v },
                  })
                }
                options={categoryOptions}
                placeholder="Выберите категорию"
                emptyText="Категории не найдены"
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowCategoryInputs(!showCategoryInputs)}
                type="button"
              >
                + Создать категорию
              </button>
            </div>
            {showCategoryInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitCategory}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  type="text"
                  placeholder="Название категории"
                  name="name"
                  value={newCategory.name}
                  required
                />
                {isCategoryNameTaken && (
                  <p className="add-product-page__error">
                    Категория с таким названием уже существует
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowCategoryInputs(false);
                      setNewCategory({ name: "" });
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isCategoryNameTaken}
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="market-product-form__form-group">
            <label className="market-product-form__label">Бренд</label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.brand_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "brand_name", value: v },
                  })
                }
                options={brandOptions}
                placeholder="Выберите бренд"
                emptyText="Бренды не найдены"
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowBrandInputs(!showBrandInputs)}
                type="button"
              >
                + Создать бренд
              </button>
            </div>
            {showBrandInputs && (
              <form
                className="add-product-page__supplier-form"
                onSubmit={onSubmitBrand}
              >
                <input
                  className="add-product-page__input"
                  onChange={(e) =>
                    setNewBrand({ ...newBrand, name: e.target.value })
                  }
                  type="text"
                  placeholder="Название бренда"
                  name="name"
                  value={newBrand.name}
                  required
                />
                {isBrandNameTaken && (
                  <p className="add-product-page__error">
                    Бренд с таким названием уже существует
                  </p>
                )}
                <div className="add-product-page__form-actions">
                  <button
                    type="button"
                    className="add-product-page__cancel-btn"
                    onClick={() => {
                      setShowBrandInputs(false);
                      setNewBrand({ name: "" });
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isBrandNameTaken}
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
);

export default BrandCategorySection;
