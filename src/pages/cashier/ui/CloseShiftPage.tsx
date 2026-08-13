import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { ArrowLeft, Wallet, AlertCircle, CheckCircle } from "lucide-react";
import {
  closeShiftAsync,
  fetchAllShiftSales,
  fetchShiftByIdAsync,
  formatShiftMoney,
  resolveShiftPaymentBreakdown,
  ShiftPaymentBreakdown,
} from "@entities/shift";
import { useShifts } from "@entities/shift";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import "./CloseShiftPage.scss";

const CloseShiftPage = ({ onBack, shift: initialShift }: any) => {
  const dispatch = useDispatch() as any;
  const { shifts, currentShift } = useShifts();

  const shift = React.useMemo(() => {
    if (currentShift?.id === initialShift?.id) {
      return currentShift;
    }
    const updatedShift = shifts.find((s) => s.id === initialShift?.id);
    return updatedShift || initialShift;
  }, [currentShift, shifts, initialShift]);

  const [closingCash, setClosingCash] = useState("");
  const [loading, setLoading] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [salesFallback, setSalesFallback] = useState<any[]>([]);
  const [closedSummary, setClosedSummary] = useState<any>(null);
  const [alertModal, setAlertModal] = useState({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertModal({
      open: true,
      type,
      title,
      message,
    });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (shift?.id) {
      dispatch(fetchShiftByIdAsync(shift.id));
    }
  }, [dispatch, shift?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadSales = async () => {
      if (!shift?.id) return;
      if (Array.isArray(shift?.payment_breakdown) && shift.payment_breakdown.length) {
        setSalesFallback([]);
        setBreakdownLoading(false);
        return;
      }
      setBreakdownLoading(true);
      try {
        const sales = await fetchAllShiftSales(shift.id);
        if (!cancelled) setSalesFallback(sales);
      } catch (error: any) {
        console.error("Не удалось загрузить продажи смены:", error);
        if (!cancelled) setSalesFallback([]);
      } finally {
        if (!cancelled) setBreakdownLoading(false);
      }
    };
    void loadSales();
    return () => {
      cancelled = true;
    };
  }, [shift?.id, shift?.payment_breakdown]);

  const paymentBreakdown = useMemo(
    () => resolveShiftPaymentBreakdown(shift, salesFallback),
    [shift, salesFallback],
  );

  if (!shift) {
    return (
      <div className="close-shift-page">
        <div className="close-shift-page__error">Смена не найдена</div>
      </div>
    );
  }

  const openingCash = parseFloat(String(shift.opening_cash || 0));
  const expectedCash = parseFloat(String(shift.expected_cash || 0));
  const salesTotal = parseFloat(String(shift.sales_total || 0));
  const cashSalesTotal = parseFloat(String(shift.cash_sales_total || 0));
  const noncashSalesTotal = parseFloat(String(shift.noncash_sales_total || 0));
  const closingCashNum = parseFloat(String(closingCash || 0));
  const cashDiff = closingCashNum - expectedCash;

  const handleCloseShift = async () => {
    if (isNaN(closingCashNum) || closingCashNum < 0) {
      showAlert("error", "Ошибка", "Пожалуйста, введите корректную сумму");
      return;
    }

    try {
      setLoading(true);
      const closedShift = await dispatch(
        closeShiftAsync({
          shiftId: shift.id,
          closingCash: closingCashNum,
        }),
      ).unwrap();

      setClosedSummary({
        closingCash: closingCashNum,
        expectedCash,
        cashDiff,
        breakdown: resolveShiftPaymentBreakdown(
          closedShift || shift,
          salesFallback,
        ),
      });
    } catch (error: any) {
      console.error("Ошибка при закрытии смены:", error);
      showAlert(
        "error",
        "Ошибка",
        error?.data?.detail ||
          error?.data?.closing_cash?.[0] ||
          error?.message ||
          "Не удалось закрыть смену",
      );
    } finally {
      setLoading(false);
    }
  };

  const diffClass =
    cashDiff === 0
      ? "close-shift-page__diff-value--zero"
      : cashDiff > 0
        ? "close-shift-page__diff-value--positive"
        : "close-shift-page__diff-value--negative";

  return (
    <div className="close-shift-page">
      <div className="close-shift-page__header">
        <button
          className="close-shift-page__back-btn"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="close-shift-page__title">
          {closedSummary ? "Смена закрыта" : "Закрытие смены"}
        </h1>
      </div>

      <div className="close-shift-page__content">
        <div className="close-shift-page__card">
          {closedSummary ? (
            <>
              <div className="close-shift-page__icon close-shift-page__icon--success">
                <CheckCircle size={48} />
              </div>
              <h2 className="close-shift-page__card-title">Смена закрыта</h2>

              <div className="close-shift-page__info-section">
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Касса закрыта на:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(closedSummary.closingCash)}
                  </span>
                </div>
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Ожидаемая сумма:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(closedSummary.expectedCash)}
                  </span>
                </div>
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">Расхождение:</span>
                  <span className="close-shift-page__info-value">
                    {closedSummary.cashDiff > 0 ? "+" : ""}
                    {formatShiftMoney(closedSummary.cashDiff)}
                  </span>
                </div>
              </div>

              <ShiftPaymentBreakdown rows={closedSummary.breakdown} />

              <button
                type="button"
                className="close-shift-page__submit-btn close-shift-page__submit-btn--done"
                onClick={onBack}
              >
                Готово
              </button>
            </>
          ) : (
            <>
              <div className="close-shift-page__icon">
                <Wallet size={48} style={{ color: "#ef4444" }} />
              </div>
              <h2 className="close-shift-page__card-title">Завершение смены</h2>

              <div className="close-shift-page__info-section">
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Начальная сумма:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(openingCash)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Продажи всего:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(salesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">Наличными:</span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(cashSalesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Безналичными:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(noncashSalesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    Ожидаемая сумма:
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(expectedCash)}
                  </span>
                </div>
              </div>

              <div className="close-shift-page__payments">
                <ShiftPaymentBreakdown
                  rows={paymentBreakdown}
                  loading={breakdownLoading}
                />
              </div>

              <div className="close-shift-page__input-wrapper">
                <label className="close-shift-page__label">
                  Фактическая сумма на кассе (сом) *
                </label>
                <input
                  type="number"
                  className="close-shift-page__input"
                  value={closingCash}
                  onChange={(e: any) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {closingCash && !isNaN(closingCashNum) && (
                <div className="close-shift-page__diff-section">
                  <div className="close-shift-page__diff-label">Расхождение:</div>
                  <div className={`close-shift-page__diff-value ${diffClass}`}>
                    <AlertCircle size={20} />
                    <span>
                      {cashDiff === 0
                        ? `✓ ${formatShiftMoney(0)}`
                        : `${cashDiff > 0 ? "+" : ""}${formatShiftMoney(cashDiff)}`}
                    </span>
                  </div>
                </div>
              )}

              <button
                className="close-shift-page__submit-btn"
                onClick={handleCloseShift}
                disabled={loading || !closingCash}
              >
                {loading ? "Закрытие..." : "Закрыть смену"}
              </button>
            </>
          )}
        </div>
      </div>

      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        okText="ОК"
        onClose={closeAlert}
        onConfirm={closeAlert}
      />
    </div>
  );
};

export default CloseShiftPage;
