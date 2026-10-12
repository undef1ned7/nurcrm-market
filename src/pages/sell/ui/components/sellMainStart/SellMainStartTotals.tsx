import { Pencil } from "lucide-react";
import type { SellMainStartVm } from "../../hooks/useSellMainStart";

type Props = {
  vm: any;
};

export default function SellMainStartTotals({ vm }: Props) {
  const {
    currentSubtotal,
    currentDiscount,
    currentTotal,
    start,
    isEmpty,
    setDiscountValue,
    setShowDiscountModal,
    setShowDebtModal,
    paymentMethod,
    setPaymentMethod,
    setCashReceived,
    setCashPaymentConfirmed,
    setShowCashModal,
    performCheckout,
    isPrinterConnected,
  } = vm;

  return (
    <div className="start__cart__body">
      <div className="start__total">
        <div className="start__total-top">
          <div className="start__total-row">
            <b>Без скидок</b>
            <p>{currentSubtotal}</p>
          </div>
          <div className="start__total-row" style={{ position: "relative" }}>
            <b>Скидка</b>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <p>{currentDiscount || 0}</p>
              <button
                type="button"
                onClick={() => {
                  setDiscountValue(currentDiscount || "");
                  setShowDiscountModal(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#007bff",
                  fontSize: "14px",
                }}
                title="Изменить скидку"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
          <div className="start__total-row">
            <b>ИТОГО</b>
            <h4>{currentTotal}</h4>
          </div>
        </div>

        <div className="start__total-bottom">
          <button
            disabled={!start?.id || !isEmpty}
            className="start__total-debt text-white disabled:bg-gray-300!"
            onClick={() => setShowDebtModal(true)}
          >
            Долг
          </button>

          <div className="start__total-row1">
            <button
              className={`start__total-pay disabled:bg-gray-300! ${
                paymentMethod === "cash" ? "active" : ""
              }`}
              onClick={() => {
                if (paymentMethod === "cash") {
                  setPaymentMethod(null);
                  setCashReceived("");
                  setCashPaymentConfirmed(false);
                } else {
                  setShowCashModal(true);
                }
              }}
              disabled={!start?.id || !isEmpty}
              style={{
                backgroundColor:
                  paymentMethod === "cash" ? "#f7d617" : undefined,
                border: paymentMethod === "cash" ? "2px solid #000" : undefined,
              }}
              title={
                paymentMethod === "cash"
                  ? "Нажмите, чтобы отменить выбор"
                  : "Оплата наличными"
              }
            >
              Наличными
            </button>
            <button
              className={`start__total-pay disabled:bg-gray-300! ${
                paymentMethod === "card" ? "active" : ""
              }`}
              onClick={() => {
                if (paymentMethod === "card") {
                  setPaymentMethod(null);
                } else {
                  setPaymentMethod("card");
                }
              }}
              disabled={!start?.id || !isEmpty}
              style={{
                backgroundColor:
                  paymentMethod === "card" ? "#f7d617" : undefined,
                border: paymentMethod === "card" ? "2px solid #000" : undefined,
              }}
              title={
                paymentMethod === "card"
                  ? "Нажмите, чтобы отменить выбор"
                  : "Оплата переводом"
              }
            >
              Переводом
            </button>
          </div>

          {paymentMethod && (
            <div className="start__total-row1" style={{ marginTop: "10px" }}>
              <button
                className="start__total-pay"
                onClick={() => performCheckout(true)}
                disabled={!start?.id || !isPrinterConnected}
                title={
                  !isPrinterConnected
                    ? "Принтер не подключен. Подключите принтер для печати чека."
                    : "Оформить и напечатать чек"
                }
              >
                Печать чека
              </button>
              <button
                className="start__total-pay"
                onClick={() => performCheckout(false)}
                disabled={!start?.id}
              >
                Без чека
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
