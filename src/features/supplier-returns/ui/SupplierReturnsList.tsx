import { RefreshCw, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SearchableCombobox from "@shared/ui/SearchableCombobox/SearchableCombobox";
import {
  EmptyState,
  FilterBar,
  StatusChip,
} from "@shared/ui/page-shell";
import {
  compensationLabel,
  formatDateTime,
  formatMoney,
  reasonLabel,
} from "../lib/formatReturn";
import { REASON_OPTIONS } from "../model/constants";
import { useSupplierReturnsList } from "../model/useSupplierReturnsList";
import { SupplierReturnDetailModal } from "./SupplierReturnDetailModal";
import "./SupplierReturns.scss";

export function SupplierReturnsList() {
  const { t } = useTranslation();
  const vm = useSupplierReturnsList();
  const {
    loading,
    source,
    rows,
    count,
    totalAmount,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    filtersDraft,
    setFiltersDraft,
    hasPendingChanges,
    hasAnyFilter,
    dateRangeInvalid,
    suppliersLoading,
    supplierOptions,
    detail,
    detailLoading,
    openDetail,
    closeDetail,
    loadRows,
    applyFilters,
    resetFilters,
    handlePageChange,
    goCreate,
  } = vm;

  return (
    <div className="supplier-returns">
      {source === "composed" ? (
        <div className="supplier-returns__banner" role="status">
          {t("crm.procurement.returnsListApiBanner")}
        </div>
      ) : null}

      <FilterBar className="supplier-returns__toolbar">
        <div className="supplier-returns__field">
          <label className="nur-label">{t("crm.procurement.colSupplier")}</label>
          <SearchableCombobox
            value={filtersDraft.supplier_id}
            onChange={(value: string) =>
              setFiltersDraft((prev) => ({ ...prev, supplier_id: String(value || "") }))
            }
            options={[
              { value: "", label: t("crm.procurement.allSuppliers") },
              ...supplierOptions,
            ]}
            placeholder={
              suppliersLoading
                ? t("crm.procurement.suppliersLoading")
                : t("crm.procurement.allSuppliers")
            }
            classNamePrefix="searchableCombo"
          />
        </div>
        <div className="supplier-returns__field supplier-returns__field--date">
          <label className="nur-label">{t("crm.procurement.dateFrom")}</label>
          <input
            className="nur-input"
            type="date"
            value={filtersDraft.date_from}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, date_from: event.target.value }))
            }
          />
        </div>
        <div className="supplier-returns__field supplier-returns__field--date">
          <label className="nur-label">{t("crm.procurement.dateTo")}</label>
          <input
            className="nur-input"
            type="date"
            value={filtersDraft.date_to}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, date_to: event.target.value }))
            }
          />
        </div>
        <div className="supplier-returns__field supplier-returns__field--reason">
          <label className="nur-label">{t("crm.procurement.reasonLabel")}</label>
          <select
            className="nur-input"
            value={filtersDraft.reason}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, reason: event.target.value }))
            }
          >
            <option value="">{t("common.all")}</option>
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="supplier-returns__field supplier-returns__field--search">
          <label className="nur-label">{t("crm.procurement.search")}</label>
          <input
            className="nur-input"
            value={filtersDraft.search}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, search: event.target.value }))
            }
            placeholder={t("crm.procurement.searchSupplierProduct")}
          />
        </div>
      </FilterBar>

      <div className="supplier-returns__actions">
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={applyFilters}
          disabled={loading || !hasPendingChanges || dateRangeInvalid}
        >
          {t("common.apply")}
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--ghost"
          onClick={resetFilters}
          disabled={loading || (!hasAnyFilter && !hasPendingChanges)}
        >
          {t("common.reset")}
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={loadRows}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {t("common.refresh")}
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={() => goCreate()}
        >
          <Undo2 size={16} />
          {t("crm.procurement.submitReturn")}
        </button>
      </div>

      {dateRangeInvalid ? (
        <div className="market-receipt-page__empty">
          {t("crm.procurement.dateRangeInvalid")}
        </div>
      ) : loading ? (
        <div className="market-receipt-page__empty">{t("common.loading")}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("crm.procurement.returnsEmpty")}
          text={t("crm.procurement.returnsEmptyHint")}
        />
      ) : (
        <div className="supplier-returns__table-wrap">
          <table className="supplier-returns__table supplier-returns__table--clickable">
            <thead>
              <tr>
                <th>{t("crm.procurement.colSupplier")}</th>
                <th>{t("crm.procurement.reasonLabel")}</th>
                <th>{t("crm.procurement.colCompensation")}</th>
                <th>{t("crm.procurement.colCreatedBy")}</th>
                <th>{t("crm.procurement.colDate")}</th>
                <th>{t("crm.procurement.colItems")}</th>
                <th>{t("crm.procurement.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void openDetail(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openDetail(row);
                    }
                  }}
                >
                  <td>{row.supplierName || "—"}</td>
                  <td>
                    <StatusChip>{reasonLabel(row.reason)}</StatusChip>
                  </td>
                  <td>{compensationLabel(row.compensation)}</td>
                  <td>{row.createdByName || "—"}</td>
                  <td>{formatDateTime(row.createdAt)}</td>
                  <td>{row.itemsCount}</td>
                  <td>{formatMoney(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !dateRangeInvalid && totalPages > 1 ? (
        <div className="supplier-returns__pager">
          <span>
            {count} {t("crm.procurement.returnsCount")}
            {totalAmount != null ? ` · ${formatMoney(totalAmount)}` : ""}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || !hasPrevPage}
          >
            {t("common.back")}
          </button>
          <span>
            {t("common.paginationPage", { current: page, total: totalPages })}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNextPage || page >= totalPages}
          >
            {t("catalog.forward")}
          </button>
        </div>
      ) : null}

      <SupplierReturnDetailModal
        detail={detail}
        loading={detailLoading}
        onClose={closeDetail}
      />
    </div>
  );
}
