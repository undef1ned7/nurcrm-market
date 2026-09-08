import { useTranslation } from "react-i18next";
import "./Pagination.scss";

/**
 * Компонент пагинации
 */
const Pagination = ({
  currentPage,
  totalPages,
  count,
  countLabel,
  loading,
  hasNextPage,
  hasPrevPage,
  onPageChange,
}) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const label = countLabel || t("crm.warehouse.pluralProducts");

  return (
    <div className="warehouse-pagination">
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading || !hasPrevPage}
      >
        {t("common.back")}
      </button>
      <span className="warehouse-pagination__info">
        {t("common.paginationPage", {
          current: currentPage,
          total: totalPages ?? 1,
        })}
        {count ? ` (${count} ${label})` : ""}
      </span>
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || !hasNextPage || (totalPages && currentPage >= totalPages)}
      >
        {t("common.forward")}
      </button>
    </div>
  );
};

export default Pagination;
