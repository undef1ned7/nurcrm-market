import { FilterBar } from "@shared/ui/page-shell";
import BarcodePrintSettings from "./BarcodePrintSettings";

/**
 * Top toolbar: search, label size, copies, printer connection, display settings.
 */
const BarcodePrintToolbar = ({
  searchTerm,
  onSearchChange,
  isInitialLoading,
  isContentRefreshing,
  labelSize,
  onLabelSizeChange,
  customWidthMm,
  customHeightMm,
  onCustomWidthMmChange,
  onCustomHeightMmChange,
  copiesValue,
  onCopiesChange,
  copiesById,
  onResetCopiesById,
  isPrinterConnected,
  isConnecting,
  onConnectPrinter,
  showName,
  onShowNameChange,
  showPrice,
  onShowPriceChange,
  barcodeHeight,
  barcodeBarWidth,
  onBarcodeHeightChange,
  onBarcodeBarWidthChange,
}) => {
  return (
    <FilterBar className="barcode-print-tab__header">
      <div className="barcode-print-tab__search-wrapper">
        <input
          type="text"
          placeholder="Поиск по названию или штрих-коду"
          value={searchTerm || ""}
          onChange={onSearchChange}
          className="nur-input barcode-print-tab__search"
          disabled={isInitialLoading}
        />
        {isContentRefreshing && (
          <span
            className="barcode-print-tab__search-spinner"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="barcode-print-tab__printer-controls">
        <div className="barcode-print-tab__size-select-wrapper">
          <label className="nur-label barcode-print-tab__size-label">
            Размер этикетки:
            <select
              className="nur-select barcode-print-tab__size-select"
              value={labelSize}
              onChange={(e) => onLabelSizeChange(e.target.value)}
            >
              <option value="30x20">30×20 мм</option>
              <option value="58x40">58×40 мм</option>
              <option value="58x30">58×30 мм</option>
              <option value="custom">Свой размер…</option>
            </select>
          </label>

          {labelSize === "custom" && (
            <>
              <label className="barcode-print-tab__size-label">
                Ширина (мм):
                <input
                  className="barcode-print-tab__custom-size-input"
                  type="number"
                  min={15}
                  max={110}
                  step={1}
                  value={customWidthMm}
                  onChange={(e) => onCustomWidthMmChange(e.target.value)}
                  title="Ширина этикетки в миллиметрах (15–110)"
                />
              </label>
              <label className="barcode-print-tab__size-label">
                Высота (мм):
                <input
                  className="barcode-print-tab__custom-size-input"
                  type="number"
                  min={10}
                  max={110}
                  step={1}
                  value={customHeightMm}
                  onChange={(e) => onCustomHeightMmChange(e.target.value)}
                  title="Высота этикетки в миллиметрах (10–110)"
                />
              </label>
            </>
          )}

          <label className="barcode-print-tab__size-label">
            Копий (по умолчанию):
            <input
              className="barcode-print-tab__copies-input"
              type="number"
              min={1}
              max={100}
              step={1}
              value={copiesValue}
              onChange={(e) => onCopiesChange(e.target.value)}
              title="Значение копий для позиций, у которых не задано своё количество"
            />
          </label>

          {Object.keys(copiesById).length > 0 && (
            <button
              type="button"
              className="barcode-print-tab__selection-btn"
              onClick={onResetCopiesById}
              title="Вернуть всем позициям количество копий по умолчанию"
            >
              Сбросить копии позиций
            </button>
          )}
        </div>

        <div className="barcode-print-tab__printer-status">
          <span
            className={`barcode-print-tab__status-indicator ${
              isPrinterConnected
                ? "barcode-print-tab__status-indicator--connected"
                : "barcode-print-tab__status-indicator--disconnected"
            }`}
          />
          <span className="barcode-print-tab__status-text">
            {isPrinterConnected ? "Принтер подключен" : "Принтер не подключен"}
          </span>
        </div>

        <button
          type="button"
          className="nur-btn nur-btn--primary barcode-print-tab__connect-btn"
          onClick={onConnectPrinter}
          disabled={isConnecting}
        >
          {isConnecting ? "Подключение..." : "Подключить принтер"}
        </button>
      </div>

      <BarcodePrintSettings
        showName={showName}
        onShowNameChange={onShowNameChange}
        showPrice={showPrice}
        onShowPriceChange={onShowPriceChange}
        barcodeHeight={barcodeHeight}
        barcodeBarWidth={barcodeBarWidth}
        onBarcodeHeightChange={onBarcodeHeightChange}
        onBarcodeBarWidthChange={onBarcodeBarWidthChange}
      />
    </FilterBar>
  );
};

export default BarcodePrintToolbar;
