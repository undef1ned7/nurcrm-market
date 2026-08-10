import SkladHeader from "./SkladHeader";
import SkladTable from "./SkladTable";
import SelectionActions from "./SelectionActions";
import Pagination from "./Pagination";
import DataContainer from "@shared/ui/DataContainer/DataContainer";

/**
 * Компонент вкладки "История"
 */
const HistoryTab = ({
  products,
  loading,
  error,
  count,
  searchTerm,
  onSearchChange,
  isFiltered,
  onResetFilters,
  isSelected,
  toggleRow,
  toggleSelectAllOnPage,
  onEdit,
  currentPage,
  totalPages,
  next,
  previous,
  creating,
  updating,
  deleting,
  onNextPage,
  onPreviousPage,
  selectedIds,
  onBulkDelete,
  onBulkEdit,
  onClearSelection,
  bulkDeleting,
  bulkUpdating,
}: any) => {
  const filteredHistory = products.filter((item) => item.status === "history");

  return (
    <>
      <SkladHeader
        {...({
          searchTerm,
          onSearchChange,
          count,
          productsLength: products.length,
          isFiltered,
          onResetFilters,
          isBuildingCompany: false,
          isMarketCompany: false,
          selectCashBox: "",
          cashBoxes: [] as any[],
        } as any)}
      />

      {filteredHistory.length !== 0 && (
        <SelectionActions
          pageItems={products}
          selectedIds={selectedIds}
          toggleSelectAllOnPage={toggleSelectAllOnPage}
          onBulkDelete={onBulkDelete}
          onBulkEdit={onBulkEdit}
          onClearSelection={onClearSelection}
          bulkDeleting={bulkDeleting}
          bulkUpdating={bulkUpdating}
        />
      )}

      {loading ? (
        <p className="sklad__loading-message">Загрузка товаров...</p>
      ) : error ? (
        <p className="sklad__error-message">Ошибка загрузки</p>
      ) : filteredHistory.length === 0 ? (
        <p className="sklad__no-products-message">Нет доступных товаров.</p>
      ) : (
        <DataContainer>

        <SkladTable
          {...({
            products: filteredHistory,
            onEdit,
            isSelected,
            toggleRow,
            toggleSelectAllOnPage,
            onOpenMarriage: undefined,
            onOpenAddProduct: undefined,
          } as any)}
        />
        </DataContainer>

      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        next={next}
        previous={previous}
        loading={loading}
        creating={creating}
        updating={updating}
        deleting={deleting}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
      />
    </>
  );
};

export default HistoryTab;
