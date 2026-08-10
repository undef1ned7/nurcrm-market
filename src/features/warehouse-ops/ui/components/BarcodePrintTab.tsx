/**
 * Компонент таба для печати штрих-кодов
 *
 * Улучшения/ошибки:
 * - printingIds раньше был “мертвым” (не использовался) — теперь реально блокирует кнопку печати конкретного товара.
 * - Canvas был 400x80, а JsBarcode рисовал height=90 → обрезало. Теперь размер canvas подстраивается под выбранный размер этикетки.
 * - Превью стало ближе к реальным пропорциям 203 DPI (dots), без магии “на глаз”.
 */
import "./BarcodePrintTab.scss";
import BarcodeA4PrintModal from "./BarcodeA4PrintModal";
import { useBarcodePrintTab } from "./BarcodePrintTab/hooks/useBarcodePrintTab";
import BarcodePrintToolbar from "./BarcodePrintTab/components/BarcodePrintToolbar";
import BarcodePrintList from "./BarcodePrintTab/components/BarcodePrintList";
import BarcodePrintPreview from "./BarcodePrintTab/components/BarcodePrintPreview";

const BarcodePrintTab = ({
  products,
  loading,
  searchTerm,
  onSearchChange,
  page = 1,
  totalPages = 1,
  count = 0,
  _pageSize = 100,
  onPageChange,
}: any) => {
  const tab = useBarcodePrintTab({ products, loading });

  return (
    <div className="barcode-print-tab">
      <BarcodePrintToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        isInitialLoading={tab.isInitialLoading}
        isContentRefreshing={tab.isContentRefreshing}
        labelSize={tab.labelSize}
        onLabelSizeChange={tab.handleLabelSizeChange}
        customWidthMm={tab.customWidthMm}
        customHeightMm={tab.customHeightMm}
        onCustomWidthMmChange={tab.setCustomWidthMm}
        onCustomHeightMmChange={tab.setCustomHeightMm}
        copiesValue={tab.copiesValue}
        onCopiesChange={tab.handleCopiesChange}
        copiesById={tab.copiesById}
        onResetCopiesById={tab.resetCopiesById}
        isPrinterConnected={tab.isPrinterConnected}
        isConnecting={tab.isConnecting}
        onConnectPrinter={tab.handleConnectPrinter}
        showName={tab.showName}
        onShowNameChange={tab.setShowName}
        showPrice={tab.showPrice}
        onShowPriceChange={tab.setShowPrice}
        barcodeHeight={tab.barcodeHeight}
        barcodeBarWidth={tab.barcodeBarWidth}
        onBarcodeHeightChange={tab.handleBarcodeHeightChange}
        onBarcodeBarWidthChange={tab.handleBarcodeBarWidthChange}
      />

      <BarcodePrintList
        loading={loading}
        isInitialLoading={tab.isInitialLoading}
        filteredProducts={tab.filteredProducts}
        printingIds={tab.printingIds}
        selectedIds={tab.selectedIds}
        selectedWithBarcode={tab.selectedWithBarcode}
        selectedLabelsTotal={tab.selectedLabelsTotal}
        isBatchPrinting={tab.isBatchPrinting}
        isPrinterConnected={tab.isPrinterConnected}
        page={page}
        totalPages={totalPages}
        count={count}
        onPageChange={onPageChange}
        onSelectAllOnPage={tab.selectAllOnPage}
        onClearSelection={tab.clearSelection}
        onShowA4Modal={() => tab.setShowA4Modal(true)}
        onPrintSelected={tab.handlePrintSelected}
        onToggleSelection={tab.toggleSelection}
        onOpenPreview={tab.handleOpenPreview}
        getProductBarcodeOptions={tab.getProductBarcodeOptions}
        getSelectedBarcode={tab.getSelectedBarcode}
        setSelectedBarcode={tab.setSelectedBarcode}
        getProductCopies={tab.getProductCopies}
        setProductCopies={tab.setProductCopies}
      />

      {tab.showA4Modal && (
        <BarcodeA4PrintModal
          products={tab.a4ModalProducts as any}
          onClose={() => tab.setShowA4Modal(false)}
        />
      )}

      <BarcodePrintPreview
        previewProduct={tab.previewProduct}
        onClose={tab.handleClosePreview}
        availableFonts={tab.availableFonts}
        fontId={tab.fontId}
        onFontIdChange={tab.handleFontIdChange}
        textScaleValue={tab.textScaleValue}
        onTextScaleChange={tab.handleTextScaleChange}
        getProductBarcodeOptions={tab.getProductBarcodeOptions}
        getSelectedBarcode={tab.getSelectedBarcode}
        setSelectedBarcode={tab.setSelectedBarcode}
        getProductCopies={tab.getProductCopies}
        setProductCopies={tab.setProductCopies}
        showName={tab.showName}
        onShowNameChange={tab.setShowName}
        showPrice={tab.showPrice}
        onShowPriceChange={tab.setShowPrice}
        previewLayout={tab.previewLayout}
        previewLines={tab.previewLines}
        previewPositions={tab.previewPositions}
        previewPriceText={tab.previewPriceText}
        barcodeCanvasRef={tab.barcodeCanvasRef}
        isPrinting={tab.isPrinting}
        isPrinterConnected={tab.isPrinterConnected}
        onPrint={tab.handlePrintFromPreview}
      />
    </div>
  );
};

export default BarcodePrintTab;
