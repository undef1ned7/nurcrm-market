import { useEffect } from "react";
import ReactPortal from "../Portal/ReactPortal";
import "./AlertModal.scss";

const TYPE_CLASS = {
  success: "alert-modal--success",
  error: "alert-modal--error",
  warning: "alert-modal--warning",
  info: "alert-modal--info",
};

const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20 6L9 17L4 12"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AlertModal = ({
  open,
  type = "success",
  title,
  message,
  okText = "Ok",
  onClose,
  // Без onConfirm кнопка и Enter закрывают окно через onClose
  onConfirm = undefined as (() => void) | undefined,
}) => {
  const handle = onConfirm || onClose;
  // Escape — «закрыть», а не «подтвердить»: в окнах подтверждения (удаление товаров,
  // закрытие смены) Escape раньше выполнял действие.
  const dismiss = onClose || onConfirm;
  const typeClass = TYPE_CLASS[type] || TYPE_CLASS.info;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: any) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss?.();
      } else if (e.key === "Enter" && !e.repeat) {
        // e.repeat: зажатый Enter не должен подтверждать несколько раз
        e.preventDefault();
        handle?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handle, dismiss]);

  if (!open) return null;

  return (
    <ReactPortal wrapperId="alert_modal">
      <div className={`alert-modal ${typeClass}`}>
        <button
          type="button"
          className="alert-modal__backdrop"
          aria-label="Закрыть"
          onClick={onClose}
        />
        <div className="alert-modal__dialog" role="dialog" aria-modal="true">
          <div className="alert-modal__icon">
            <CheckIcon />
          </div>
          {title ? <h3 className="alert-modal__title">{title}</h3> : null}
          <div className="alert-modal__message">{message}</div>
          <div className="alert-modal__actions">
            <button type="button" className="nur-btn nur-btn--primary" onClick={handle}>
              {okText}
            </button>
          </div>
        </div>
      </div>
    </ReactPortal>
  );
};

export default AlertModal;
