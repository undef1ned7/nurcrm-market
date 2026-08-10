import React from "react";
import { Search, Filter, LayoutGrid, Table2 } from "lucide-react";
import { FilterBar, StatusChip } from "@shared/ui/page-shell";
import { VIEW_MODES } from "../constants";
import "./CounterpartySearchSection.scss";

/**
 * Компонент секции поиска и фильтров
 */
const CounterpartySearchSection = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenFilters,
  count,
  foundCount,
}) => {
  return (
    <FilterBar className="warehouse-search-section">
      <div className="warehouse-search">
        <Search className="warehouse-search__icon" size={18} />
        <input
          type="text"
          className="nur-input warehouse-search__input"
          placeholder="Поиск по названию контрагента..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <StatusChip>
        Всего: {count ?? 0} · Найдено: {foundCount}
      </StatusChip>

      <div className="warehouse-search__view-toggle">
        <button
          type="button"
          onClick={() => onViewModeChange(VIEW_MODES.TABLE)}
          className={`nur-btn nur-btn--sm ${
            viewMode === VIEW_MODES.TABLE
              ? "nur-btn--primary"
              : "nur-btn--secondary"
          }`}
        >
          <Table2 size={16} />
          Таблица
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange(VIEW_MODES.CARDS)}
          className={`nur-btn nur-btn--sm ${
            viewMode === VIEW_MODES.CARDS
              ? "nur-btn--primary"
              : "nur-btn--secondary"
          }`}
        >
          <LayoutGrid size={16} />
          Карточки
        </button>

        {onOpenFilters && (
          <button
            type="button"
            className="nur-btn nur-btn--ghost nur-btn--sm"
            onClick={onOpenFilters}
          >
            <Filter size={16} />
            Фильтры
          </button>
        )}
      </div>
    </FilterBar>
  );
};

export default React.memo(CounterpartySearchSection);
