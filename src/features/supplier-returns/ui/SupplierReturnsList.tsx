import { RefreshCw, Undo2 } from "lucide-react";
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
          API возвратов ещё нет. Список хранится на этом устройстве, а списание
          остатка идёт через складской PATCH. После появления эндпоинта документы
          будут на сервере.
        </div>
      ) : null}

      <FilterBar className="supplier-returns__toolbar">
        <div className="supplier-returns__field">
          <label className="nur-label">Поставщик</label>
          <SearchableCombobox
            value={filtersDraft.supplier_id}
            onChange={(value: string) =>
              setFiltersDraft((prev) => ({ ...prev, supplier_id: String(value || "") }))
            }
            options={[{ value: "", label: "Все поставщики" }, ...supplierOptions]}
            placeholder={suppliersLoading ? "Загрузка..." : "Все поставщики"}
            classNamePrefix="searchableCombo"
          />
        </div>
        <div className="supplier-returns__field supplier-returns__field--date">
          <label className="nur-label">Дата от</label>
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
          <label className="nur-label">Дата до</label>
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
          <label className="nur-label">Причина</label>
          <select
            className="nur-input"
            value={filtersDraft.reason}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, reason: event.target.value }))
            }
          >
            <option value="">Все</option>
            {REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="supplier-returns__field supplier-returns__field--search">
          <label className="nur-label">Поиск</label>
          <input
            className="nur-input"
            value={filtersDraft.search}
            onChange={(event) =>
              setFiltersDraft((prev) => ({ ...prev, search: event.target.value }))
            }
            placeholder="Поставщик или товар"
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
          Применить
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--ghost"
          onClick={resetFilters}
          disabled={loading || (!hasAnyFilter && !hasPendingChanges)}
        >
          Сбросить
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--secondary"
          onClick={loadRows}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Обновить
        </button>
        <button
          type="button"
          className="nur-btn nur-btn--primary"
          onClick={() => goCreate()}
        >
          <Undo2 size={16} />
          Оформить возврат
        </button>
      </div>

      {dateRangeInvalid ? (
        <div className="market-receipt-page__empty">
          Проверьте диапазон дат: дата окончания раньше даты начала.
        </div>
      ) : loading ? (
        <div className="market-receipt-page__empty">Загрузка...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Возвратов пока нет"
          text="Оформите возврат брака, излишка или ошибочной поставки."
        />
      ) : (
        <div className="supplier-returns__table-wrap">
          <table className="supplier-returns__table supplier-returns__table--clickable">
            <thead>
              <tr>
                <th>Поставщик</th>
                <th>Причина</th>
                <th>Компенсация</th>
                <th>Создал</th>
                <th>Дата</th>
                <th>Позиций</th>
                <th>Сумма</th>
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
            {count} возвратов
            {totalAmount != null ? ` · ${formatMoney(totalAmount)}` : ""}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || !hasPrevPage}
          >
            Назад
          </button>
          <span>
            Страница {page} из {totalPages}
          </span>
          <button
            type="button"
            className="nur-btn nur-btn--secondary nur-btn--sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!hasNextPage || page >= totalPages}
          >
            Вперёд
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
