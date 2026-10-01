import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
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
import {
  calcShiftDrawerExpected,
  estimateShiftWarehouseDrain,
} from "@shared/lib/tools/cashboxResolution";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import "./CloseShiftPage.scss";

const CloseShiftPage = ({ onBack, shift: shiftProp }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { shifts, currentShift } = useShifts();
  // После закрытия родитель перестаёт считать смену открытой и отдаёт null, а
  // экран ещё показывает итог закрытия — держим смену, с которой страницу открыли.
  const [openedShift] = useState(shiftProp);
  const initialShift = shiftProp ?? openedShift;

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
        <div className="close-shift-page__error">{t("crm.cashier.shift.notFound")}</div>
      </div>
    );
  }

  const openingCash = parseFloat(String(shift.opening_cash || 0));
  const expectedCash = parseFloat(String(shift.expected_cash || 0));
  const salesTotal = parseFloat(String(shift.sales_total || 0));
  const cashSalesTotal = parseFloat(String(shift.cash_sales_total || 0));
  const noncashSalesTotal = parseFloat(String(shift.noncash_sales_total || 0));
  const drawerExpectedFromSales = calcShiftDrawerExpected(
    openingCash,
    cashSalesTotal,
  );
  // BE отдаёт non_drawer_expenses_total (закупки/расходы за смену, не влияющие
  // на ящик). Пока поля нет — оцениваем эвристикой по расхождению ledger vs
  // drawer. @see docs/backend/kassa/OPEN-QUESTIONS-2026-09-BE-RESPONSE.md Блок 5
  const warehouseDrainInShift =
    shift.non_drawer_expenses_total != null
      ? Math.max(0, parseFloat(String(shift.non_drawer_expenses_total)) || 0)
      : estimateShiftWarehouseDrain(openingCash, cashSalesTotal, expectedCash);
  const reconciliationExpected =
    shift.drawer_expected_cash != null
      ? parseFloat(String(shift.drawer_expected_cash))
      : drawerExpectedFromSales;
  const closingCashNum = parseFloat(String(closingCash || 0));
  const cashDiff = closingCashNum - reconciliationExpected;

  const handleCloseShift = async () => {
    if (isNaN(closingCashNum) || closingCashNum < 0) {
      showAlert("error", t("common.error"), t("crm.cashier.shift.alerts.invalidAmount"));
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
        expectedCash: reconciliationExpected,
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
        t("common.error"),
        error?.data?.detail ||
          error?.data?.closing_cash?.[0] ||
          error?.message ||
          t("crm.cashier.shift.alerts.closeFailed"),
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
          {closedSummary ? t("crm.cashier.shift.closedTitle") : t("crm.cashier.shift.closeTitle")}
        </h1>
      </div>

      <div className="close-shift-page__content">
        <div className="close-shift-page__card">
          {closedSummary ? (
            <>
              <div className="close-shift-page__icon close-shift-page__icon--success">
                <CheckCircle size={48} />
              </div>
              <h2 className="close-shift-page__card-title">{t("crm.cashier.shift.closedTitle")}</h2>

              <div className="close-shift-page__info-section">
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.closedOn")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(closedSummary.closingCash)}
                  </span>
                </div>
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.expectedCash")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(closedSummary.expectedCash)}
                  </span>
                </div>
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">{t("crm.cashier.shift.discrepancy")}</span>
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
                {t("crm.cashier.shift.done")}
              </button>
            </>
          ) : (
            <>
              <div className="close-shift-page__icon">
                <Wallet size={48} style={{ color: "#ef4444" }} />
              </div>
              <h2 className="close-shift-page__card-title">{t("crm.cashier.shift.finishTitle")}</h2>

              <div className="close-shift-page__info-section">
                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.openingAmountShort")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(openingCash)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.totalSales")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(salesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">{t("crm.cashier.shift.cashSales")}</span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(cashSalesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.cashlessSales")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(noncashSalesTotal)}
                  </span>
                </div>

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.drawerExpectedFromSales")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(drawerExpectedFromSales)}
                  </span>
                </div>

                {warehouseDrainInShift > 0 && (
                  <div className="close-shift-page__info-item close-shift-page__info-item--warning">
                    <span className="close-shift-page__info-label">
                      {t("crm.cashier.shift.warehouseDrainInShift")}
                    </span>
                    <span className="close-shift-page__info-value">
                      −{formatShiftMoney(warehouseDrainInShift)}
                    </span>
                  </div>
                )}

                <div className="close-shift-page__info-item">
                  <span className="close-shift-page__info-label">
                    {t("crm.cashier.shift.expectedCash")}
                  </span>
                  <span className="close-shift-page__info-value">
                    {formatShiftMoney(reconciliationExpected)}
                  </span>
                </div>
              </div>

              {warehouseDrainInShift > 0 && (
                <p className="close-shift-page__hint close-shift-page__hint--warning">
                  {t("crm.cashier.shift.warehouseDrainHint")}
                </p>
              )}

              <div className="close-shift-page__payments">
                <ShiftPaymentBreakdown
                  rows={paymentBreakdown}
                  loading={breakdownLoading}
                />
              </div>

              <div className="close-shift-page__input-wrapper">
                <label className="close-shift-page__label">
                  {t("crm.cashier.shift.closingAmountLabel")}
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
                  <div className="close-shift-page__diff-label">{t("crm.cashier.shift.discrepancy")}</div>
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
                {loading ? t("crm.cashier.shift.closing") : t("crm.cashier.shift.closeShift")}
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
