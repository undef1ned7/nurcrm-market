import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
              {t("crm.procurement.supplierReturn")}
            </h3>
            <button
              type="button"
              className="market-receipt-page__detail-close"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X size={20} />
            </button>
          </div>
          <div className="supplier-returns__detail-meta">
            <span>
              <strong>{t("crm.procurement.detailSupplier")}</strong> {detail.supplierName || "—"}
            </span>
            <span>
              <strong>{t("crm.procurement.detailCreatedBy")}</strong> {detail.createdByName || "—"}
            </span>
            <span>
              <strong>{t("crm.procurement.detailDate")}</strong> {formatDateTime(detail.createdAt)}
            </span>
            <StatusChip>{reasonLabel(detail.reason)}</StatusChip>
            <StatusChip tone="warning">{compensationLabel(detail.compensation)}</StatusChip>
          </div>
          {detail.comment ? (
            <p className="supplier-returns__hint">{detail.comment}</p>
          ) : null}
          {loading ? (
            <p className="market-receipt-page__detail-empty">
              {t("crm.procurement.detailLoadingItems")}
            </p>
          ) : items.length === 0 ? (
            <p className="market-receipt-page__detail-empty">
              {t("crm.procurement.detailNoItems")}
            </p>
          ) : (
            <div className="nur-table-wrap market-receipt-page__detail-table-wrap">
              <table className="nur-table market-receipt-page__detail-table">
                <thead>
                  <tr>
                    <th>{t("crm.procurement.colNo")}</th>
                    <th>{t("crm.procurement.colName")}</th>
                    <th>{t("crm.procurement.colQty")}</th>
                    <th>{t("crm.procurement.colPurchasePrice")}</th>
                    <th>{t("crm.procurement.colAmount")}</th>
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
            <strong>{t("catalog.total", { amount: formatMoney(detail.totalAmount) })}</strong>
            <button type="button" className="nur-btn nur-btn--secondary" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
}
