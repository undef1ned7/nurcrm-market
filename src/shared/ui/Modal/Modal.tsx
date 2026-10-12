import { useEffect, useId } from "react";
import ReactPortal from "../Portal/ReactPortal";
import { X } from "lucide-react";
import "./Modal.scss";

/**
 * Кроссплатформенная модалка с overlay и корректным скроллом на всех устройствах и браузерах.
 *
 * @param {boolean} open - показывать модалку
 * @param {() => void} onClose - закрытие (клик по overlay или кнопка)
 * @param {React.ReactNode} children - содержимое (рендерится внутри скроллируемой области)
 * @param {string} [title] - заголовок (опционально)
 * @param {boolean} [closeOnOverlayClick=true] - закрывать по клику на overlay
 * @param {boolean} [showCloseButton=true] - показывать кнопку закрытия в шапке
 * @param {string} [wrapperId] - id контейнера для портала (по умолчанию уникальный)
 * @param {string} [className] - доп. класс для обёртки диалога
 * @param {string} [contentClassName] - доп. класс для области с children
 * @param {React.ReactNode} [footer] - футер с действиями (.nur-btn)
 */
const Modal = ({
  open,
  onClose,
  children,
  title,
  footer,
  closeOnOverlayClick = true,
  showCloseButton = true,
  wrapperId = "common-modal",
  className = "",
  contentClassName = "",
}: any) => {
  // Уникальный id заголовка: при одном общем id две открытые модалки
  // получали одно доступное имя (aria-labelledby брал первый элемент с этим id).
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (e: any) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose?.();
    }
  };

  return (
    <ReactPortal wrapperId={wrapperId}>
      <div
        className="common-modal-overlay"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <div
          className={`common-modal-dialog ${className}`.trim()}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || showCloseButton) && (
            <div className="common-modal-header">
              {title && (
                <h2 id={titleId} className="common-modal-title">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  className="common-modal-close"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          <div
            className={`common-modal-content ${contentClassName}`.trim()}
            data-scroll-lock-scrollable
          >
            {children}
          </div>
          {footer ? (
            <div className="common-modal-footer">{footer}</div>
          ) : null}
        </div>
      </div>
    </ReactPortal>
  );
};

export default Modal;
