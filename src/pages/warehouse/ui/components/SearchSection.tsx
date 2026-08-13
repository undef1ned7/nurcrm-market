import React from "react";
import { Search, Filter, LayoutGrid, Table2 } from "lucide-react";
import { FilterBar } from "@shared/ui/page-shell";
import { MARKET_WAREHOUSE_SALE_UNITS } from "@shared/lib/tools/marketWarehouseFilters";
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
  searchPlaceholder = "Поиск по названию товара...",
  saleUnit = "",
  onSaleUnitChange,
}: any) => {
  return (
    <FilterBar className="warehouse-search-section">
      <div className="warehouse-search">
        <Search className="warehouse-search__icon" size={18} />
        <input
          type="text"
          className="nur-input warehouse-search__input"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="warehouse-search__info">
        <span className="nur-chip warehouse-search__count">
          Всего: {count ?? 0} • Найдено: {foundCount}
        </span>

        {scanLookupLoading && (
          <span
            className="warehouse-search__scan-loading nur-chip nur-chip--warning"
            role="status"
            aria-live="polite"
          >
            <span className="warehouse-search__scan-spinner" aria-hidden />
            Поиск товара по штрихкоду...
          </span>
        )}

        <div className="warehouse-search__actions">
          {onSaleUnitChange && (
            <div
              className="warehouse-view-toggle warehouse-sale-unit-toggle"
              role="radiogroup"
              aria-label="Единица продажи"
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
                Все
              </button>
              {MARKET_WAREHOUSE_SALE_UNITS.map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={saleUnit === value}
                  title={hint}
                  onClick={() =>
                    onSaleUnitChange(saleUnit === value ? "" : value)
                  }
                  className={`warehouse-view-toggle__btn${
                    saleUnit === value
                      ? " warehouse-view-toggle__btn--active"
                      : ""
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {showViewModeToggle && (
            <div
              className="warehouse-view-toggle"
              role="group"
              aria-label="Режим отображения"
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
                Таблица
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
                Карточки
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
              Фильтры
            </button>
          )}
        </div>
      </div>
    </FilterBar>
  );
};

export default React.memo(SearchSection);
