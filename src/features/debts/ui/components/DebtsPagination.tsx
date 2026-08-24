type DebtsPaginationProps = {
  currentPage: number;
  totalPages: number;
  count?: number;
  countLabel?: string;
  loading?: boolean;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onPageChange: (page: number) => void;
};

export function DebtsPagination({
  currentPage,
  totalPages,
  count,
  countLabel,
  loading,
  hasNextPage,
  hasPrevPage,
  onPageChange,
}: DebtsPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="debts-page__pagination">
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading || !hasPrevPage}
      >
        Назад
      </button>
      <span className="debts-page__pagination-info">
        Страница {currentPage} из {totalPages ?? 1}
        {count ? ` (${count} ${countLabel})` : ""}
      </span>
      <button
        type="button"
        className="nur-btn nur-btn--secondary nur-btn--sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={
          loading || !hasNextPage || (totalPages && currentPage >= totalPages)
        }
      >
        Вперед
      </button>
    </div>
  );
}
