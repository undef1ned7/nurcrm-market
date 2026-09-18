import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  toYYYYMMDD,
  formatDateDDMMYYYY,
  toNumber,
  toDecimalString,
  getInstallmentRemaining,
  getInstallmentStatus,
  dealHasPayments,
  resolveDealSaleId,
} from "../clientDetails.helpers";
import ReceiptPreviewModal from "@pages/documents/ui/components/ReceiptPreviewModal";
import { useClient } from "@entities/client";
import { postCashflowIfNeeded } from "@entities/cash";
import { useUser } from "@entities/user";
import {
  buildExpenseVariableRouting,
  buildPosRoutingFromUser,
} from "@shared/lib/tools/cashboxResolution";
import {
  DEBT_PAYMENT_BANKS,
  DEBT_PAY_BANK_DEFAULT,
  resolveDebtPaymentMethod,
  debtPaymentMethodLabel,
  type DebtPayMethod,
} from "@shared/lib/tools/debtPaymentMethod";
import {
  deleteDebt,
  getClientDealDetail,
  payDebtDeal,
  refundDeal,
  updateDealDetail,
} from "@entities/client";
import AlertModal from "@shared/ui/AlertModal/AlertModal";
import {
  Wallet,
  X,
  Pencil,
  Trash2,
  Banknote,
  Landmark,
  Check,
  ChevronDown,
  Receipt,
} from "lucide-react";
import { ThemeModeContext } from "@shared/theme/ThemeModeProvider";
import "../ClientModals.scss";
import ClientModalPortal from "./ClientModalPortal";

const DebtModal = ({ id, onClose, onChanged, clientType }) => {
  const dispatch = useDispatch() as any;
  const { t } = useTranslation();
  const { mode } = useContext(ThemeModeContext);
  const { dealDetail } = useClient();
  const { profile, company } = useUser();
  const { id: clientId } = useParams();

  const isSupplier = String(clientType || "").toLowerCase() === "suppliers";

  const instStatusLabel = (status: { key: string; label: string }) => {
    const map: Record<string, string> = {
      paid: t("crm.clients.details.instStatusPaid"),
      partial: t("crm.clients.details.instStatusPartial"),
      overdue: t("crm.clients.details.instStatusOverdue"),
      unpaid: t("crm.clients.details.instStatusUnpaid"),
    };
    return map[status.key] || status.label;
  };

  const [state, setState] = useState({
    amount: "",
    debt_days: "",
    first_due_date: "",
    title: "",
    note: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [cashData, setCashData] = useState(() => ({
    cashbox: "",
    type: isSupplier ? "expense" : "income",
    name: "",
    amount: "",
  }));
  const [alert, setAlert] = useState<any>({
    open: false,
    type: "error",
    message: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<any>({
    open: false,
    message: "",
    onConfirm: null,
  });

  const [installmentEdits, setInstallmentEdits] = useState<any>({});
  const [paymentAmounts, setPaymentAmounts] = useState<any>({});

  // Способ оплаты выбирается прямо в диалоге подтверждения оплаты.
  const [payMethod, setPayMethod] = useState<DebtPayMethod>("cash");
  const [payBank, setPayBank] = useState(DEBT_PAY_BANK_DEFAULT);
  // Диалог подтверждения хранит замороженный onConfirm-замыкание, поэтому
  // актуальный выбор способа читаем из ref, а не из stale-переменной.
  const paySelRef = useRef<{ method: DebtPayMethod; bank: string }>({
    method: "cash",
    bank: DEBT_PAY_BANK_DEFAULT,
  });
  const choosePayMethod = (m: DebtPayMethod) => {
    paySelRef.current.method = m;
    setPayMethod(m);
  };
  const choosePayBank = (b: string) => {
    paySelRef.current.bank = b;
    setPayBank(b);
  };
  const currentPaymentMethod = () =>
    resolveDebtPaymentMethod(paySelRef.current.method, paySelRef.current.bank);
  const currentPaymentMethodLabel = () =>
    debtPaymentMethodLabel(paySelRef.current.method, paySelRef.current.bank);

  const renderPayMethodPicker = () => (
    <div className="paymethod">
      <div className="paymethod__title">
        {t("crm.clients.details.payMethodTitle")}
      </div>
      <div className="paymethod__opts">
        <button
          type="button"
          className={`paymethod__opt${
            payMethod === "cash" ? " paymethod__opt--active" : ""
          }`}
          aria-pressed={payMethod === "cash"}
          onClick={() => choosePayMethod("cash")}
        >
          <Banknote className="paymethod__opt-icon" size={20} />
          <span className="paymethod__opt-label">
            {t("crm.clients.details.methodCash")}
          </span>
          <Check className="paymethod__opt-check" size={14} />
        </button>
        <button
          type="button"
          className={`paymethod__opt${
            payMethod === "transfer" ? " paymethod__opt--active" : ""
          }`}
          aria-pressed={payMethod === "transfer"}
          onClick={() => choosePayMethod("transfer")}
        >
          <Landmark className="paymethod__opt-icon" size={20} />
          <span className="paymethod__opt-label">
            {t("crm.clients.details.methodTransfer")}
          </span>
          <Check className="paymethod__opt-check" size={14} />
        </button>
      </div>
      {payMethod === "transfer" && (
        <div className="paymethod__bank">
          <Landmark className="paymethod__bank-icon" size={16} />
          <select
            className="paymethod__bank-select"
            aria-label={t("crm.clients.details.bank")}
            value={payBank}
            onChange={(e) => choosePayBank(e.target.value)}
          >
            {DEBT_PAYMENT_BANKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="paymethod__bank-caret" size={16} />
        </div>
      )}
    </div>
  );

  useEffect(() => {
    dispatch(getClientDealDetail({ clientId, dealId: id }));
  }, [id, dispatch, clientId]);

  // Для поставщиков оплата долга должна идти как расход, для клиентов — как приход
  useEffect(() => {
    setCashData((prev: any) => ({
      ...prev,
      type: isSupplier ? "expense" : "income",
    }));
  }, [isSupplier]);

  useEffect(() => {
    if (dealDetail) {
      setState({
        amount: dealDetail.amount != null ? String(dealDetail.amount) : "",
        debt_days:
          dealDetail.debt_days != null
            ? String(dealDetail.debt_days)
            : dealDetail.debt_months != null
              ? String(Number(dealDetail.debt_months) * 30)
              : "",
        first_due_date: dealDetail.first_due_date
          ? toYYYYMMDD(dealDetail.first_due_date)
          : "",
        title: dealDetail.title || "",
        note: dealDetail.note || "",
      });
      setInstallmentEdits({});
      setPaymentAmounts({});
    }
  }, [dealDetail]);

  const hasPayments = useMemo(() => dealHasPayments(dealDetail), [dealDetail]);

  const installments = useMemo(
    () =>
      Array.isArray(dealDetail?.installments) ? dealDetail.installments : [],
    [dealDetail],
  );

  const firstDueDate =
    dealDetail?.first_due_date ?? installments[0]?.due_date ?? null;
  const counterpartyName =
    String(dealDetail?.client_full_name || "").trim() ||
    t("crm.clients.details.unknownCounterparty");

  useEffect(() => {
    setState((prev: any) => ({
      ...prev,
      amount: dealDetail?.debt_amount,
    }));
  }, [dealDetail]);

  const amountNum = toNumber(isEditing ? state.amount : dealDetail?.amount);
  const debtDaysNum = toNumber(
    isEditing ? state.debt_days : dealDetail?.debt_days,
  );

  const dailyPayment = isEditing
    ? Number.isFinite(amountNum) &&
      Number.isFinite(debtDaysNum) &&
      debtDaysNum > 0
      ? (amountNum / debtDaysNum).toFixed(2)
      : "—"
    : (dealDetail?.daily_payment ?? dealDetail?.monthly_payment ?? "—");

  const onChange = (e: any) => {
    const { name, value } = e.target;
    setState((prev: any) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async () => {
    try {
      const payload: any = hasPayments
        ? {
            title: String(state.title || "").trim(),
            note: String(state.note || "").trim(),
          }
        : {
            title: String(state.title || dealDetail?.title || "").trim(),
            note: String(state.note || "").trim(),
            amount: Number(state.amount) || 0,
            debt_days: Number(state.debt_days) || 0,
            ...(state.first_due_date
              ? { first_due_date: toYYYYMMDD(state.first_due_date) }
              : {}),
          };

      if (!hasPayments && Array.isArray(installments) && installments.length) {
        const installmentsPayload = installments.map((p: any) => {
          const edit = installmentEdits[p.number] || {};
          const rawAmount =
            edit.amount !== undefined && edit.amount !== null
              ? edit.amount
              : p.amount;
          const rawDate =
            edit.due_date !== undefined && edit.due_date !== null
              ? edit.due_date
              : p.due_date;
          const parsedAmount = Number(
            String(rawAmount).toString().replace(",", "."),
          );
          return {
            number: p.number,
            amount: Number.isFinite(parsedAmount)
              ? parsedAmount.toFixed(2)
              : Number(p.amount || 0).toFixed(2),
            due_date: toYYYYMMDD(rawDate),
          };
        });
        payload.auto_schedule = true;
        payload.installments = installmentsPayload;
      }

      await dispatch(
        updateDealDetail({
          id,
          data: payload,
          clientId,
        }),
      ).unwrap();

      onChanged?.();
      dispatch(getClientDealDetail({ clientId, dealId: id }));
      setIsEditing(false);
      setInstallmentEdits({});
    } catch (e: any) {
      console.error(e);
      setAlert({
        open: true,
        type: "error",
        message: t("crm.clients.details.saveChangesError"),
      });
    }
  };

  const onPayDeal = async (data: any) => {
    try {
      if (data.installment_id) {
        const installment = installments.find(
          (i: any) => i.id === data.installment_id,
        );
        if (installment && installment.paid_on) {
          return;
        }
      }

      if (!data.idempotency_key) {
        data.idempotency_key = crypto.randomUUID();
      }

      await dispatch(payDebtDeal({ id, clientId, data })).unwrap();
      onChanged?.();
      dispatch(getClientDealDetail({ clientId, dealId: id }));
    } catch (e: any) {
      console.error(e);
      setAlert({
        open: true,
        type: "error",
        message: t("crm.clients.details.paymentError"),
      });
    }
  };

  const onRefundDeal = async (
    installment: any,
    refundAmount: any = undefined,
  ) => {
    try {
      const paid = Number(installment?.paid_amount || 0);
      if (paid <= 0) return;

      const data: any = {
        idempotency_key: crypto.randomUUID(),
        installment_id: installment.id,
      };
      if (refundAmount != null && refundAmount !== "") {
        data.amount = toDecimalString(refundAmount);
      }

      await dispatch(refundDeal({ id, clientId, data })).unwrap();
      onChanged?.();
      dispatch(getClientDealDetail({ clientId, dealId: id }));
    } catch (e: any) {
      console.error(e);
      setAlert({
        open: true,
        type: "error",
        message: t("crm.clients.details.refundError"),
      });
    }
  };

  const remainingDebtNum = toNumber(dealDetail?.remaining_debt);

  // Взносы, которые ещё не закрыты полностью — их и оплачиваем при «Оплатить весь долг».
  const pendingInstallments = useMemo(
    () =>
      installments.filter(
        (p: any) => !p.paid_on && getInstallmentRemaining(p) > 0,
      ),
    [installments],
  );

  const [payingAll, setPayingAll] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const linkedSaleId = useMemo(
    () => resolveDealSaleId(dealDetail),
    [dealDetail],
  );

  const onPayFullDebt = () => {
    if (payingAll || pendingInstallments.length === 0) return;
    const total = pendingInstallments.reduce(
      (sum: number, p: any) => sum + getInstallmentRemaining(p),
      0,
    );
    if (total <= 0) return;

    setConfirmDialog({
      open: true,
      kind: "pay",
      message: t("crm.clients.details.payFullConfirm", {
        amount: total.toFixed(2),
        count: pendingInstallments.length,
      }),
      onConfirm: async () => {
        const payMethodApi = currentPaymentMethod();
        const payMethodLbl = currentPaymentMethodLabel();
        setConfirmDialog({ open: false, message: "", onConfirm: null });
        setPayingAll(true);

        // Оплачиваем каждый ещё не закрытый взнос отдельным вызовом того же
        // эндпоинта, что и кнопка «Оплатить» в строке графика — контракт
        // pay/ рассчитан именно на installment_id, «оплату всей сделки одним
        // запросом» бэк сегодня не поддерживает (см. документацию для бэка).
        const routing = isSupplier
          ? buildExpenseVariableRouting()
          : buildPosRoutingFromUser(profile, company);
        const today = toYYYYMMDD(new Date());
        let paidCount = 0;

        for (const p of pendingInstallments) {
          const remaining = getInstallmentRemaining(p);
          if (remaining <= 0) continue;
          try {
            await dispatch(
              payDebtDeal({
                id,
                clientId,
                data: {
                  idempotency_key: crypto.randomUUID(),
                  installment_id: p.id,
                  date: today,
                  note: "",
                  payment_method: payMethodApi,
                  ...routing,
                },
              }),
            ).unwrap();
            paidCount += 1;
            void postCashflowIfNeeded(
              dispatch,
              {
                type: cashData.type,
                name: t("crm.clients.details.debtPaymentNameMethod", {
                  name: counterpartyName,
                  n: p.number,
                  method: payMethodLbl,
                }),
                amount: remaining.toFixed(2),
                source_cashbox_flow_id: p.number,
                source_business_operation_id: t(
                  "crm.clients.details.debtPayment",
                ),
                payment_method: payMethodApi,
              },
              { warnOnFailure: true, failureContext: "debt" },
            );
          } catch (e: any) {
            console.error(e);
            break;
          }
        }

        setPayingAll(false);
        onChanged?.();
        dispatch(getClientDealDetail({ clientId, dealId: id }));

        if (paidCount < pendingInstallments.length) {
          setAlert({
            open: true,
            type: "error",
            message:
              paidCount > 0
                ? t("crm.clients.details.payAllPaymentsPartial", {
                    paid: paidCount,
                    total: pendingInstallments.length,
                  })
                : t("crm.clients.details.paymentError"),
          });
        }
      },
    });
  };

  const onDeleteDebts = async (debtId: any) => {
    setConfirmDialog({
      open: true,
      message: t("crm.clients.details.deleteDealConfirm"),
      onConfirm: async () => {
        try {
          await dispatch(deleteDebt({ id: debtId, clientId })).unwrap();
          onClose();
          onChanged?.();
          setConfirmDialog({ open: false, message: "", onConfirm: null });
        } catch (e: any) {
          console.log(e);
          setConfirmDialog({ open: false, message: "", onConfirm: null });
        }
      },
    });
  };

  if (!id) return null;

  return (
    <ClientModalPortal wrapperId="client-debt-modal">
      <div className="cmx__overlay" data-theme={mode} onClick={onClose}>
        <div
          className="cmx__dialog cmx__dialog--xl"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="cmx__header">
            <div className="cmx__heading">
              <span className="cmx__heading-icon">
                <Wallet />
              </span>
              <div className="cmx__heading-text">
                <h3 className="cmx__title">
                  {t("crm.clients.details.debtModalTitle")}
                </h3>
                <p className="cmx__subtitle">
                  {dealDetail?.title || t("crm.clients.details.dealDetails")}
                </p>
              </div>
            </div>
            <div className="cmx__header-actions">
              {linkedSaleId != null ? (
                <button
                  type="button"
                  className="cmx__btn cmx__btn--secondary cmx__btn--sm"
                  onClick={() => setShowReceiptPreview(true)}
                >
                  <Receipt size={16} />
                  {t("crm.clients.details.viewReceipt", { id: linkedSaleId })}
                </button>
              ) : (
                <span
                  className="cmx__no-receipt-hint"
                  title={t("crm.clients.details.noLinkedReceiptHint")}
                >
                  <Receipt size={14} />
                  {t("crm.clients.details.noLinkedReceipt")}
                </span>
              )}
              <button
                className="cmx__close"
                onClick={onClose}
                aria-label={t("common.close")}
              >
                <X />
              </button>
            </div>
          </div>

          <div className="cmx__body">
            <div className="cmx__summary">
              <div className="cmx__summary-card cmx__summary-card--danger">
                <div className="cmx__summary-label">
                  {t("crm.clients.details.debtAmount")}
                </div>
                <div className="cmx__summary-value">
                  {dealDetail?.debt_amount ?? dealDetail?.amount ?? "—"}
                  <span>{t("common.currencySom")}</span>
                </div>
              </div>
              <div className="cmx__summary-card cmx__summary-card--success">
                <div className="cmx__summary-label">
                  {t("crm.clients.details.debtRemainder")}
                </div>
                <div className="cmx__summary-value">
                  {dealDetail?.remaining_debt ?? "—"}
                  <span>{t("common.currencySom")}</span>
                </div>
              </div>
              <div className="cmx__summary-card">
                <div className="cmx__summary-label">
                  {t("crm.clients.details.dailyPayment")}
                </div>
                <div className="cmx__summary-value">{dailyPayment}</div>
              </div>
            </div>

            {!isEditing && pendingInstallments.length > 0 && (
              <div className="cmx__pay-all">
                <button
                  type="button"
                  className="cmx__btn cmx__btn--primary"
                  onClick={onPayFullDebt}
                  disabled={payingAll}
                >
                  <Wallet size={16} />{" "}
                  {payingAll
                    ? t("crm.clients.details.paying")
                    : t("crm.clients.details.payFullDebtAmount", {
                        amount: remainingDebtNum.toFixed(2),
                      })}
                </button>
              </div>
            )}

            <div className="cmx__info-grid">
              <div className="cmx__info-item">
                <div className="cmx__info-label">
                  {t("crm.clients.fullName")}
                </div>
                <div className="cmx__info-value">
                  {dealDetail?.client_full_name ?? "—"}
                </div>
              </div>

              <div className="cmx__info-item">
                <div className="cmx__info-label">
                  {t("crm.clients.details.dealTitle")}
                </div>
                <div className="cmx__info-value">
                  {dealDetail?.title ?? "—"}
                </div>
              </div>

              <div className="cmx__info-item">
                <label className="cmx__info-label" htmlFor="debt-modal-amount">
                  {t("crm.clients.details.debtAmount")}
                </label>
                {isEditing && !hasPayments ? (
                  <input
                    id="debt-modal-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    name="amount"
                    className="cmx__input cmx__input--sm"
                    value={state.amount}
                    onChange={onChange}
                  />
                ) : (
                  <div className="cmx__info-value">
                    {dealDetail?.debt_amount ?? dealDetail?.amount ?? "—"}
                  </div>
                )}
              </div>

              <div className="cmx__info-item">
                <label
                  className="cmx__info-label"
                  htmlFor="debt-modal-debt_days"
                >
                  {t("crm.clients.details.debtDaysLabel")}
                </label>
                {isEditing && !hasPayments ? (
                  <input
                    id="debt-modal-debt_days"
                    type="number"
                    inputMode="numeric"
                    className="cmx__input cmx__input--sm"
                    step="1"
                    min="1"
                    name="debt_days"
                    value={state.debt_days}
                    onChange={onChange}
                  />
                ) : (
                  <div className="cmx__info-value">
                    {dealDetail?.debt_days ?? dealDetail?.debt_months ?? "—"}
                  </div>
                )}
              </div>

              <div className="cmx__info-item">
                <label
                  className="cmx__info-label"
                  htmlFor="debt-modal-first_due_date"
                >
                  {t("crm.clients.details.firstPaymentDate")}
                </label>
                {isEditing && !hasPayments ? (
                  <input
                    id="debt-modal-first_due_date"
                    type="date"
                    className="cmx__input cmx__input--sm"
                    name="first_due_date"
                    value={state.first_due_date}
                    onChange={onChange}
                  />
                ) : (
                  <div className="cmx__info-value">
                    {dealDetail?.first_due_date
                      ? formatDateDDMMYYYY(dealDetail.first_due_date)
                      : "—"}
                  </div>
                )}
              </div>

              {dealDetail?.prepayment !== "0.00" && (
                <div className="cmx__info-item">
                  <div className="cmx__info-label">
                    {t("crm.clients.details.prepayment")}
                  </div>
                  <div className="cmx__info-value">
                    {dealDetail?.prepayment ?? "—"}
                  </div>
                </div>
              )}

              {dealDetail?.note && (
                <div className="cmx__info-item cmx__info-item--full">
                  <div className="cmx__info-label">
                    {t("crm.clients.details.notes")}
                  </div>
                  <div className="cmx__info-value">{dealDetail.note}</div>
                </div>
              )}
            </div>

            {/* ===== График платежей (с сервера) ===== */}
            {installments.length > 0 && (
              <section>
                <div className="cmx__section-title">
                  {t("crm.clients.details.scheduleTitle")}
                </div>
                <div aria-live="polite">
                  <div className="cmx__table-wrap">
                    <table className="cmx__table" role="table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>
                            {t("crm.clients.details.colNo")}
                          </th>
                          <th style={{ textAlign: "left" }}>
                            {t("crm.clients.details.colDueDate")}
                          </th>
                          <th style={{ textAlign: "right" }}>
                            {t("common.amount")}
                          </th>
                          <th style={{ textAlign: "right" }}>
                            {t("crm.clients.details.remainderLabel")}
                          </th>
                          <th style={{ textAlign: "left" }}>
                            {t("common.status")}
                          </th>
                          <th style={{ textAlign: "right" }}>
                            {t("crm.clients.details.colPaidOn")}
                          </th>
                          <th style={{ textAlign: "right" }}>
                            {t("crm.clients.details.colPaymentAmount")}
                          </th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((p: any) => {
                          const instStatus = getInstallmentStatus(p);
                          const isFullyPaid = instStatus.key === "paid";
                          const remaining = getInstallmentRemaining(p);
                          const edit = installmentEdits[p.number] || {};

                          const amountInputValue =
                            edit.amount !== undefined && edit.amount !== null
                              ? edit.amount
                              : p.amount;

                          const dueDateInputValue =
                            edit.due_date !== undefined &&
                            edit.due_date !== null
                              ? edit.due_date
                              : toYYYYMMDD(p.due_date);

                          return (
                            <tr
                              key={p.number}
                              className={
                                isFullyPaid
                                  ? "cmx__table-row--paid"
                                  : instStatus.key === "overdue"
                                    ? "cmx__table-row--overdue"
                                    : undefined
                              }
                              aria-checked={isFullyPaid}
                            >
                              <td style={{ textAlign: "left" }}>{p.number}</td>

                              {/* Срок оплаты (редактируемый) */}
                              <td style={{ textAlign: "left" }}>
                                {isEditing && !hasPayments ? (
                                  <input
                                    type="date"
                                    className="cmx__input cmx__input--sm"
                                    value={dueDateInputValue || ""}
                                    onChange={(e) =>
                                      setInstallmentEdits((prev: any) => ({
                                        ...prev,
                                        [p.number]: {
                                          ...prev[p.number],
                                          due_date: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                ) : (
                                  formatDateDDMMYYYY(p.due_date)
                                )}
                              </td>

                              {/* Сумма (редактируемая) */}
                              <td style={{ textAlign: "right" }}>
                                {isEditing && !hasPayments ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="cmx__input cmx__input--sm"
                                    value={amountInputValue}
                                    onChange={(e) =>
                                      setInstallmentEdits((prev: any) => ({
                                        ...prev,
                                        [p.number]: {
                                          ...prev[p.number],
                                          amount: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                ) : (
                                  p.amount
                                )}
                              </td>

                              {/* Остаток после платежа (сервера) */}
                              <td style={{ textAlign: "right" }}>
                                {p.balance_after}
                              </td>

                              <td style={{ textAlign: "left" }}>
                                <span
                                  className={`cmx__badge cmx__badge--${instStatus.key}`}
                                >
                                  {instStatusLabel(instStatus)}
                                </span>
                              </td>

                              <td style={{ textAlign: "right" }}>
                                {p.paid_on
                                  ? formatDateDDMMYYYY(p.paid_on)
                                  : "—"}
                              </td>

                              {/* Сумма оплаты (фактический платеж сейчас) */}
                              <td style={{ textAlign: "right" }}>
                                {isFullyPaid ? (
                                  <span
                                    title={t(
                                      "crm.clients.details.paymentAlreadyDone",
                                    )}
                                  >
                                    —
                                  </span>
                                ) : (
                                  <>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="cmx__input cmx__input--sm cmx__num"
                                      style={{
                                        width: "130px",
                                        textAlign: "right",
                                      }}
                                      value={
                                        paymentAmounts[p.number] !== undefined
                                          ? paymentAmounts[p.number]
                                          : ""
                                      }
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setPaymentAmounts((prev: any) => ({
                                          ...prev,
                                          [p.number]: value,
                                        }));
                                      }}
                                      placeholder={
                                        remaining > 0
                                          ? t(
                                              "crm.clients.details.remainderPlaceholder",
                                              { amount: remaining.toFixed(2) },
                                            )
                                          : t(
                                              "crm.clients.details.fullAmountPlaceholder",
                                              { amount: p.amount },
                                            )
                                      }
                                    />
                                    {p.paid_amount &&
                                      Number(p.paid_amount) > 0 && (
                                        <div className="cmx__paid-hint">
                                          {t("crm.clients.details.alreadyPaid")}:{" "}
                                          {Number(p.paid_amount).toFixed(2)}
                                        </div>
                                      )}
                                  </>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {isFullyPaid ? (
                                  <span
                                    title={t(
                                      "crm.clients.details.paymentAlreadyDone",
                                    )}
                                  >
                                    {t("crm.clients.details.paidMark")}
                                  </span>
                                ) : remaining > 0 ? (
                                  <button
                                    className="cmx__btn cmx__btn--primary cmx__btn--sm"
                                    disabled={payingAll}
                                    onClick={() => {
                                      const userEnteredAmount =
                                        paymentAmounts[p.number] !==
                                          undefined &&
                                        paymentAmounts[p.number] !== ""
                                          ? Number(paymentAmounts[p.number])
                                          : null;

                                      const _fullAmount = Number(p.amount);
                                      const _alreadyPaid = Number(
                                        p.paid_amount || 0,
                                      );
                                      const remainingAmount =
                                        getInstallmentRemaining(p);

                                      if (remainingAmount <= 0) {
                                        setAlert({
                                          open: true,
                                          type: "error",
                                          message: t(
                                            "crm.clients.details.installmentPaid",
                                          ),
                                        });
                                        return;
                                      }

                                      let paymentAmount;
                                      let shouldSendAmount = false;

                                      if (userEnteredAmount !== null) {
                                        if (
                                          !Number.isFinite(userEnteredAmount) ||
                                          userEnteredAmount <= 0
                                        ) {
                                          setAlert({
                                            open: true,
                                            type: "error",
                                            message: t(
                                              "crm.clients.details.enterValidAmount",
                                            ),
                                          });
                                          return;
                                        }
                                        if (
                                          userEnteredAmount > remainingAmount
                                        ) {
                                          setAlert({
                                            open: true,
                                            type: "error",
                                            message: t(
                                              "crm.clients.details.amountExceedsRemainder",
                                              {
                                                amount:
                                                  remainingAmount.toFixed(2),
                                              },
                                            ),
                                          });
                                          return;
                                        }
                                        paymentAmount = userEnteredAmount;
                                        shouldSendAmount =
                                          paymentAmount < remainingAmount;
                                      } else {
                                        paymentAmount = remainingAmount;
                                        shouldSendAmount = false;
                                      }

                                      setConfirmDialog({
                                        open: true,
                                        kind: "pay",
                                        message: t(
                                          "crm.clients.details.confirmPayment",
                                          { amount: paymentAmount.toFixed(2) },
                                        ),
                                        onConfirm: () => {
                                          const payMethodApi =
                                            currentPaymentMethod();
                                          const payMethodLbl =
                                            currentPaymentMethodLabel();
                                          const paymentData: any = {
                                            idempotency_key:
                                              crypto.randomUUID(),
                                            installment_id: p.id, // Используем ID взноса
                                            date: toYYYYMMDD(new Date()),
                                            note: "",
                                            payment_method: payMethodApi,
                                            ...(isSupplier
                                              ? buildExpenseVariableRouting()
                                              : buildPosRoutingFromUser(
                                                  profile,
                                                  company,
                                                )),
                                          };

                                          if (shouldSendAmount) {
                                            paymentData.amount =
                                              paymentAmount.toFixed(2);
                                          }

                                          onPayDeal(paymentData);
                                          void postCashflowIfNeeded(
                                            dispatch,
                                            {
                                              type: cashData.type,
                                              name: t(
                                                "crm.clients.details.debtPaymentNameMethod",
                                                {
                                                  name: counterpartyName,
                                                  n: p.number,
                                                  method: payMethodLbl,
                                                },
                                              ),
                                              amount: paymentAmount.toFixed(2),
                                              source_cashbox_flow_id: p.number,
                                              source_business_operation_id: t(
                                                "crm.clients.details.debtPayment",
                                              ),
                                              payment_method: payMethodApi,
                                            },
                                            {
                                              warnOnFailure: true,
                                              failureContext: "debt",
                                            },
                                          );
                                          setPaymentAmounts((prev: any) => {
                                            const next = { ...prev };
                                            delete next[p.number];
                                            return next;
                                          });
                                          setConfirmDialog({
                                            open: false,
                                            message: "",
                                            onConfirm: null,
                                          });
                                        },
                                      });
                                    }}
                                  >
                                    {t("crm.clients.details.payBtn")}
                                  </button>
                                ) : Number(p.paid_amount || 0) > 0 ? (
                                  <button
                                    type="button"
                                    className="cmx__btn cmx__btn--secondary cmx__btn--sm"
                                    onClick={() => {
                                      setConfirmDialog({
                                        open: true,
                                        message: t(
                                          "crm.clients.details.refundInstallmentConfirm",
                                          { n: p.number },
                                        ),
                                        onConfirm: () => {
                                          onRefundDeal(p);
                                          setConfirmDialog({
                                            open: false,
                                            message: "",
                                            onConfirm: null,
                                          });
                                        },
                                      });
                                    }}
                                  >
                                    {t("crm.clients.details.refundBtn")}
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      <tfoot>
                        <tr>
                          <td colSpan={2} style={{ fontWeight: 600 }}>
                            {t("crm.clients.details.totalWord")}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {dealDetail?.debt_amount ?? "—"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {installments[installments.length - 1]
                              ?.balance_after ?? "0.00"}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                    {firstDueDate && (
                      <p className="cmx__schedule-foot-hint">
                        {t("crm.clients.details.firstPaymentHint", {
                          date: formatDateDDMMYYYY(firstDueDate),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="cmx__footer">
            {!isEditing ? (
              <>
                <div className="cmx__footer-left">
                  <button
                    className="cmx__btn cmx__btn--danger"
                    onClick={() => onDeleteDebts(dealDetail?.id)}
                  >
                    <Trash2 /> {t("common.delete")}
                  </button>
                </div>
                <div className="cmx__footer-right">
                  <button
                    className="cmx__btn cmx__btn--ghost"
                    onClick={onClose}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="cmx__btn cmx__btn--primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil /> {t("common.edit")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="cmx__footer-left" />
                <div className="cmx__footer-right">
                  <button
                    className="cmx__btn cmx__btn--ghost"
                    onClick={() => {
                      setState({
                        amount:
                          dealDetail?.amount != null
                            ? String(dealDetail.amount)
                            : "",
                        debt_days:
                          dealDetail?.debt_days != null
                            ? String(dealDetail.debt_days)
                            : dealDetail?.debt_months != null
                              ? String(Number(dealDetail.debt_months) * 30)
                              : "",
                        first_due_date: dealDetail?.first_due_date
                          ? toYYYYMMDD(dealDetail.first_due_date)
                          : "",
                        title: dealDetail?.title || "",
                        note: dealDetail?.note || "",
                      });
                      setInstallmentEdits({});
                      setIsEditing(false);
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="cmx__btn cmx__btn--primary"
                    onClick={onSubmit}
                  >
                    {t("common.save")}
                  </button>
                </div>
              </>
            )}
          </div>

          <AlertModal
            open={alert.open}
            type={alert.type}
            title={"" as any}
            message={alert.message}
            okText="Ok"
            onClose={() => setAlert((a: any) => ({ ...a, open: false }))}
            onConfirm={undefined as any}
          />
          <AlertModal
            open={confirmDialog.open}
            type="info"
            title={"" as any}
            message={
              confirmDialog.kind === "pay" ? (
                <>
                  <span className="paymethod__confirm-text">
                    {confirmDialog.message}
                  </span>
                  {renderPayMethodPicker()}
                </>
              ) : (
                confirmDialog.message
              )
            }
            okText={t("crm.clients.details.confirm")}
            onClose={() =>
              setConfirmDialog({ open: false, message: "", onConfirm: null })
            }
            onConfirm={() => {
              if (confirmDialog.onConfirm) {
                confirmDialog.onConfirm();
              }
            }}
          />
        </div>
      </div>

      {showReceiptPreview && linkedSaleId != null && (
        <ReceiptPreviewModal
          receiptId={linkedSaleId}
          receiptData={undefined}
          onClose={() => setShowReceiptPreview(false)}
          onEdit={undefined}
        />
      )}
    </ClientModalPortal>
  );
};

export default DebtModal;
