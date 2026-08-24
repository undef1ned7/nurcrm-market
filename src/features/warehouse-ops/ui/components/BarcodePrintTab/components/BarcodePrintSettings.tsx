import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <div className="barcode-print-tab__display-settings">
      <span className="barcode-print-tab__display-settings-title">
        {t("crm.barcodePrint.showOnLabelColon")}
      </span>

      <label className="barcode-print-tab__display-checkbox">
        <input
          type="checkbox"
          checked={showName}
          onChange={(e) => onShowNameChange(e.target.checked)}
        />
        {t("crm.barcodePrint.name")}
      </label>

      <label className="barcode-print-tab__display-checkbox">
        <input
          type="checkbox"
          checked={showPrice}
          onChange={(e) => onShowPriceChange(e.target.checked)}
        />
        {t("crm.barcodePrint.price")}
      </label>

      <label className="barcode-print-tab__size-label">
        {t("crm.barcodePrint.barcodeHeight")}:
        <input
          className="barcode-print-tab__custom-size-input"
          type="number"
          min={20}
          max={200}
          step={2}
          value={Math.round(barcodeHeight)}
          onChange={(e) => onBarcodeHeightChange(e.target.value)}
          title={t("crm.barcodePrint.barcodeHeightTitle")}
        />
      </label>

      <label className="barcode-print-tab__size-label">
        {t("crm.barcodePrint.barcodeWidth")}:
        <select
          className="barcode-print-tab__size-select"
          value={String(Math.max(1, Math.round(barcodeBarWidth)))}
          onChange={(e) => onBarcodeBarWidthChange(e.target.value)}
          title={t("crm.barcodePrint.barWidthTitle")}
        >
          <option value="1">{t("crm.barcodePrint.barWidthThin")}</option>
          <option value="2">{t("crm.barcodePrint.barWidthStandard")}</option>
          <option value="3">{t("crm.barcodePrint.barWidthThick")}</option>
          <option value="4">{t("crm.barcodePrint.barWidthVeryThick")}</option>
        </select>
      </label>
    </div>
  );
};

export default BarcodePrintSettings;
