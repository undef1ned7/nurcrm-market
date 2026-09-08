import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import PurchaseBatchTable from "./PurchaseBatchTable";
import PurchaseBatchHistoryModal from "./PurchaseBatchHistoryModal";
import ReceiptDetailModal from "./ReceiptDetailModal";

const PREVIEW_LIMIT = 50;

const PurchaseBatchHistory = ({ productId, productName, batches = [] }: any) => {
  const { t } = useTranslation();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [receiptSeed, setReceiptSeed] = useState<any>(null);

  const previewBatches = Array.isArray(batches) ? batches : [];
  const hasPreview = previewBatches.length > 0;

  const handleReceiptClick = (batch: any) => {
    if (!batch?.receipt_id) return;
    setReceiptSeed({
      id: batch.receipt_id,
      receipt_id: batch.receipt_id,
      supplier_name: batch.supplier_name,
      created_at: batch.created_at,
      created_by_name: batch.created_by_name,
    });
  };

  return (
    <div className="product-detail__section purchase-batch-history">
      <div className="purchase-batch-history__head">
        <h3 className="product-detail__section-title">
          {t("crm.warehouse.purchaseHistory.title")}
        </h3>
        {productId && (
          <button
            type="button"
            className="purchase-batch-history__all-btn"
            onClick={() => setHistoryModalOpen(true)}
          >
            <History size={16} />
            {t("crm.warehouse.purchaseHistory.allHistory")}
          </button>
        )}
      </div>

      <p className="purchase-batch-history__hint">
        {t("crm.warehouse.purchaseHistory.hint")}
      </p>

      <PurchaseBatchTable
        batches={previewBatches as any}
        emptyMessage={t("crm.warehouse.purchaseHistory.emptyPreview")}
        onReceiptClick={handleReceiptClick}
      />

      {hasPreview && previewBatches.length >= PREVIEW_LIMIT && (
        <p className="purchase-batch-history__footnote">
          {t("crm.warehouse.purchaseHistory.footnote", { count: PREVIEW_LIMIT })}
        </p>
      )}

      <PurchaseBatchHistoryModal
        open={historyModalOpen}
        productId={productId}
        productName={productName}
        onClose={() => setHistoryModalOpen(false)}
      />

      {receiptSeed && (
        <ReceiptDetailModal
          receiptSeed={receiptSeed}
          onClose={() => setReceiptSeed(null)}
        />
      )}
    </div>
  );
};

export default PurchaseBatchHistory;
