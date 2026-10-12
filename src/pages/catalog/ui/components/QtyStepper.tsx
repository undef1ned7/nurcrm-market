import { useTranslation } from "react-i18next";
import { FaMinus, FaPlus } from "react-icons/fa";

export function QtyStepper({ value, onMinus, onPlus, disabled = false }) {
  const { t } = useTranslation();
  return (
    <div className={`qty ${disabled ? "qty--disabled" : ""}`}>
      <button
        type="button"
        className="qty__btn"
        onClick={onMinus}
        disabled={disabled}
        aria-label={t("catalog.qtyMinus")}
      >
        <FaMinus />
      </button>
      <div className="qty__val" aria-live="polite">{value}</div>
      <button
        type="button"
        className="qty__btn"
        onClick={onPlus}
        disabled={disabled}
        aria-label={t("catalog.qtyPlus")}
      >
        <FaPlus />
      </button>
    </div>
  );
};
