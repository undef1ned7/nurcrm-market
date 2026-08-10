import React from "react";
import { Search, SlidersHorizontal, X, Table2, LayoutGrid } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { dayKeyOf, dayLabelOf } from "../hooks/kassaUtils";

const KassaFlowsSection = ({
  filterSearch, setFilterSearch, viewMode, setViewMode, isMobile,
  showFilter, setShowFilter, handleResetFilters, filteredCashflows,
  flowsLoading, flowsHasNext, flowsPage, setFlowsPage, flowsTotalCount,
  activeFlowType, setActiveFlowType,
}: any) => (
  <>
          <div className="kassa-search-section">
            <div className="kassa-search">
              <Search className="kassa-search__icon" size={18} />
              <input
                type="text"
                className="nur-input kassa-search__input"
                placeholder="Поиск потоков"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>
            <div className="kassa-search__meta">
              {
                !isMobile && (
                  <div className="kassa-search__view-toggle">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`kassa-view-btn ${viewMode === "table" ? "kassa-view-btn--active" : ""
                        }`}
                      title="Таблица"
                    >
                      <Table2 size={16} />
                      Таблица
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`kassa-view-btn ${viewMode === "cards" ? "kassa-view-btn--active" : ""
                        }`}
                      title="Карточки"
                    >
                      <LayoutGrid size={16} />
                      Карточки
                    </button>
                  </div>
                )
              }

              <button
                className="kassa-search__filter-btn"
                onClick={() => setShowFilter(true)}
              >
                <SlidersHorizontal size={18} />
                Фильтры
              </button>
            </div>
          </div>
          <DataContainer>

            <div className="kassa-table-container">
              {flowsLoading ? (
                <div className="kassa-table__loading" style={{ padding: 40 }}>
                  Загрузка…
                </div>
              ) : !filteredCashflows || filteredCashflows.length === 0 ? (
                <div className="kassa-table__empty" style={{ padding: 40 }}>
                  Нет движений денежных средств для этой кассы
                  {activeFlowType === "income"
                    ? " (Приходы)."
                    : activeFlowType === "expense"
                      ? " (Расходы)."
                      : "."}
                </div>
              ) : viewMode === "table" ? (
                <table className="nur-table kassa-table">
                  <thead>
                    <tr>
                      <th>Тип</th>
                      <th>Наименование</th>
                      <th>Сумма</th>
                      <th>Дата создания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCashflows.map((flow, idx) => {
                      const curDay = dayKeyOf(flow.created_at);
                      const prevDay =
                        idx > 0
                          ? dayKeyOf(filteredCashflows[idx - 1].created_at)
                          : null;
                      const showDaySep =
                        idx === 0 || (curDay && curDay !== prevDay);
                      return (
                        <React.Fragment key={flow.id}>
                          {showDaySep && (
                            <tr className="kassa-day-sep">
                              <td colSpan={4}>{dayLabelOf(flow.created_at)}</td>
                            </tr>
                          )}
                          <tr>
                            <td>
                              {flow.type === "income" ? "Приход" : "Расход"}
                            </td>
                            <td>{flow.name}</td>
                            <td>{flow.amount}</td>
                            <td>
                              {new Date(flow.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="kassa-cards-wrapper">
                  <div className="kassa-cards">
                    {filteredCashflows.map((flow, idx) => {
                      const curDay = dayKeyOf(flow.created_at);
                      const prevDay =
                        idx > 0
                          ? dayKeyOf(filteredCashflows[idx - 1].created_at)
                          : null;
                      const showDaySep =
                        idx === 0 || (curDay && curDay !== prevDay);
                      return (
                      <React.Fragment key={flow.id}>
                      {showDaySep && (
                        <div className="kassa-day-sep kassa-day-sep--cards">
                          {dayLabelOf(flow.created_at)}
                        </div>
                      )}
                      <div className="kassa-card">
                        <div className="kassa-card__header">
                          <span
                            className={`kassa-card__num ${flow.type === "income"
                              ? "kassa-card__num--income"
                              : "kassa-card__num--expense"
                              }`}
                          >
                            {flow.type === "income" ? "Приход" : "Расход"}
                          </span>
                          <h3 className="kassa-card__title">
                            {flow.name || "—"}
                          </h3>
                        </div>
                        <div className="kassa-card__fields">
                          <div className="kassa-card__field">
                            <span className="kassa-card__label">Сумма</span>
                            <span
                              className={`kassa-card__value ${flow.type === "income"
                                ? "kassa-card__value--income"
                                : "kassa-card__value--expense"
                                }`}
                            >
                              {flow.amount} с
                            </span>
                          </div>
                          <div className="kassa-card__field">
                            <span className="kassa-card__label">Дата</span>
                            <span className="kassa-card__value">
                              {flow.created_at
                                ? new Date(flow.created_at).toLocaleDateString(
                                  "ru-RU"
                                )
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                      </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {!flowsLoading &&
              (filteredCashflows.length > 0 || flowsPage > 1 || flowsHasNext) && (
                <div className="kassa-pagination" role="navigation" aria-label="Страницы движений">
                  <button
                    type="button"
                    className="kassa__btn kassa__btn--secondary"
                    disabled={flowsPage <= 1 || flowsLoading}
                    onClick={() => setFlowsPage((p) => Math.max(1, p - 1))}
                  >
                    Назад
                  </button>
                  <span className="kassa-pagination__info">
                    Страница {flowsPage}
                    {flowsTotalCount != null
                      ? ` · ${flowsTotalCount} записей`
                      : ""}
                  </span>
                  <button
                    type="button"
                    className="kassa__btn kassa__btn--secondary"
                    disabled={!flowsHasNext || flowsLoading}
                    onClick={() => setFlowsPage((p) => p + 1)}
                  >
                    Вперёд
                  </button>
                </div>
              )}
          </DataContainer>
      {showFilter && (
        <ReactPortal wrapperId="kassa-filter-modal">
          <div
            className="kassa-modal__overlay"
            role="presentation"
            onClick={() => setShowFilter(false)}
          >
            <div
              className="kassa-modal__card kassa-filter-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Фильтры потоков"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kassa-filter-modal__header">
                <h3 className="kassa-filter-modal__title">Фильтры потоков</h3>
                <button
                  type="button"
                  className="kassa-modal__close"
                  onClick={() => setShowFilter(false)}
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="kassa-filter-modal__body">
                <div className="kassa-filter-modal__field">
                  <label className="kassa-filter-modal__label">Поиск</label>
                  <div className="kassa-filter-modal__search">
                    <Search
                      className="kassa-filter-modal__search-icon"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Поиск потоков"
                      className="kassa-filter-modal__search-input"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="kassa-filter-modal__field">
                  <label className="kassa-filter-modal__label">Тип потока</label>
                  <select
                    className="kassa-filter-modal__select-native"
                    value={activeFlowType}
                    onChange={(e) => setActiveFlowType(e.target.value)}
                  >
                    <option value="all">Все</option>
                    <option value="income">Приход</option>
                    <option value="expense">Расход</option>
                  </select>
                </div>
              </div>
              <div className="kassa-filter-modal__footer">
                <button
                  type="button"
                  className="kassa-filter-modal__reset"
                  onClick={handleResetFilters}
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}
  </>
);

export default KassaFlowsSection;
