import { useEffect } from "react";

export function useSellMainStartHotkeys({
  start,
  lastScanTimeRef,
  showNewClientModal,
  showDebtModal,
  showCustomServiceModal,
  showDiscountModal,
  showCashModal,
  showPaymentChoiceModal,
  showReceiptChoiceModal,
  receiptWithCheck,
  setReceiptWithCheck,
  paymentMethod,
  paymentChoice,
  setPaymentChoice,
  setPaymentMethod,
  setCashReceived,
  setShowPaymentChoiceModal,
  setShowCashModal,
  setShowReceiptChoiceModal,
  setPendingCheckout,
  setCashPaymentConfirmed,
}) {
  // Глобальные горячие клавиши:
  // Enter — открыть модалку выбора оплаты, в модалке Enter подтверждает,
  // стрелка влево — наличные, стрелка вправо — перевод
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInputLike =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        e.target.isContentEditable;

      // Не перехватываем ввод в полях и когда открыты другие модалки
      if (
        isInputLike ||
        showNewClientModal ||
        showDebtModal ||
        showCustomServiceModal ||
        showDiscountModal ||
        showCashModal
      ) {
        return;
      }

      // Обработка модалки выбора чека (с чеком / без чека)
      if (showReceiptChoiceModal) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setReceiptWithCheck(true);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setReceiptWithCheck(false);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          setPendingCheckout({
            withReceipt: receiptWithCheck,
            paymentType: paymentMethod || "card",
          });
          setShowReceiptChoiceModal(false);
          setCashPaymentConfirmed(false);
          return;
        }
      }

      // Обработка модалки выбора способа оплаты
      if (showPaymentChoiceModal) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPaymentChoice("cash");
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPaymentChoice("card");
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (paymentChoice === "cash") {
            setPaymentMethod("cash");
            setCashReceived("");
            setShowPaymentChoiceModal(false);
            setShowCashModal(true);
          } else {
            setPaymentMethod("card");
            setShowPaymentChoiceModal(false);
            setReceiptWithCheck(true);
            setShowReceiptChoiceModal(true);
          }
          return;
        }
      }

      // Enter на главном экране: открываем модалку выбора способа оплаты
      // НО игнорируем Enter, если недавно было сканирование (в течение 500мс)
      if (e.key === "Enter") {
        const timeSinceLastScan = Date.now() - lastScanTimeRef.current;
        if (timeSinceLastScan < 500) {
          return;
        }
        e.preventDefault();
        if (!start?.id || !(start?.items || []).length) return;
        setPaymentChoice("cash");
        setShowPaymentChoiceModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
   
  }, [
    start?.id,
    start?.items,
    start?.total,
    showNewClientModal,
    showDebtModal,
    showCustomServiceModal,
    showDiscountModal,
    showCashModal,
    showPaymentChoiceModal,
    showReceiptChoiceModal,
    receiptWithCheck,
    paymentMethod,
    paymentChoice,
  ]);

}
