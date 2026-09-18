import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import ExpiryBatchTable from "./ExpiryBatchTable";
import ExpiryBatchHistoryModal from "./ExpiryBatchHistoryModal";
import type { ProductExpiryBatch } from "@entities/product";

const PREVIEW_LIMIT = 50;

const ExpiryBatchHistory = ({
  productId,
  productName,
  batches = [],
}: {
  productId?: string;
  productName?: string;
  batches?: ProductExpiryBatch[];
}) => {
  const { t } = useTranslation();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const previewBatches = Array.isArray(batches) ? batches : [];
  const hasPreview = previewBatches.length > 0;

  return (
    <div className="product-detail__section purchase-batch-history">
      <div className="purchase-batch-history__head">
        <h3 className="product-detail__section-title">
          {t("crm.warehouse.expiryBatches.title")}
        </h3>
        {productId && (
          <button
            type="button"
            className="purchase-batch-history__all-btn"
            onClick={() => setHistoryModalOpen(true)}
          >
            <History size={16} />
            {t("crm.warehouse.expiryBatches.allBatches")}
          </button>
        )}
      </div>

      <p className="purchase-batch-history__hint">
        {t("crm.warehouse.expiryBatches.hint")}
      </p>

      <ExpiryBatchTable
        batches={previewBatches}
        emptyMessage={t("crm.warehouse.expiryBatches.emptyPreview")}
      />

      {hasPreview && previewBatches.length >= PREVIEW_LIMIT && (
        <p className="purchase-batch-history__footnote">
          {t("crm.warehouse.expiryBatches.footnote", { count: PREVIEW_LIMIT })}
        </p>
      )}

      <ExpiryBatchHistoryModal
        open={historyModalOpen}
        productId={productId}
        productName={productName}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
};

export default ExpiryBatchHistory;
