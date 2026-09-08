import { useTranslation } from "react-i18next";
import {
  formatBatchDateTime,
  formatBatchMoney,
  formatBatchNumber,
} from "./purchaseBatchUtils";

const PurchaseBatchTable = ({
  batches = [],
  loading = false,
  emptyMessage,
  onReceiptClick,
}: any) => {
  const { t } = useTranslation();
  const rows = Array.isArray(batches) ? batches : [];
  const empty =
    emptyMessage || t("crm.warehouse.purchaseHistory.emptyDefault");

  return (
    <div className="purchase-batch-history__table-wrap">
      <table className="purchase-batch-history__table">
        <thead>
          <tr>
            <th>{t("crm.warehouse.purchaseHistory.colDate")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colSupplier")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colQty")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colPurchasePrice")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colSum")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colEmployee")}</th>
            <th>{t("crm.warehouse.purchaseHistory.colDocument")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7} className="purchase-batch-history__empty">
                {t("common.loading")}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="purchase-batch-history__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((batch, index) => {
              const rowKey = batch.id || `${batch.receipt_id}-${index}`;
              const receiptId = batch.receipt_id;
              const canOpenReceipt =
                Boolean(receiptId) && typeof onReceiptClick === "function";

              return (
                <tr key={rowKey}>
                  <td>{formatBatchDateTime(batch.created_at)}</td>
                  <td>{batch.supplier_name || "—"}</td>
                  <td>{formatBatchNumber(batch.qty)}</td>
                  <td>{formatBatchMoney(batch.purchase_price, 3)}</td>
                  <td>{formatBatchMoney(batch.line_total)}</td>
                  <td>{batch.created_by_name || "—"}</td>
                  <td>
                    {canOpenReceipt ? (
                      <button
                        type="button"
                        className="purchase-batch-history__receipt-link"
                        onClick={() => onReceiptClick(batch)}
                      >
                        {t("crm.warehouse.purchaseHistory.receiptLink")}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PurchaseBatchTable;
