import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import {
  MARKET_WAREHOUSE_PRESETS,
  MARKET_WAREHOUSE_SALE_UNITS,
  marketWarehouseSaleUnitLabelKey,
  buildMarketWarehouseListParams,
  modalStateFromAppliedFilters,
} from "@shared/lib/tools/marketWarehouseFilters";
import "../Warehouse.scss";

const FilterModal = ({
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
  brands = [],
  categories = [],
  suppliers = [],
  suppliersLoading = false,
}: any) => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState(() =>
    modalStateFromAppliedFilters(currentFilters),
  );
  const [applyError, setApplyError] = useState<any>("");

  const supplierOptions = useMemo(
    () =>
      (Array.isArray(suppliers) ? suppliers : [])
        .map((supplier: any) => ({
          value: String(supplier.id || ""),
          label:
            String(
              supplier.full_name ||
                supplier.name ||
                supplier.company_name ||
                supplier.phone ||
                supplier.email ||
                t("crm.warehouse.noTitle"),
            ).trim() || t("crm.warehouse.noTitle"),
        }))
        .filter((option: any) => option.value && option.label),
    [suppliers],
  );

  const handleItemTypeChange = (type: any) => {
    setFilters((prev: any) => ({
      ...prev,
      itemTypes: {
        ...prev.itemTypes,
        [type]: !prev.itemTypes[type],
      },
    }));
  };

  const handleInputChange = (section: any, field: any, value: any) => {
    setFilters((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleApply = () => {
    const { params, error } = buildMarketWarehouseListParams(filters);
    if (error) {
      setApplyError(error);
      return;
    }
    setApplyError("");
    onApplyFilters(params);
    onClose();
  };

  const handleReset = () => {
    setFilters(modalStateFromAppliedFilters({}));
    setApplyError("");
    onResetFilters();
    onClose();
  };

  return (
    <div className="warehouse-filter-overlay" onClick={onClose}>
      <div
        className="warehouse-filter-modal"
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="warehouse-filter-modal__header">
          <h3 className="warehouse-filter-modal__title">
            {t("crm.warehouse.filters")}
          </h3>
          <button className="warehouse-filter-modal__close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="warehouse-filter-modal__subtitle">
          {t("crm.warehouse.filter.subtitle")}
        </p>

        <div className="warehouse-filter-modal__content">
          {/* Пресеты фильтров */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.presets")}
            </label>
            <select
              className="warehouse-filter-modal__select"
              value={filters.preset}
              onChange={(e: any) =>
                setFilters((prev: any) => ({ ...prev, preset: e.target.value }))
              }
            >
              <option value="">{t("crm.warehouse.filter.choose")}</option>
              {MARKET_WAREHOUSE_PRESETS.map(({ value, label, labelKey }) => (
                <option key={value} value={value}>
                  {labelKey ? t(labelKey) : label}
                </option>
              ))}
            </select>
          </div>

          {applyError ? (
            <p className="warehouse-filter-modal__error" role="alert">
              {applyError}
            </p>
          ) : null}

          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.saleUnit")}
            </label>
            <div
              className="warehouse-view-toggle warehouse-sale-unit-toggle"
              role="radiogroup"
              aria-label={t("crm.warehouse.filter.saleUnit")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={!filters.saleUnit}
                className={`warehouse-view-toggle__btn${
                  !filters.saleUnit ? " warehouse-view-toggle__btn--active" : ""
                }`}
                onClick={() =>
                  setFilters((prev: any) => ({ ...prev, saleUnit: "" }))
                }
              >
                {t("crm.warehouse.saleUnitAll")}
              </button>
              {MARKET_WAREHOUSE_SALE_UNITS.map(({ value, hintKey }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={filters.saleUnit === value}
                  title={hintKey ? (t(hintKey) as string) : undefined}
                  className={`warehouse-view-toggle__btn${
                    filters.saleUnit === value
                      ? " warehouse-view-toggle__btn--active"
                      : ""
                  }`}
                  onClick={() =>
                    setFilters((prev: any) => ({ ...prev, saleUnit: value }))
                  }
                >
                  {t(marketWarehouseSaleUnitLabelKey(value))}
                </button>
              ))}
            </div>
            <p className="warehouse-filter-modal__hint">
              {t("crm.warehouse.filter.pieceSaleNote")}
            </p>
          </div>

          {/* Типы товаров */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.productType")}
            </label>
            <div className="warehouse-filter-modal__checkboxes">
              <label className="warehouse-filter-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.itemTypes.product}
                  onChange={() => handleItemTypeChange("product")}
                />
                <span>{t("crm.warehouse.filter.typeProduct")}</span>
              </label>
              <label className="warehouse-filter-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.itemTypes.service}
                  onChange={() => handleItemTypeChange("service")}
                />
                <span>{t("crm.warehouse.filter.typeService")}</span>
              </label>
              <label className="warehouse-filter-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.itemTypes.kit}
                  onChange={() => handleItemTypeChange("kit")}
                />
                <span>{t("crm.warehouse.filter.typeKit")}</span>
              </label>
            </div>
          </div>

          {/* Категории */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.categories")}
            </label>
            <select
              className="warehouse-filter-modal__select"
              value={filters.category}
              onChange={(e: any) =>
                setFilters((prev: any) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">
                {t("crm.warehouse.filter.chooseCategory")}
              </option>
              {categories.map((category: any) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Бренд */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.brand")}
            </label>
            <select
              className="warehouse-filter-modal__select"
              value={filters.brand}
              onChange={(e: any) =>
                setFilters((prev: any) => ({ ...prev, brand: e.target.value }))
              }
            >
              <option value="">{t("crm.warehouse.filter.chooseBrand")}</option>
              {brands.map((brand: any) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.supplier")}
            </label>
            <SearchableCombobox
              value={String(filters.supplier || "")}
              onChange={(value: any) =>
                setFilters((prev: any) => ({ ...prev, supplier: String(value || "") }))
              }
              options={supplierOptions}
              placeholder={
                suppliersLoading
                  ? t("crm.warehouse.filter.loadingSuppliers")
                  : t("crm.warehouse.filter.chooseSupplier")
              }
              classNamePrefix="searchableCombo"
            />
          </div>

          {/* Цена */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.price")}
            </label>
            <div className="warehouse-filter-modal__row">
              <select
                className="warehouse-filter-modal__select-small"
                value={filters.price.type}
                onChange={(e: any) =>
                  handleInputChange("price", "type", e.target.value)
                }
              >
                <option value="базовая">
                  {t("crm.warehouse.filter.priceBase")}
                </option>
                <option value="цена закупки">
                  {t("crm.warehouse.filter.pricePurchase")}
                </option>
                <option value="себестоимость">
                  {t("crm.warehouse.filter.priceCost")}
                </option>
                <option value="скидка">
                  {t("crm.warehouse.filter.priceDiscount")}
                </option>
              </select>
              <select
                className="warehouse-filter-modal__select-small"
                value={filters.price.condition}
                onChange={(e: any) =>
                  handleInputChange("price", "condition", e.target.value)
                }
              >
                <option value="больше">{t("crm.warehouse.filter.opGt")}</option>
                <option value="меньше">{t("crm.warehouse.filter.opLt")}</option>
                <option value="равно">{t("crm.warehouse.filter.opEq")}</option>
              </select>
              <input
                type="number"
                className="warehouse-filter-modal__input-small"
                value={filters.price.value}
                onChange={(e: any) =>
                  handleInputChange("price", "value", e.target.value)
                }
              />
              <button className="warehouse-filter-modal__add-btn">+</button>
            </div>
          </div>

          {/* Остатки */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.stock")}
            </label>
            <div className="warehouse-filter-modal__row">
              <select
                className="warehouse-filter-modal__select-small"
                value={filters.stock.condition}
                onChange={(e: any) =>
                  handleInputChange("stock", "condition", e.target.value)
                }
              >
                <option value="больше">{t("crm.warehouse.filter.opGt")}</option>
                <option value="меньше">{t("crm.warehouse.filter.opLt")}</option>
                <option value="равно">{t("crm.warehouse.filter.opEq")}</option>
              </select>
              <input
                type="number"
                className="warehouse-filter-modal__input-small"
                value={filters.stock.value}
                onChange={(e: any) =>
                  handleInputChange("stock", "value", e.target.value)
                }
              />
              <span className="warehouse-filter-modal__unit">
                {t("crm.warehouse.filter.unitPcs")}
              </span>
            </div>
            <p className="warehouse-filter-modal__hint">
              {t("crm.warehouse.filter.stockNote")}
            </p>
          </div>

          {/* Срок годности */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.shelfLife")}
            </label>
            <div className="warehouse-filter-modal__row">
              <select
                className="warehouse-filter-modal__select-medium"
                value={filters.shelfLife.condition}
                onChange={(e: any) =>
                  handleInputChange("shelfLife", "condition", e.target.value)
                }
              >
                <option value="истекает в течение">
                  {t("crm.warehouse.filter.shelfExpiresWithin")}
                </option>
                <option value="истек">
                  {t("crm.warehouse.filter.shelfExpired")}
                </option>
              </select>
              <input
                type="number"
                className="warehouse-filter-modal__input-small"
                value={filters.shelfLife.value}
                onChange={(e: any) =>
                  handleInputChange("shelfLife", "value", e.target.value)
                }
              />
              <span className="warehouse-filter-modal__unit">
                {t("crm.warehouse.filter.unitDays")}
              </span>
            </div>
          </div>

          {/* Изменения товара */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.productChanges")}
            </label>
            <div className="warehouse-filter-modal__row">
              <select
                className="warehouse-filter-modal__select-medium"
                value={filters.productChanges.condition}
                onChange={(e: any) =>
                  handleInputChange(
                    "productChanges",
                    "condition",
                    e.target.value
                  )
                }
              >
                <option value="меньше">
                  {t("crm.warehouse.filter.changedLessThan")}
                </option>
                <option value="больше">
                  {t("crm.warehouse.filter.changedMoreThan")}
                </option>
              </select>
              <input
                type="number"
                className="warehouse-filter-modal__input-small"
                value={filters.productChanges.value}
                onChange={(e: any) =>
                  handleInputChange("productChanges", "value", e.target.value)
                }
              />
              <span className="warehouse-filter-modal__unit">
                {t("crm.warehouse.filter.unitDaysAgo")}
              </span>
            </div>
          </div>

          {/* Продаваемость */}
          <div className="warehouse-filter-modal__section">
            <label className="warehouse-filter-modal__label">
              {t("crm.warehouse.filter.sellability")}
            </label>
            <div className="warehouse-filter-modal__row">
              <select
                className="warehouse-filter-modal__select-medium"
                value={filters.sellability.condition}
                onChange={(e: any) =>
                  handleInputChange("sellability", "condition", e.target.value)
                }
              >
                <option value="продавался в течение">
                  {t("crm.warehouse.filter.soldWithin")}
                </option>
                <option value="не продавался в течение">
                  {t("crm.warehouse.filter.notSoldWithin")}
                </option>
              </select>
              <input
                type="number"
                className="warehouse-filter-modal__input-small"
                value={filters.sellability.value}
                onChange={(e: any) =>
                  handleInputChange("sellability", "value", e.target.value)
                }
              />
              <span className="warehouse-filter-modal__unit">
                {t("crm.warehouse.filter.unitDays")}
              </span>
            </div>
          </div>
        </div>

        <div className="warehouse-filter-modal__footer">
          <button
            type="button"
            className="warehouse-filter-modal__reset-btn"
            onClick={handleReset}
          >
            {t("crm.warehouse.filter.reset")}
          </button>
          <button
            type="button"
            className="warehouse-filter-modal__cancel-btn"
            onClick={onClose}
          >
            {t("crm.warehouse.filter.cancel")}
          </button>
          <button
            type="button"
            className="warehouse-filter-modal__apply-btn"
            onClick={handleApply}
          >
            {t("crm.warehouse.filter.apply")}
          </button>
          <button
            type="button"
            className="warehouse-filter-modal__save-preset-btn"
            onClick={() => {}}
          >
            {t("crm.warehouse.filter.savePreset")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;