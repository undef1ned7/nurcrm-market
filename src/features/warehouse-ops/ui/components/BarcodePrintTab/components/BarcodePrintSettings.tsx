
/**
 * Label display / barcode dimension settings shown in the toolbar.
 */
const BarcodePrintSettings = ({
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
    <div className="barcode-print-tab__display-settings">
      <span className="barcode-print-tab__display-settings-title">
        Отображать на этикетке:
      </span>

      <label className="barcode-print-tab__display-checkbox">
        <input
          type="checkbox"
          checked={showName}
          onChange={(e) => onShowNameChange(e.target.checked)}
        />
        Название
      </label>

      <label className="barcode-print-tab__display-checkbox">
        <input
          type="checkbox"
          checked={showPrice}
          onChange={(e) => onShowPriceChange(e.target.checked)}
        />
        Цена
      </label>

      <label className="barcode-print-tab__size-label">
        Высота штрих-кода:
        <input
          className="barcode-print-tab__custom-size-input"
          type="number"
          min={20}
          max={200}
          step={2}
          value={Math.round(barcodeHeight)}
          onChange={(e) => onBarcodeHeightChange(e.target.value)}
          title="Высота штрих-кода в точках (203 DPI ≈ 8 точек/мм)"
        />
      </label>

      <label className="barcode-print-tab__size-label">
        Толщина штриха:
        <select
          className="barcode-print-tab__size-select"
          value={String(Math.max(1, Math.round(barcodeBarWidth)))}
          onChange={(e) => onBarcodeBarWidthChange(e.target.value)}
          title="Ширина минимального штриха в точках"
        >
          <option value="1">1 (тонкий)</option>
          <option value="2">2 (стандарт)</option>
          <option value="3">3 (толстый)</option>
          <option value="4">4 (очень толстый)</option>
        </select>
      </label>
    </div>
  );
};

export default BarcodePrintSettings;
