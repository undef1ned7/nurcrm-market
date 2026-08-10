import Loading from "@shared/ui/Loading/Loading";
import { PagePanel } from "@shared/ui/page-shell";

/**
 * Product list: selection bar, cards grid, pagination.
 */
const BarcodePrintList = ({
  loading,
  isInitialLoading,
  filteredProducts,
  printingIds,
  selectedIds,
  selectedWithBarcode,
  selectedLabelsTotal,
  isBatchPrinting,
  isPrinterConnected,
  page = 1,
  totalPages = 1,
  count = 0,
  onPageChange,
  onSelectAllOnPage,
  onClearSelection,
  onShowA4Modal,
  onPrintSelected,
  onToggleSelection,
  onOpenPreview,
  getProductBarcodeOptions,
  getSelectedBarcode,
  setSelectedBarcode,
  getProductCopies,
  setProductCopies,
}: any) => {
  return (
    <PagePanel className="barcode-print-tab__content">
      {isInitialLoading ? (
        <div className="barcode-print-tab__loading">
          <Loading message="Загрузка товаров..." />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="barcode-print-tab__empty">
          <div className="barcode-print-tab__empty-icon">📦</div>
          <div className="barcode-print-tab__empty-text">Товары не найдены</div>
        </div>
      ) : (
        <>
          <div className="barcode-print-tab__selection-bar">
            <span className="barcode-print-tab__selection-count">
              Выбрано: {selectedIds.size}
              {selectedWithBarcode.length < selectedIds.size &&
                selectedIds.size > 0 && (
                  <span className="barcode-print-tab__selection-hint">
                    {" "}
                    (с штрих-кодом: {selectedWithBarcode.length})
                  </span>
                )}
            </span>
            <div className="barcode-print-tab__selection-actions">
              <button
                type="button"
                className="barcode-print-tab__selection-btn"
                onClick={onSelectAllOnPage}
                disabled={isBatchPrinting || filteredProducts.length === 0}
              >
                Выбрать все на странице
              </button>
              <button
                type="button"
                className="barcode-print-tab__selection-btn"
                onClick={onClearSelection}
                disabled={selectedIds.size === 0 || isBatchPrinting}
              >
                Снять выбор
              </button>
              <button
                type="button"
                className="barcode-print-tab__selection-btn"
                onClick={onShowA4Modal}
                title="Печать штрих-кодов на листе A4 (обычный принтер)"
              >
                🖨️ Печать на A4
              </button>
              <button
                type="button"
                className="barcode-print-tab__batch-print-btn"
                onClick={onPrintSelected}
                disabled={
                  isBatchPrinting ||
                  !isPrinterConnected ||
                  selectedWithBarcode.length === 0
                }
                title={
                  !isPrinterConnected
                    ? "Подключите принтер"
                    : selectedWithBarcode.length === 0
                      ? "Выберите товары с штрих-кодом"
                      : `Распечатать ${selectedLabelsTotal} этикеток (${selectedWithBarcode.length} позиций)`
                }
              >
                {isBatchPrinting ? (
                  <>
                    <span className="barcode-print-tab__spinner" />
                    Печать...
                  </>
                ) : (
                  <>
                    <span className="barcode-print-tab__print-icon">🖨️</span>
                    Печать выбранных ({selectedWithBarcode.length}
                    {selectedLabelsTotal > selectedWithBarcode.length
                      ? ` · ${selectedLabelsTotal} эт.`
                      : ""}
                    )
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="barcode-print-tab__grid">
            {filteredProducts.map((product) => {
              const isItemPrinting = printingIds.has(product.id);
              const barcodeOptions = getProductBarcodeOptions(product);
              const selectedBarcode = getSelectedBarcode(product);
              const hasBarcode = Boolean(selectedBarcode);
              const isSelected = selectedIds.has(product.id);

              return (
                <div
                  key={product.id}
                  className={`barcode-print-tab__card ${
                    isSelected ? "barcode-print-tab__card--selected" : ""
                  }`}
                >
                  <div className="barcode-print-tab__card-header">
                    <label className="barcode-print-tab__card-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection(product.id)}
                        disabled={!hasBarcode || isBatchPrinting}
                        title={
                          !hasBarcode
                            ? "У товара нет штрих-кода"
                            : "Выбрать для печати"
                        }
                      />
                      <span className="barcode-print-tab__card-checkbox-label">
                        В печать
                      </span>
                    </label>
                    <div className="barcode-print-tab__barcode-label">
                      Штрих-код:
                    </div>
                    {barcodeOptions.length > 1 ? (
                      <select
                        className="barcode-print-tab__barcode-select"
                        value={selectedBarcode}
                        onChange={(e) =>
                          setSelectedBarcode(product.id, e.target.value)
                        }
                        disabled={isBatchPrinting}
                        title="У товара несколько штрих-кодов — выберите, какой печатать"
                      >
                        {barcodeOptions.map((code, idx) => (
                          <option key={code} value={code}>
                            {code}
                            {idx === 0 ? " (основной)" : " (доп.)"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="barcode-print-tab__barcode-value">
                        {selectedBarcode || "—"}
                      </div>
                    )}
                  </div>

                  <div className="barcode-print-tab__card-body">
                    <button
                      className="barcode-print-tab__print-btn"
                      onClick={() => onOpenPreview(product)}
                      disabled={!hasBarcode || isItemPrinting}
                      title={
                        !hasBarcode
                          ? "У товара отсутствует штрих-код"
                          : isItemPrinting
                            ? "Идёт печать..."
                            : "Предпросмотр и печать штрих-кода"
                      }
                    >
                      <span className="barcode-print-tab__print-icon">🖨️</span>
                      {isItemPrinting ? "Печать..." : "Распечатать штрих-код"}
                    </button>

                    <div className="barcode-print-tab__product-name">
                      {product.name}
                    </div>

                    <label
                      className="barcode-print-tab__card-copies"
                      title="Сколько копий этикетки печатать для этой позиции"
                    >
                      Копий:
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={getProductCopies(product.id)}
                        onChange={(e) =>
                          setProductCopies(product.id, e.target.value)
                        }
                        disabled={!hasBarcode || isBatchPrinting}
                        className="barcode-print-tab__card-copies-input"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && onPageChange && (
            <nav
              className="barcode-print-tab__pagination"
              aria-label="Пагинация"
            >
              <span className="barcode-print-tab__pagination-info">
                Страница {page} из {totalPages}
                {count > 0 && <> · Всего: {count}</>}
              </span>
              <div className="barcode-print-tab__pagination-buttons">
                <button
                  type="button"
                  className="barcode-print-tab__pagination-btn"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  aria-label="Предыдущая страница"
                >
                  Назад
                </button>
                <button
                  type="button"
                  className="barcode-print-tab__pagination-btn"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages || loading}
                  aria-label="Следующая страница"
                >
                  Вперёд
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </PagePanel>
  );
};

export default BarcodePrintList;
