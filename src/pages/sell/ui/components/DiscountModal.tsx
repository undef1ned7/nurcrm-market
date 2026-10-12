import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import UniversalModal from "@shared/ui/legacy-production/ProductionAgents/UniversalModal/UniversalModal";

const DiscountModal = ({
  show,
  onClose,
  discountValue,
  setDiscountValue,
  currentSubtotal,
  onApply,
  mode = "amount", // "amount" | "percent"
  setMode, // опционально, если нужно менять режим из модалки
  maxPercent = null, // максимальная скидка в % (null — без ограничения)
}: any) => {
  const { t } = useTranslation();
  const td = (k: string, o?: any): string =>
    t(`crm.sell.modals.discount.${k}`, o) as string;
  const handleClose = useCallback(() => {
    onClose();
    setDiscountValue("");
  }, [onClose, setDiscountValue]);

  const handleApply = useCallback(() => {
    const discount = String(discountValue || "").trim() === "" ? "0" : discountValue;
    onApply(discount);
    onClose();
    setDiscountValue("");
  }, [discountValue, onApply, onClose, setDiscountValue]);

  useEffect(() => {
    if (!show) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show, handleClose, handleApply]);

  if (!show) return null;

  return (
    <UniversalModal
      onClose={handleClose}
      title={td("title")}
    >
      <div className="start__discount min-w-75">
        <div style={{ marginBottom: "10px", display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`sell__reset ${
              mode === "amount" ? "start__total-pay" : ""
            }`}
            onClick={() => setMode && setMode("amount")}
          >
            {td("modeAmount")}
          </button>
          <button
            type="button"
            className={`sell__reset ${
              mode === "percent" ? "start__total-pay" : ""
            }`}
            onClick={() => setMode && setMode("percent")}
          >
            {td("modePercent")}
          </button>
        </div>
        <div>
          <label>
            {mode === "percent" ? td("labelPercent") : td("labelAmount")}
          </label>
          <input
            className="sell__header-input"
            type="number"
            min="0"
            step="0.01"
            onFocus={(e) => {
              if (Number(e.target.value) <= 0) {
                setDiscountValue("");
              }
            }}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            placeholder={
              mode === "percent"
                ? td("placeholderPercent")
                : td("placeholderAmount")
            }
            autoFocus
          />
          {currentSubtotal && mode === "amount" && (
            <p style={{ fontSize: "12px", color: "#666", marginTop: "5px" }}>
              {td("subtotalWithout", { sum: currentSubtotal })}
            </p>
          )}
          {maxPercent != null && (
            <p style={{ fontSize: "12px", color: "#b45309", marginTop: "5px" }}>
              {td("maxDiscount", { percent: maxPercent })}
            </p>
          )}
        </div>
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            columnGap: "10px",
            justifyContent: "end",
          }}
        >
          <button
            className="sell__reset"
            type="button"
            onClick={handleClose}
          >
            {t("common.cancel")}
          </button>
          <button
            className="start__total-pay"
            style={{ width: "auto" }}
            type="button"
            onClick={handleApply}
          >
            {t("common.apply")}
          </button>
        </div>
      </div>
    </UniversalModal>
  );
};

export default DiscountModal;
