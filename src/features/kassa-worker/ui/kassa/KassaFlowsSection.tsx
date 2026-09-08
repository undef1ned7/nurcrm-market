import React from "react";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal, X, Table2, LayoutGrid } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import DataContainer from "@shared/ui/DataContainer/DataContainer";
import { dayKeyOf, dayLabelOf } from "../hooks/kassaUtils";

const KassaFlowsSection = ({
  filterSearch, setFilterSearch, viewMode, setViewMode, isMobile,
  showFilter, setShowFilter, handleResetFilters, filteredCashflows,
  flowsLoading, flowsHasNext, flowsPage, setFlowsPage, flowsTotalCount,
  activeFlowType, setActiveFlowType,
  canRequestFlowChange = false, onRequestFlowChange,
}: any) => {
  const { t } = useTranslation();
  const tw = (k: string, o?: any): string =>
    t(`crm.kassa.worker.${k}`, o) as string;
  const dayLabels = { today: tw("today"), yesterday: tw("yesterday") };
  const dayLabel = (v: any) => dayLabelOf(v, dayLabels);
  const colCount = canRequestFlowChange ? 5 : 4;
  return (
  <>
          <div className="kassa-search-section">
            <div className="kassa-search">
              <Search className="kassa-search__icon" size={18} />
              <input
                type="text"
                className="nur-input kassa-search__input"
                placeholder={tw("searchFlows")}
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
                      title={tw("table")}
                    >
                      <Table2 size={16} />
                      {tw("table")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`kassa-view-btn ${viewMode === "cards" ? "kassa-view-btn--active" : ""
                        }`}
                      title={tw("cards")}
                    >
                      <LayoutGrid size={16} />
                      {tw("cards")}
                    </button>
                  </div>
                )
              }

              <button
                className="kassa-search__filter-btn"
                onClick={() => setShowFilter(true)}
              >
                <SlidersHorizontal size={18} />
                {tw("filters")}
              </button>
            </div>
          </div>
          <DataContainer>

            <div className="kassa-table-container">
              {flowsLoading ? (
                <div className="kassa-table__loading" style={{ padding: 40 }}>
                  {t("common.loading")}
                </div>
              ) : !filteredCashflows || filteredCashflows.length === 0 ? (
                <div className="kassa-table__empty" style={{ padding: 40 }}>
                  {tw("noFlows")}
                  {activeFlowType === "income"
                    ? tw("noFlowsIncomeSuffix")
                    : activeFlowType === "expense"
                      ? tw("noFlowsExpenseSuffix")
                      : "."}
                </div>
              ) : viewMode === "table" ? (
                <table className="nur-table kassa-table">
                  <thead>
                    <tr>
                      <th>{t("crm.kassa.type")}</th>
                      <th>{tw("nameLabel")}</th>
                      <th>{t("common.amount")}</th>
                      <th>{t("crm.kassa.createdAt")}</th>
                      {canRequestFlowChange && <th>{tw("actions")}</th>}
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
                              <td colSpan={colCount}>{dayLabel(flow.created_at)}</td>
                            </tr>
                          )}
                          <tr>
                            <td>
                              {flow.type === "income"
                                ? t("crm.kassa.income")
                                : t("crm.kassa.expense")}
                            </td>
                            <td>{flow.name}</td>
                            <td>{flow.amount}</td>
                            <td>
                              {new Date(flow.created_at).toLocaleDateString()}
                            </td>
                            {canRequestFlowChange && (
                              <td>
                                <div className="kassa-row-actions">
                                  <button
                                    type="button"
                                    className="nur-btn nur-btn--secondary nur-btn--sm"
                                    onClick={() =>
                                      onRequestFlowChange?.("edit", flow)
                                    }
                                  >
                                    {t("common.edit")}
                                  </button>
                                  <button
                                    type="button"
                                    className="nur-btn nur-btn--danger nur-btn--sm"
                                    onClick={() =>
                                      onRequestFlowChange?.("cancel", flow)
                                    }
                                  >
                                    {tw("cancelFlow")}
                                  </button>
                                </div>
                              </td>
                            )}
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
                          {dayLabel(flow.created_at)}
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
                            {flow.type === "income"
                              ? t("crm.kassa.income")
                              : t("crm.kassa.expense")}
                          </span>
                          <h3 className="kassa-card__title">
                            {flow.name || "—"}
                          </h3>
                        </div>
                        <div className="kassa-card__fields">
                          <div className="kassa-card__field">
                            <span className="kassa-card__label">
                              {t("common.amount")}
                            </span>
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
                            <span className="kassa-card__label">
                              {tw("dateLabel")}
                            </span>
                            <span className="kassa-card__value">
                              {flow.created_at
                                ? new Date(flow.created_at).toLocaleDateString(
                                  "ru-RU"
                                )
                                : "—"}
                            </span>
                          </div>
                        </div>
                        {canRequestFlowChange && (
                          <div className="kassa-card__actions kassa-row-actions">
                            <button
                              type="button"
                              className="nur-btn nur-btn--secondary nur-btn--sm"
                              onClick={() => onRequestFlowChange?.("edit", flow)}
                            >
                              {t("common.edit")}
                            </button>
                            <button
                              type="button"
                              className="nur-btn nur-btn--danger nur-btn--sm"
                              onClick={() => onRequestFlowChange?.("cancel", flow)}
                            >
                              {tw("cancelFlow")}
                            </button>
                          </div>
                        )}
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
                <div className="kassa-pagination" role="navigation" aria-label={tw("paginationAria")}>
                  <button
                    type="button"
                    className="kassa__btn kassa__btn--secondary"
                    disabled={flowsPage <= 1 || flowsLoading}
                    onClick={() => setFlowsPage((p) => Math.max(1, p - 1))}
                  >
                    {t("common.back")}
                  </button>
                  <span className="kassa-pagination__info">
                    {tw("pageN", { page: flowsPage })}
                    {flowsTotalCount != null
                      ? tw("recordsSuffix", { count: flowsTotalCount })
                      : ""}
                  </span>
                  <button
                    type="button"
                    className="kassa__btn kassa__btn--secondary"
                    disabled={!flowsHasNext || flowsLoading}
                    onClick={() => setFlowsPage((p) => p + 1)}
                  >
                    {t("common.forward")}
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
              aria-label={tw("filtersTitle")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="kassa-filter-modal__header">
                <h3 className="kassa-filter-modal__title">{tw("filtersTitle")}</h3>
                <button
                  type="button"
                  className="kassa-modal__close"
                  onClick={() => setShowFilter(false)}
                  aria-label={t("common.close")}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="kassa-filter-modal__body">
                <div className="kassa-filter-modal__field">
                  <label className="kassa-filter-modal__label">
                    {tw("searchLabel")}
                  </label>
                  <div className="kassa-filter-modal__search">
                    <Search
                      className="kassa-filter-modal__search-icon"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder={tw("searchFlows")}
                      className="kassa-filter-modal__search-input"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="kassa-filter-modal__field">
                  <label className="kassa-filter-modal__label">
                    {tw("flowType")}
                  </label>
                  <select
                    className="kassa-filter-modal__select-native"
                    value={activeFlowType}
                    onChange={(e) => setActiveFlowType(e.target.value)}
                  >
                    <option value="all">{t("crm.kassa.all")}</option>
                    <option value="income">{t("crm.kassa.income")}</option>
                    <option value="expense">{t("crm.kassa.expense")}</option>
                  </select>
                </div>
              </div>
              <div className="kassa-filter-modal__footer">
                <button
                  type="button"
                  className="kassa-filter-modal__reset"
                  onClick={handleResetFilters}
                >
                  {tw("resetFilters")}
                </button>
              </div>
            </div>
          </div>
        </ReactPortal>
      )}
  </>
  );
};

export default KassaFlowsSection;
