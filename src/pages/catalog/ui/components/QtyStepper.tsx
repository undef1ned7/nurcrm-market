import { FaMinus, FaPlus } from "react-icons/fa";

export function QtyStepper({ value, onMinus, onPlus, disabled = false }) {
  return (
    <div className={`qty ${disabled ? "qty--disabled" : ""}`}>
      <button
        type="button"
        className="qty__btn"
        onClick={onMinus}
        disabled={disabled}
        aria-label="Minus"
      >
        <FaMinus />
      </button>
      <div className="qty__val">{value}</div>
      <button
        type="button"
        className="qty__btn"
        onClick={onPlus}
        disabled={disabled}
        aria-label="Plus"
      >
        <FaPlus />
      </button>
    </div>
  );
};

