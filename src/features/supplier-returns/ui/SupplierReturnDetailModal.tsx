import { X } from "lucide-react";
import ReactPortal from "@shared/ui/Portal/ReactPortal";
import { StatusChip } from "@shared/ui/page-shell";
import {
  compensationLabel,
  formatDateTime,
  formatMoney,
  formatQty,
  reasonLabel,
} from "../lib/formatReturn";
import type { SupplierReturn } from "../model/types";

type Props = {
  detail: SupplierReturn | null;
  loading?: boolean;
  onClose: () => void;
};

export function SupplierReturnDetailModal({ detail, loading, onClose }: Props) {
  if (!detail) return null;
  const items = Array.isArray(detail.items) ? detail.items : [];

  return (
    <ReactPortal wrapperId="supplier-return-detail-modal">
      <div
        className="market-receipt-page__modal-overlay"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="market-receipt-page__modal-card market-receipt-page__modal-card--detail"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="supplier-return-detail-title"
        >
          <div className="supplier-returns__detail-head">
            <h3 id="supplier-return-detail-title" className="market-receipt-page__modal-title">
              Возврат поставщику
            </h3>
            <button
              type="button"
              className="market-receipt-page__detail-close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
          <div className="supplier-returns__detail-meta">
            <span>
              <strong>Поставщик:</strong> {detail.supplierName || "—"}
            </span>
            <span>
              <strong>Создал:</strong> {detail.createdByName || "—"}
            </span>
            <span>
              <strong>Дата:</strong> {formatDateTime(detail.createdAt)}
            </span>
            <StatusChip>{reasonLabel(detail.reason)}</StatusChip>
            <StatusChip tone="warning">{compensationLabel(detail.compensation)}</StatusChip>
          </div>
          {detail.comment ? (
            <p className="supplier-returns__hint">{detail.comment}</p>
          ) : null}
          {loading ? (
            <p className="market-receipt-page__detail-empty">Загрузка позиций…</p>
          ) : items.length === 0 ? (
            <p className="market-receipt-page__detail-empty">Нет позиций для отображения.</p>
          ) : (
            <div className="nur-table-wrap market-receipt-page__detail-table-wrap">
              <table className="nur-table market-receipt-page__detail-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Наименование</th>
                    <th>Кол-во</th>
                    <th>Цена закупки</th>
                    <th>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id || `${detail.id}-${item.productId}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.productName}</td>
                      <td>
                        {formatQty(item.qty)} {item.unit}
                      </td>
                      <td>{formatMoney(item.purchasePrice)}</td>
                      <td>{formatMoney(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="market-receipt-page__actions">
            <strong>Итого: {formatMoney(detail.totalAmount)}</strong>
            <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
}
