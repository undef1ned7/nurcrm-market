import {
  Banknote,
  CheckSquare,
  Eye,
  Receipt,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { formatMoney } from "../../sell.formatters";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellHistoryToolbar({ vm }: Props) {
  const {
    filterField,
    loading,
    allOnPageSelected,
    toggleSelectAllOnPage,
    selectedIds,
    handleBulkDelete,
    bulkDeleting,
    clearSelection,
    count,
    listTotalAmount,
    historyView,
    setHistoryView,
  } = vm;

  return (
    <div className="sell__history-toolbar">
      <div className="sell__history-toolbarLeft">
        <button
          type="button"
          className={`sell__iconBtn sell__iconBtn--select${allOnPageSelected ? " sell__iconBtn--active" : ""}`}
          onClick={() => toggleSelectAllOnPage(filterField)}
          disabled={filterField.length === 0 || loading}
          title={
            allOnPageSelected
              ? "Снять выбор со страницы"
              : "Выбрать все на странице"
          }
          aria-label={
            allOnPageSelected
              ? "Снять выбор со страницы"
              : "Выбрать все на странице"
          }
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
            aria-label="Действия с выбранными продажами"
          >
            <button
              type="button"
              className="sell__iconBtn sell__iconBtn--danger"
              onClick={() => void handleBulkDelete()}
              disabled={bulkDeleting}
              title={`Удалить выбранные (${selectedIds.size})`}
              aria-label={`Удалить выбранные (${selectedIds.size})`}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className="sell__iconBtn sell__iconBtn--muted"
              onClick={clearSelection}
              disabled={bulkDeleting}
              title="Снять выбор"
              aria-label="Снять выбор"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>

      <div className="sell__history-toolbarRight">
        <div
          className={`sell__history-stats${loading ? " sell__history-stats--loading" : ""}`}
          aria-label="Сводка по продажам"
        >
          <div className="sell__history-stat">
            <span
              className="sell__history-stat-icon sell__history-stat-icon--sales"
              aria-hidden
            >
              <Receipt size={18} strokeWidth={2.2} />
            </span>
            <div className="sell__history-stat-body">
              <span className="sell__history-stat-label">Всего продаж</span>
              <strong className="sell__history-stat-value">{count || 0}</strong>
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
              <span className="sell__history-stat-label">Общая сумма</span>
              <strong className="sell__history-stat-value">
                {listTotalAmount != null
                  ? `${formatMoney(listTotalAmount)} сом`
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
              <span className="sell__history-stat-label">На странице</span>
              <strong className="sell__history-stat-value">
                {filterField.length}
              </strong>
            </div>
          </div>
        </div>

        <div
          className="sell__viewToggle"
          role="group"
          aria-label="Вид списка"
        >
          <button
            type="button"
            className={`sell__viewBtn ${
              historyView === "table" ? "sell__viewBtn--active" : ""
            }`}
            onClick={() => setHistoryView("table")}
          >
            Таблица
          </button>
          <button
            type="button"
            className={`sell__viewBtn ${
              historyView === "cards" ? "sell__viewBtn--active" : ""
            }`}
            onClick={() => setHistoryView("cards")}
          >
            Карточки
          </button>
        </div>
      </div>
    </div>
  );
}
