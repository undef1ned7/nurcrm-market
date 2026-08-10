import type { SellPageVm } from "../../hooks/useSellPage";

type Props = {
  vm: SellPageVm;
};

export default function SellPagination({ vm }: Props) {
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
        Назад
      </button>
      <span className="sell__pagination-info">
        Страница {currentPage} из {totalPages}
        {count ? ` (${count} записей)` : ""}
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
        Вперед
      </button>
    </div>
  );
}
