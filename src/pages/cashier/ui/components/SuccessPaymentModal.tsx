import { useState, useEffect } from "react";
import { X, ChevronUp, ChevronDown, Download, Printer } from "lucide-react";
import { useDispatch } from "react-redux";
import { getInvoiceJson } from "@entities/sale";
import "./SuccessPaymentModal.scss";

const toMoney = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const SuccessPaymentModal = ({
  open,
  onClose,
  onPrint,
  printing = false,
  total,
  cashAmount = 0,
  cashlessAmount = 0,
  deferredAmount = 0,
  amountReceived = 0,
  change = 0,
  saleId,
  blockEnterCloseUntil = 0,
}: any) => {
  const dispatch = useDispatch() as any;
  const [isTotalExpanded, setIsTotalExpanded] = useState(true);
  const [isReceivedExpanded, setIsReceivedExpanded] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const safeTotal = toMoney(total);
  const safeCash = toMoney(cashAmount);
  const safeCashless = toMoney(cashlessAmount);
  const safeDeferred = toMoney(deferredAmount);
  const safeReceived = toMoney(amountReceived);
  const safeChange = toMoney(change);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (open && e.key === "Enter") {
        if (Date.now() < blockEnterCloseUntil) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        onClose();
      }
    };

    if (open) {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [open, onClose, blockEnterCloseUntil]);

  const downloadBlob = (blob, filename) => {
    if (typeof window === "undefined" || !window.URL || !window.document) {
      throw new Error("Браузерное окружение недоступно");
    }
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadInvoice = async () => {
    if (!saleId) {
      alert("ID продажи не найден");
      return;
    }

    setDownloadingInvoice(true);
    try {
      const result = await dispatch(getInvoiceJson(saleId));
      if (getInvoiceJson.fulfilled.match(result)) {
        const invoiceData = result.payload;

        if (!invoiceData) {
          throw new Error("Нет данных для генерации PDF");
        }

        // PDF-стек должен попадать в chunk только по клику "Скачать накладную".
        const [{ pdf }, { default: InvoicePdfDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("@pages/documents/ui/components/InvoicePdfDocument"),
        ]);

        const blob = await pdf(<InvoicePdfDocument data={invoiceData} />).toBlob();

        const fileName = `invoice_${
          invoiceData?.document?.number || saleId
        }.pdf`;
        downloadBlob(blob, fileName);
      } else {
        throw new Error("Не удалось загрузить данные накладной");
      }
    } catch (err: any) {
      console.error("Скачивание накладной не удалось:", err);
      alert(
        err?.message ||
          err?.detail ||
          "Не удалось скачать накладную. Попробуйте позже.",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (!open) return null;

  return (
    <div className="success-payment-modal-overlay" onClick={onClose}>
      <div
        className="success-payment-modal"
        onClick={(e: any) => e.stopPropagation()}
      >
        <button className="success-payment-modal__close" onClick={onClose}>
          <X size={24} />
        </button>

        <h2 className="success-payment-modal__title">Продажа прошла успешно</h2>

        <div className="success-payment-modal__summary">
          <div
            className="success-payment-modal__summary-header"
            onClick={() => setIsTotalExpanded(!isTotalExpanded)}
          >
            <span className="success-payment-modal__summary-label">Итог</span>
            <div className="success-payment-modal__summary-value-wrapper">
              <span className="success-payment-modal__summary-value">
                {safeTotal.toFixed(2)}сом
              </span>
              {isTotalExpanded ? (
                <ChevronUp size={18} className="success-payment-modal__icon" />
              ) : (
                <ChevronDown
                  size={18}
                  className="success-payment-modal__icon"
                />
              )}
            </div>
          </div>

          {isTotalExpanded && (
            <div className="success-payment-modal__summary-details">
              <div className="success-payment-modal__summary-item">
                <span className="success-payment-modal__summary-label">
                  Наличные
                </span>
                <span className="success-payment-modal__summary-value">
                  {safeCash.toFixed(2)}сом
                </span>
              </div>

              <div className="success-payment-modal__summary-item">
                <span className="success-payment-modal__summary-label">
                  Безналичные
                </span>
                <span className="success-payment-modal__summary-value">
                  {safeCashless.toFixed(2)}сом
                </span>
              </div>

              <div className="success-payment-modal__summary-item">
                <span className="success-payment-modal__summary-label">
                  Отсрочка
                </span>
                <span className="success-payment-modal__summary-value">
                  {safeDeferred.toFixed(2)}сом
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="success-payment-modal__received">
          <div
            className="success-payment-modal__received-header"
            onClick={() => setIsReceivedExpanded(!isReceivedExpanded)}
          >
            <span className="success-payment-modal__received-label">
              Принято
            </span>
            <div className="success-payment-modal__received-value-wrapper">
              <span className="success-payment-modal__received-value">
                {safeReceived.toFixed(2)}сом
              </span>
              {isReceivedExpanded ? (
                <ChevronUp size={18} className="success-payment-modal__icon" />
              ) : (
                <ChevronDown
                  size={18}
                  className="success-payment-modal__icon"
                />
              )}
            </div>
          </div>

          {isReceivedExpanded && (
            <div className="success-payment-modal__received-details">
              <div className="success-payment-modal__summary-item">
                <span className="success-payment-modal__summary-label">
                  Наличные
                </span>
                <span className="success-payment-modal__summary-value">
                  {safeReceived.toFixed(2)}сом
                </span>
              </div>
            </div>
          )}
        </div>

        {safeChange > 0 && (
          <div className="success-payment-modal__change">
            <div className="success-payment-modal__change-label">СДАЧА:</div>
            <div className="success-payment-modal__change-value">
              {safeChange.toFixed(2)} сом
            </div>
          </div>
        )}

        <div className="success-payment-modal__actions">
          {typeof onPrint === "function" && (
            <button
              className="success-payment-modal__print-btn"
              onClick={onPrint}
              disabled={printing}
              type="button"
            >
              <Printer size={18} />
              {printing ? "Печать..." : "ПЕЧАТЬ ЧЕКА"}
            </button>
          )}
          {saleId && (
            <button
              className="success-payment-modal__download-btn"
              onClick={handleDownloadInvoice}
              disabled={downloadingInvoice}
              type="button"
            >
              <Download size={18} />
              {downloadingInvoice ? "Скачивание..." : "СКАЧАТЬ НАКЛАДНУЮ"}
            </button>
          )}
          <button
            type="button"
            className="success-payment-modal__close-btn"
            onClick={onClose}
          >
            ЗАКРЫТЬ{" "}
            <span className="success-payment-modal__enter-hint">[ENTER]</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessPaymentModal;
