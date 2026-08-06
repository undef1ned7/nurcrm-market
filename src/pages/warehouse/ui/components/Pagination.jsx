import "./Pagination.scss";

/**
 * Компонент пагинации
 */
const Pagination = ({
  currentPage,
  totalPages,
  count,
  countLabel = "товаров",
  loading,
  hasNextPage,
  hasPrevPage,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="warehouse-pagination">
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading || !hasPrevPage}
      >
        Назад
      </button>
      <span className="warehouse-pagination__info">
        Страница {currentPage} из {totalPages ?? 1}
        {count ? ` (${count} ${countLabel})` : ""}
      </span>
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || !hasNextPage || (totalPages && currentPage >= totalPages)}
      >
        Вперед
      </button>
    </div>
  );
};

export default Pagination;
