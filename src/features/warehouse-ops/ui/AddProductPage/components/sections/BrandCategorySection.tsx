import { useTranslation } from "react-i18next";
import SearchSelect from "@shared/ui/SearchSelect/SearchSelect";
import {
  FormBlock,
  useOptionalProductFormLayout,
} from "../../formLayout";

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
}) => {
  const { t } = useTranslation();
  const tp = (k: string): string => t(`crm.warehouse.addProduct.${k}`) as string;
  const layout = useOptionalProductFormLayout();
  const showCategory = !layout || layout.isVisible("category");
  const showBrand = !layout || layout.isVisible("brand");
  if (!showCategory && !showBrand) return null;

  return (
      <div className="market-product-form__section">
        <div className="market-product-form__two-columns">
          <FormBlock id="category">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              {tp("categoryLabel")}
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.category_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "category_name", value: v },
                  })
                }
                options={categoryOptions}
                placeholder={tp("categorySelectPlaceholder")}
                emptyText={tp("categoryEmpty")}
                valueLabel={newItemData.category_name}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowCategoryInputs(!showCategoryInputs)}
                type="button"
              >
                {tp("createCategory")}
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
                  placeholder={tp("categoryNamePlaceholder")}
                  name="name"
                  value={newCategory.name}
                  required
                />
                {isCategoryNameTaken && (
                  <p className="add-product-page__error">
                    {tp("categoryTaken")}
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
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isCategoryNameTaken}
                  >
                    {t("common.create")}
                  </button>
                </div>
              </form>
            )}
          </div>
          </FormBlock>

          <FormBlock id="brand">
          <div className="market-product-form__form-group">
            <label className="market-product-form__label">
              {tp("brandLabel")}
            </label>
            <div className="add-product-page__supplier-row">
              <SearchSelect
                value={newItemData.brand_name}
                onChange={(v) =>
                  handleChange({
                    target: { name: "brand_name", value: v },
                  })
                }
                options={brandOptions}
                placeholder={tp("brandSelectPlaceholder")}
                emptyText={tp("brandEmpty")}
                valueLabel={newItemData.brand_name}
              />
              <button
                className="add-product-page__create-supplier"
                onClick={() => setShowBrandInputs(!showBrandInputs)}
                type="button"
              >
                {tp("createBrand")}
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
                  placeholder={tp("brandNamePlaceholder")}
                  name="name"
                  value={newBrand.name}
                  required
                />
                {isBrandNameTaken && (
                  <p className="add-product-page__error">
                    {tp("brandTaken")}
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
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="add-product-page__save-btn"
                    disabled={isBrandNameTaken}
                  >
                    {t("common.create")}
                  </button>
                </div>
              </form>
            )}
          </div>
          </FormBlock>
        </div>
      </div>
  );
};

export default BrandCategorySection;
