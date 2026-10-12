import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Filter, LayoutGrid, Table2 } from "lucide-react";
import { FilterBar } from "@shared/ui/page-shell";
import {
  MARKET_WAREHOUSE_SALE_UNITS,
  marketWarehouseSaleUnitLabelKey,
} from "@shared/lib/tools/marketWarehouseFilters";
import { VIEW_MODES } from "../constants";
import "./SearchSection.scss";

/**
 * Компонент секции поиска и фильтров
 */
const SearchSection = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenFilters,
  count,
  foundCount,
  scanLookupLoading = false,
  showViewModeToggle = true,
  searchPlaceholder,
  saleUnit = "",
  onSaleUnitChange,
}: any) => {
  const { t } = useTranslation();
  return (
    <FilterBar className="warehouse-search-section">
      <div className="warehouse-search">
        <Search className="warehouse-search__icon" size={18} />
        <input
          type="text"
          className="nur-input warehouse-search__input"
          placeholder={
            searchPlaceholder || t("crm.warehouse.searchPlaceholder")
          }
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="warehouse-search__info">
        <span className="nur-chip warehouse-search__count">
          {t("crm.warehouse.total")}: {count ?? 0} •{" "}
          {t("crm.warehouse.found")}: {foundCount}
        </span>

        {scanLookupLoading && (
          <span
            className="warehouse-search__scan-loading nur-chip nur-chip--warning"
            role="status"
            aria-live="polite"
          >
            <span className="warehouse-search__scan-spinner" aria-hidden />
            {t("crm.warehouse.searchByBarcode")}
          </span>
        )}

        <div className="warehouse-search__actions">
          {onSaleUnitChange && (
            <div
              className="warehouse-view-toggle warehouse-sale-unit-toggle"
              role="radiogroup"
              aria-label={t("crm.warehouse.saleUnitGroupAria")}
            >
              <button
                type="button"
                role="radio"
                aria-checked={!saleUnit}
                onClick={() => onSaleUnitChange("")}
                className={`warehouse-view-toggle__btn${
                  !saleUnit ? " warehouse-view-toggle__btn--active" : ""
                }`}
              >
                {t("crm.warehouse.saleUnitAll")}
              </button>
              {MARKET_WAREHOUSE_SALE_UNITS.map(({ value, hintKey }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={saleUnit === value}
                  title={hintKey ? (t(hintKey) as string) : undefined}
                  onClick={() =>
                    onSaleUnitChange(saleUnit === value ? "" : value)
                  }
                  className={`warehouse-view-toggle__btn${
                    saleUnit === value
                      ? " warehouse-view-toggle__btn--active"
                      : ""
                  }`}
                >
                  {t(marketWarehouseSaleUnitLabelKey(value))}
                </button>
              ))}
            </div>
          )}

          {showViewModeToggle && (
            <div
              className="warehouse-view-toggle"
              role="group"
              aria-label={t("crm.warehouse.viewModeGroupAria")}
            >
              <button
                type="button"
                aria-pressed={viewMode === VIEW_MODES.TABLE}
                onClick={() => onViewModeChange(VIEW_MODES.TABLE)}
                className={`warehouse-view-toggle__btn${
                  viewMode === VIEW_MODES.TABLE
                    ? " warehouse-view-toggle__btn--active"
                    : ""
                }`}
              >
                <Table2 size={16} aria-hidden />
                {t("crm.warehouse.table")}
              </button>
              <button
                type="button"
                aria-pressed={viewMode === VIEW_MODES.CARDS}
                onClick={() => onViewModeChange(VIEW_MODES.CARDS)}
                className={`warehouse-view-toggle__btn${
                  viewMode === VIEW_MODES.CARDS
                    ? " warehouse-view-toggle__btn--active"
                    : ""
                }`}
              >
                <LayoutGrid size={16} aria-hidden />
                {t("crm.warehouse.cards")}
              </button>
            </div>
          )}

          {onOpenFilters && (
            <button
              type="button"
              className="nur-btn nur-btn--sm nur-btn--secondary warehouse-search__filter-btn"
              onClick={onOpenFilters}
            >
              <Filter size={16} aria-hidden />
              {t("crm.warehouse.filters")}
            </button>
          )}
        </div>
      </div>
    </FilterBar>
  );
};

export default React.memo(SearchSection);
