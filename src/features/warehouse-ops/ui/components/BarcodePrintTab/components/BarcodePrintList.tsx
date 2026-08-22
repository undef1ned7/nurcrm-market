import { useTranslation } from "react-i18next";
import Loading from "@shared/ui/Loading/Loading";
import { PagePanel } from "@shared/ui/page-shell";

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
  const { t } = useTranslation();

  return (
    <PagePanel className="barcode-print-tab__content">
      {isInitialLoading ? (
        <div className="barcode-print-tab__loading">
          <Loading message={t("crm.barcodePrint.loadingProducts")} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="barcode-print-tab__empty">
          <div className="barcode-print-tab__empty-icon">📦</div>
          <div className="barcode-print-tab__empty-text">
            {t("crm.barcodePrint.productsNotFound")}
          </div>
        </div>
      ) : (
        <>
          <div className="barcode-print-tab__selection-bar">
            <span className="barcode-print-tab__selection-count">
              {t("crm.barcodePrint.selected", { count: selectedIds.size })}
              {selectedWithBarcode.length < selectedIds.size &&
                selectedIds.size > 0 && (
                  <span className="barcode-print-tab__selection-hint">
                    {" "}
                    {t("crm.barcodePrint.withBarcode", {
                      count: selectedWithBarcode.length,
                    })}
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
                {t("crm.barcodePrint.selectAllOnPage")}
              </button>
              <button
                type="button"
                className="barcode-print-tab__selection-btn"
                onClick={onClearSelection}
                disabled={selectedIds.size === 0 || isBatchPrinting}
              >
                {t("crm.barcodePrint.clearSelection")}
              </button>
              <button
                type="button"
                className="barcode-print-tab__selection-btn"
                onClick={onShowA4Modal}
                title={t("crm.barcodePrint.printA4Title")}
              >
                🖨️ {t("crm.barcodePrint.printA4")}
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
                    ? t("crm.barcodePrint.connectPrinterHint")
                    : selectedWithBarcode.length === 0
                      ? t("crm.barcodePrint.selectWithBarcode")
                      : t("crm.barcodePrint.printLabels", {
                          labels: selectedLabelsTotal,
                          items: selectedWithBarcode.length,
                        })
                }
              >
                {isBatchPrinting ? (
                  <>
                    <span className="barcode-print-tab__spinner" />
                    {t("crm.barcodePrint.printing")}
                  </>
                ) : (
                  <>
                    <span className="barcode-print-tab__print-icon">🖨️</span>
                    {t("crm.barcodePrint.printSelectedCount", {
                      count: selectedWithBarcode.length,
                    })}
                    {selectedLabelsTotal > selectedWithBarcode.length
                      ? t("crm.barcodePrint.labelsShort", {
                          count: selectedLabelsTotal,
                        })
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
                            ? t("crm.barcodePrint.noBarcode")
                            : t("crm.barcodePrint.selectForPrint")
                        }
                      />
                      <span className="barcode-print-tab__card-checkbox-label">
                        {t("crm.barcodePrint.forPrint")}
                      </span>
                    </label>
                    <div className="barcode-print-tab__barcode-label">
                      {t("crm.barcodePrint.barcode")}
                    </div>
                    {barcodeOptions.length > 1 ? (
                      <select
                        className="barcode-print-tab__barcode-select"
                        value={selectedBarcode}
                        onChange={(e) =>
                          setSelectedBarcode(product.id, e.target.value)
                        }
                        disabled={isBatchPrinting}
                        title={t("crm.barcodePrint.multipleBarcodes")}
                      >
                        {barcodeOptions.map((code, idx) => (
                          <option key={code} value={code}>
                            {code}
                            {idx === 0
                              ? t("crm.barcodePrint.barcodePrimary")
                              : t("crm.barcodePrint.barcodeExtra")}
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
                          ? t("crm.barcodePrint.noBarcodeProduct")
                          : isItemPrinting
                            ? t("crm.barcodePrint.printingItem")
                            : t("crm.barcodePrint.previewAndPrint")
                      }
                    >
                      <span className="barcode-print-tab__print-icon">🖨️</span>
                      {isItemPrinting
                        ? t("crm.barcodePrint.printing")
                        : t("crm.barcodePrint.printBarcode")}
                    </button>

                    <div className="barcode-print-tab__product-name">
                      {product.name}
                    </div>

                    <label
                      className="barcode-print-tab__card-copies"
                      title={t("crm.barcodePrint.copiesTitle")}
                    >
                      {t("crm.barcodePrint.copies")}
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
              aria-label={t("crm.barcodePrint.pagination")}
            >
              <span className="barcode-print-tab__pagination-info">
                {t("common.paginationPage", { current: page, total: totalPages })}
                {count > 0 &&
                  t("crm.barcodePrint.pageTotal", { count })}
              </span>
              <div className="barcode-print-tab__pagination-buttons">
                <button
                  type="button"
                  className="barcode-print-tab__pagination-btn"
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1 || loading}
                  aria-label={t("catalog.prevPage")}
                >
                  {t("common.back")}
                </button>
                <button
                  type="button"
                  className="barcode-print-tab__pagination-btn"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= totalPages || loading}
                  aria-label={t("catalog.nextPage")}
                >
                  {t("common.forward")}
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
