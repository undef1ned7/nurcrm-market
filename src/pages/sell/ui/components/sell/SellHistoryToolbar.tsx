import {
  Banknote,
  CheckSquare,
  Eye,
  Receipt,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "../../sell.formatters";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHistoryToolbar({ vm }: Props) {
  const { t } = useTranslation();
  const {
    filterField,
    shownField,
    loading,
    allOnPageSelected,
    toggleSelectAllOnPage,
    selectedIds,
    handleBulkDelete,
    bulkDeleting,
    clearSelection,
    count,
    listError,
    listTotalAmount,
    historyView,
    setHistoryView,
  } = vm;

  const selectLabel = allOnPageSelected
    ? t("crm.sell.deselectAllPage")
    : t("crm.sell.selectAllPage");

  return (
    <div className="sell__history-toolbar">
      <div className="sell__history-toolbarLeft">
        <button
          type="button"
          className={`sell__iconBtn sell__iconBtn--select${allOnPageSelected ? " sell__iconBtn--active" : ""}`}
          onClick={() => toggleSelectAllOnPage(shownField)}
          disabled={shownField.length === 0 || loading}
          title={selectLabel}
          aria-label={selectLabel}
          aria-pressed={allOnPageSelected}
        >
          {allOnPageSelected ? (
            <CheckSquare size={20} strokeWidth={2.2} />
          ) : (
            <Square size={20} strokeWidth={2.2} />
          )}
        </button>

        {selectedIds.size > 0 && (
          <div
            className="sell__history-selectionActions"
            role="group"
            aria-label={t("crm.sell.selectedActions")}
          >
            <button
              type="button"
              className="sell__iconBtn sell__iconBtn--danger"
              onClick={() => void handleBulkDelete()}
              disabled={bulkDeleting}
              title={t("crm.sell.deleteSelected", { count: selectedIds.size })}
              aria-label={t("crm.sell.deleteSelected", { count: selectedIds.size })}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="sell__iconBtn sell__iconBtn--muted"
              onClick={clearSelection}
              disabled={bulkDeleting}
              title={t("crm.sell.deselect")}
              aria-label={t("crm.sell.deselect")}
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>

      <div className="sell__history-toolbarRight">
        <div
          className={`sell__history-stats${loading ? " sell__history-stats--loading" : ""}`}
          aria-label={t("crm.sell.salesSummary")}
        >
          <div className="sell__history-stat">
            <span
              className="sell__history-stat-icon sell__history-stat-icon--sales"
              aria-hidden
            >
              <Receipt size={18} strokeWidth={2.2} />
            </span>
            <div className="sell__history-stat-body">
              <span className="sell__history-stat-label">
                {t("crm.sell.totalSales")}
              </span>
              <strong className="sell__history-stat-value">
                {listError ? "—" : count || 0}
              </strong>
            </div>
          </div>
          <div className="sell__history-stat">
            <span
              className="sell__history-stat-icon sell__history-stat-icon--amount"
              aria-hidden
            >
              <Banknote size={18} strokeWidth={2.2} />
            </span>
            <div className="sell__history-stat-body">
              <span className="sell__history-stat-label">
                {t("crm.sell.totalAmount")}
              </span>
              <strong className="sell__history-stat-value">
                {listTotalAmount != null
                  ? `${formatMoney(listTotalAmount)} ${t("common.currencySom")}`
                  : "—"}
              </strong>
            </div>
          </div>
          <div className="sell__history-stat sell__history-stat--page">
            <span
              className="sell__history-stat-icon sell__history-stat-icon--page"
              aria-hidden
            >
              <Eye size={18} strokeWidth={2.2} />
            </span>
            <div className="sell__history-stat-body">
              <span className="sell__history-stat-label">
                {t("crm.sell.onPage")}
              </span>
              <strong className="sell__history-stat-value">
                {filterField.length}
              </strong>
            </div>
          </div>
        </div>

        <div className="sell__viewToggle" role="group" aria-label={t("crm.sell.listView")}>
          <button
            type="button"
            className={`sell__viewBtn ${
              historyView === "table" ? "sell__viewBtn--active" : ""
            }`}
            onClick={() => setHistoryView("table")}
          >
            {t("common.table")}
          </button>
          <button
            type="button"
            className={`sell__viewBtn ${
              historyView === "cards" ? "sell__viewBtn--active" : ""
            }`}
            onClick={() => setHistoryView("cards")}
          >
            {t("common.cards")}
          </button>
        </div>
      </div>
    </div>
  );
}
