import { useEffect } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Label preview modal with font/scale/barcode settings and print actions.
 */
const BarcodePrintPreview = ({
  previewProduct,
  onClose,
  availableFonts,
  fontId,
  onFontIdChange,
  textScaleValue,
  onTextScaleChange,
  getProductBarcodeOptions,
  getSelectedBarcode,
  setSelectedBarcode,
  getProductCopies,
  setProductCopies,
  showName,
  onShowNameChange,
  showPrice,
  onShowPriceChange,
  previewLayout,
  previewLines,
  previewPositions,
  previewPriceText,
  barcodeCanvasRef,
  isPrinting,
  isPrinterConnected,
  onPrint,
}: any) => {
  const isOpen = Boolean(previewProduct);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPrinting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isPrinting, onClose]);

  if (!previewProduct) return null;

  // createPortal напрямую в body: ReactPortal монтирует детей на следующем рендере,
  // и canvas штрих-кода был бы ещё null в момент отрисовки (эффект в useBarcodePrintTab).
  return createPortal(
    <div
      className="barcode-preview-modal__overlay"
      onClick={() => {
        if (!isPrinting) onClose();
      }}
      role="presentation"
    >
    <div
      className="barcode-preview-modal"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="barcode-preview-modal-title"
    >
      <div className="barcode-preview-modal__head">
        <h3 id="barcode-preview-modal-title">Предпросмотр этикетки</h3>
        <button
          type="button"
          className="barcode-preview-modal__close"
          onClick={onClose}
          disabled={isPrinting}
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>
      </div>
      <div className="barcode-preview-modal__body">
      <div className="barcode-print-tab__preview">
        <div
          className="barcode-print-tab__preview-settings"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Шрифт:
            <select
              value={String(fontId || "")}
              onChange={(e) => onFontIdChange(e.target.value)}
            >
              {availableFonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Масштаб:
            <select
              value={String(textScaleValue)}
              onChange={(e) => onTextScaleChange(e.target.value)}
              title="TSPL масштаб целочисленный. Для уменьшения — выбирайте другой шрифт."
            >
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="3">3×</option>
            </select>
          </label>

          {getProductBarcodeOptions(previewProduct).length > 1 && (
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Штрих-код:
              <select
                value={getSelectedBarcode(previewProduct)}
                onChange={(e) =>
                  setSelectedBarcode(previewProduct.id, e.target.value)
                }
                title="У товара несколько штрих-кодов — выберите, какой печатать"
              >
                {getProductBarcodeOptions(previewProduct).map((code, idx) => (
                  <option key={code} value={code}>
                    {code}
                    {idx === 0 ? " (основной)" : " (доп.)"}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Копий:
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={getProductCopies(previewProduct.id)}
              onChange={(e) =>
                setProductCopies(previewProduct.id, e.target.value)
              }
              style={{ width: 80 }}
              title="Сколько копий этикетки печатать для этой позиции"
            />
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => onShowNameChange(e.target.checked)}
            />
            Название
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => onShowPriceChange(e.target.checked)}
            />
            Цена
          </label>
        </div>

        <div className="barcode-print-tab__preview-label">
          <div
            className="barcode-print-tab__preview-label-sheet"
            style={{
              width: `${previewLayout.widthPx}px`,
              height: `${previewLayout.heightPx}px`,
              ["--preview-scale" as any]: previewLayout.scale,
            }}
          >
            <div
              className="barcode-print-tab__preview-border"
              style={{
                inset: `${previewLayout.border.margin * previewLayout.scale}px`,
                borderWidth: `${
                  previewLayout.border.thick * previewLayout.scale
                }px`,
              }}
            />

            {previewLines.map((line, i) => (
              <div
                key={`${line}-${i}`}
                className="barcode-print-tab__preview-title-line"
                style={{
                  left: `${previewPositions.textX * previewLayout.scale}px`,
                  top: `${
                    (previewPositions.textY +
                      previewLayout.text.lineGap * i) *
                    previewLayout.scale
                  }px`,
                  fontSize: `${
                    previewLayout.text.size * previewLayout.scale
                  }px`,
                  width: `${previewPositions.textW * previewLayout.scale}px`,
                  textAlign: "center",
                }}
              >
                {line}
              </div>
            ))}

            <canvas
              ref={barcodeCanvasRef}
              className="barcode-print-tab__preview-barcode-canvas"
              style={{
                left: `${previewPositions.barcodeX * previewLayout.scale}px`,
                top: `${previewPositions.barcodeY * previewLayout.scale}px`,
              }}
            />

            {previewPriceText && (
              <div
                className="barcode-print-tab__preview-price"
                style={{
                  left: `${previewPositions.priceX * previewLayout.scale}px`,
                  top: `${previewPositions.priceY * previewLayout.scale}px`,
                  fontSize: `${
                    previewLayout.text.size * previewLayout.scale
                  }px`,
                  fontWeight: 700,
                  width: `${previewPositions.textW * previewLayout.scale}px`,
                  textAlign: "center",
                }}
              >
                {previewPriceText}
              </div>
            )}
          </div>
        </div>

        <div className="barcode-print-tab__preview-actions">
          <button
            type="button"
            className="barcode-print-tab__preview-cancel-btn"
            onClick={onClose}
            disabled={isPrinting}
          >
            Отмена
          </button>

          <button
            type="button"
            className="barcode-print-tab__preview-print-btn"
            onClick={onPrint}
            disabled={isPrinting || !isPrinterConnected}
            title={
              !isPrinterConnected
                ? "Принтер не подключен. Подключите принтер XP-365B."
                : "Распечатать этикетку"
            }
          >
            {isPrinting ? (
              <>
                <span className="barcode-print-tab__spinner"></span>
                Печать...
              </>
            ) : (
              <>
                <span className="barcode-print-tab__print-icon">🖨️</span>
                Распечатать
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
    </div>,
    document.body,
  );
};

export default BarcodePrintPreview;
