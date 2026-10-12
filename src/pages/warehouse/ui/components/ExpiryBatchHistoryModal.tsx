import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Modal from "@shared/ui/Modal/Modal";
import { fetchProductExpiryBatchesApi } from "@entities/product";
import Pagination from "./Pagination";
import ExpiryBatchTable from "./ExpiryBatchTable";

const DEFAULT_LIMIT = 20;

const parseListResponse = (data: any) => {
  const results = Array.isArray(data?.results)
    ? data.results
    : Array.isArray(data)
      ? data
      : [];
  const count = Number(data?.count) || results.length;
  return {
    results,
    count,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  };
};

const ExpiryBatchHistoryModal = ({
  open,
  productId,
  productName,
  onClose,
}: {
  open: boolean;
  productId?: string;
  productName?: string;
  onClose?: () => void;
}) => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<any>(null);
  const [previous, setPrevious] = useState<any>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / limit)),
    [count, limit],
  );

  const handleClose = () => {
    setPage(1);
    setError("");
    onClose?.();
  };

  const loadBatches = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      setError("");
      const data = await fetchProductExpiryBatchesApi(productId, { page, limit });
      const parsed = parseListResponse(data);
      setBatches(parsed.results);
      setCount(parsed.count);
      setNext(parsed.next);
      setPrevious(parsed.previous);
    } catch (err: any) {
      console.error("Ошибка загрузки партий срока годности:", err);
      setBatches([]);
      setCount(0);
      setNext(null);
      setPrevious(null);
      setError(t("crm.warehouse.expiryBatches.loadError"));
    } finally {
      setLoading(false);
    }
  }, [productId, page, limit, t]);

  useEffect(() => {
    if (!open || !productId) return;
    void loadBatches();
  }, [open, productId, loadBatches]);

  const title = productName
    ? t("crm.warehouse.expiryBatches.titleFor", { name: productName })
    : t("crm.warehouse.expiryBatches.title");

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      className="purchase-batch-history-modal"
      contentClassName="purchase-batch-history-modal__content"
    >
      {error ? <div className="purchase-batch-history__error">{error}</div> : null}

      <ExpiryBatchTable
        batches={batches}
        loading={loading}
        emptyMessage={t("crm.warehouse.expiryBatches.emptyModal")}
      />

      {!loading && !error && totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          count={count}
          countLabel={t("crm.warehouse.expiryBatches.batchesLabel")}
          loading={loading}
          hasNextPage={Boolean(next)}
          hasPrevPage={Boolean(previous)}
          onPageChange={setPage}
        />
      )}
    </Modal>
  );
};

export default ExpiryBatchHistoryModal;
