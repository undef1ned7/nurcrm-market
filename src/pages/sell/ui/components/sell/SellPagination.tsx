import { useTranslation } from "react-i18next";
import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellPagination({ vm }: Props) {
  const { t } = useTranslation();
  const {
    totalPages,
    currentPage,
    handlePageChange,
    loading,
    hasPrevPage,
    hasNextPage,
    count,
  } = vm;

  if (totalPages <= 1) return null;

  return (
    <div className="sell__pagination">
      <button
        type="button"
        className="sell__pagination-btn"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading || !hasPrevPage}
      >
        {t("common.back")}
      </button>
      <span className="sell__pagination-info">
        {t("common.paginationPage", { current: currentPage, total: totalPages })}
        {count
          ? ` ${t("common.paginationCount", {
              count,
              label: t("crm.sell.recordsCount"),
            })}`
          : ""}
      </span>
      <button
        type="button"
        className="sell__pagination-btn"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={
          loading ||
          !hasNextPage ||
          (totalPages && currentPage >= totalPages)
        }
      >
        {t("common.forward")}
      </button>
    </div>
  );
}
