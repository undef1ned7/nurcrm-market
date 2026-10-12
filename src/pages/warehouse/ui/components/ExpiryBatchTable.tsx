import { useTranslation } from "react-i18next";
import {
  getBatchDaysLeft,
  getBatchExpiryStatus,
  translateExpiryStatus,
  type ProductExpiryBatch,
} from "@entities/product";
import { formatBatchDateTime, formatBatchNumber } from "./purchaseBatchUtils";

const STATUS_TONE: Record<string, string> = {
  expired: "danger",
  critical: "danger",
  warning: "warning",
};

const ExpiryBatchTable = ({
  batches = [],
  loading = false,
  emptyMessage,
}: {
  batches?: ProductExpiryBatch[];
  loading?: boolean;
  emptyMessage?: string;
}) => {
  const { t } = useTranslation();
  const rows = Array.isArray(batches) ? batches : [];
  const empty = emptyMessage || t("crm.warehouse.expiryBatches.emptyDefault");

  return (
    <div className="purchase-batch-history__table-wrap">
      <table className="purchase-batch-history__table">
        <thead>
          <tr>
            <th>{t("crm.warehouse.expiryBatches.colReceived")}</th>
            <th>{t("crm.warehouse.expiryBatches.colQty")}</th>
            <th>{t("crm.warehouse.expiryBatches.colRemaining")}</th>
            <th>{t("crm.warehouse.expiryBatches.colExpiresAt")}</th>
            <th>{t("crm.warehouse.expiryBatches.colDaysLeft")}</th>
            <th>{t("crm.warehouse.expiryBatches.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="purchase-batch-history__empty">
                {t("common.loading")}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="purchase-batch-history__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((batch, index) => {
              const status = getBatchExpiryStatus(batch);
              const daysLeft = getBatchDaysLeft(batch);
              const tone = status ? STATUS_TONE[status] : null;
              const isConsumed =
                batch.status === "consumed" ||
                Number(batch.remaining_quantity) === 0;

              return (
                <tr key={batch.id || index}>
                  <td>{formatBatchDateTime(batch.received_at)}</td>
                  <td>{formatBatchNumber(batch.quantity)}</td>
                  <td>{formatBatchNumber(batch.remaining_quantity)}</td>
                  <td>
                    {batch.expires_at ? formatBatchDateTime(batch.expires_at) : "—"}
                  </td>
                  <td>{daysLeft != null ? daysLeft : "—"}</td>
                  <td>
                    {isConsumed ? (
                      <span className="nur-chip nur-chip--info">
                        {t("crm.warehouse.expiryBatches.statusConsumed")}
                      </span>
                    ) : status ? (
                      <span className={`nur-chip nur-chip--${tone}`}>
                        {translateExpiryStatus(status)}
                      </span>
                    ) : (
                      <span className="nur-chip nur-chip--success">
                        {t("crm.warehouse.expiryBatches.statusOk")}
                      </span>
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

export default ExpiryBatchTable;
