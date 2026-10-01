import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import {
  productCheckout,
  getProductCheckout,
  createDeal,
  enqueuePendingDebtDeal,
  processPendingDebtDeals,
} from "@entities/sale";
import { postCashflowIfNeeded } from "@entities/cash";
import { useUser } from "@entities/user";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { notify } from "@shared/lib/notifications";
import { validateSplitAmounts } from "@shared/lib/tools/marketCashierSplitPayment";
import {
  checkPrinterConnection,
  ensurePrinterConnectedInteractively,
  enrichMarketReceiptPayload,
} from "@pages/sell/ui/services/printService";
import api from "@shared/api";
import { useMarketCashierSettings } from "@features/create-sale";
import { PAYMENT_BANKS } from "../paymentPage.banks";
import {
  buildCheckoutConsultantPayload,
  buildDebtSchedule,
  DEFAULT_DAY_INTERVAL,
  DEFAULT_MONTH_INTERVAL,
  defaultFirstDueDate,
  defaultIntervalForUnit,
  defaultScheduleCount,
  maxInstallmentsForUnit,
  maxIntervalForUnit,
  MAX_DAY_INTERVAL,
  MAX_MONTH_INTERVAL,
  normalizeScheduleInterval,
  scheduleInstallmentsCount,
  toDealInstallments,
  todayIsoDate,
  validateConsultantDraft,
  type DebtScheduleUnit,
} from "@entities/sale";
import {
  addCalendarDaysToIso,
  calcDaysUntilIsoDate,
  formatSplitAmount,
  getPaymentAmounts,
  getQuickSelectAmounts,
  mapBankToApiMethod,
  normalizeSplitAmountInput,
  printReceiptSmart,
  resolvePrepaymentApiMethod,
} from "../paymentPage.utils";
import type { PaymentPageProps } from "../paymentPage.types";
import { useCustomerDisplayPublisher } from "@features/customer-display";
import { usePaymentConsultant } from "./usePaymentConsultant";

export function usePaymentPage({
  cart,
  total,
  customer,
  onSelectCustomer,
  onComplete,
  customers = [],
  saleId,
  consultantDraft,
  onConsultantDraftChange,
  shiftId,
}: PaymentPageProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch() as any;
  const { company, profile } = useUser();
  const { debtScheduleVersion } = useMarketCashierSettings();
  const isDebtScheduleV2 = debtScheduleVersion === "v2";
  const consultant = usePaymentConsultant({
    total,
    branchId: profile?.active_branch || profile?.branch || company?.active_branch,
    consultantDraft,
    onConsultantDraftChange,
  });

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState(
    total ? total.toFixed(2) : "0.00",
  );
  const [withoutCheck, setWithoutCheck] = useState(() => {
    try {
      return localStorage.getItem("market_withoutCheck") === "true";
    } catch {
      return false;
    }
  });
  const [skipDrawerOpen, setSkipDrawerOpen] = useState(() => {
    try {
      return localStorage.getItem("market_skipDrawer") === "true";
    } catch {
      return false;
    }
  });
  const [scheduleUnit, setScheduleUnit] = useState<DebtScheduleUnit>("month");
  const [scheduleCount, setScheduleCount] = useState<number | "">(
    defaultScheduleCount("month"),
  );
  const [dayInterval, setDayInterval] = useState<number | "">(
    DEFAULT_MONTH_INTERVAL,
  );
  const [debtDays, setDebtDays] = useState<number | "">(30);
  const [deferredDueDate, setDeferredDueDate] = useState(() =>
    defaultFirstDueDate("month"),
  );
  const [deferredPrepaymentEnabled, setDeferredPrepaymentEnabled] =
    useState(false);
  const [deferredPrepaymentAmount, setDeferredPrepaymentAmount] = useState("");
  const [deferredPrepaymentMethod, setDeferredPrepaymentMethod] =
    useState("cash");
  const [deferredPrepaymentBank, setDeferredPrepaymentBank] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(customer);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [splitOnlineBank, setSplitOnlineBank] = useState("");
  const [splitOnlineAmount, setSplitOnlineAmount] = useState("");
  const [splitTransferAmount, setSplitTransferAmount] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [successEnterBlockedUntil, setSuccessEnterBlockedUntil] = useState(0);
  const [alertModal, setAlertModal] = useState<any>({
    open: false,
    type: "error",
    title: "",
    message: "",
  });

  const amountReceivedInputRef = useRef<any>(null);
  const deferredDueDateInputRef = useRef<any>(null);
  const payingInFlightRef = useRef(false);
  // Ключ идемпотентности на попытку оплаты — переживает ретраи (сетевой сбой,
  // 409 от бэка), но обнуляется при реальной смене интента (сумма/способ
  // оплаты/сумма к получению). См. docs/sale-flow-bugs.md, пункт 1, и
  // src/pages/sell/ui/RefundPurchase.tsx — тот же паттерн уже используется
  // для возвратов (idempotencyRef/buildSaleReturnSignature).
  const checkoutIdempotencyRef = useRef<{ signature: string; key: string } | null>(null);
  const acceptPaymentRef = useRef(async () => {});
  const showSuccessModalRef = useRef(false);
  const showCustomerModalRef = useRef(false);
  const alertModalOpenRef = useRef(false);
  const successEnterBlockedUntilRef = useRef(0);

  const showAlert = useCallback((type: any, title: any, message: any) => {
    setAlertModal({ open: true, type, title, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal((prev) => ({ ...prev, open: false }));
  }, []);

  const deferredPrepaymentValue = useMemo(() => {
    if (!deferredPrepaymentEnabled) return 0;
    const n = parseFloat(
      String(deferredPrepaymentAmount || "").replace(",", "."),
    );
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [deferredPrepaymentEnabled, deferredPrepaymentAmount]);

  // Чем внесена предоплата долга: "cash" | банк | "transfer". Уходит в
  // checkout как `prepayment_method` — иначе бэк считает `cash_received`
  // наличными и раздувает ожидаемую наличность смены.
  const deferredPrepaymentApiMethod = useMemo(
    () =>
      resolvePrepaymentApiMethod(
        deferredPrepaymentMethod,
        deferredPrepaymentBank,
      ),
    [deferredPrepaymentMethod, deferredPrepaymentBank],
  );
  const isCashlessPrepayment = deferredPrepaymentApiMethod !== "cash";

  const deferredSaleDebtRemaining = useMemo(
    () => Math.max(0, total - deferredPrepaymentValue),
    [total, deferredPrepaymentValue],
  );

  const customerDebt =
    selectedCustomer?.debt || selectedCustomer?.total_debt || 0;
  const totalDebt =
    paymentMethod === "deferred"
      ? deferredSaleDebtRemaining + customerDebt
      : customerDebt;

  const quickSelectAmounts = useMemo(
    () => getQuickSelectAmounts(total),
    [total],
  );

  const debtSchedule = useMemo(
    () =>
      buildDebtSchedule({
        remainingAmount: deferredSaleDebtRemaining,
        unit: scheduleUnit,
        // В режиме «по месяцам» scheduleCount — срок в месяцах (слайдер),
        // число платежей выводится из срока и интервала.
        count: scheduleInstallmentsCount(
          scheduleUnit,
          scheduleCount,
          dayInterval,
        ),
        firstDueDate: deferredDueDate,
        intervalDays:
          typeof dayInterval === "number"
            ? dayInterval
            : DEFAULT_DAY_INTERVAL,
        intervalMonths:
          typeof dayInterval === "number"
            ? dayInterval
            : DEFAULT_MONTH_INTERVAL,
      }),
    [
      dayInterval,
      deferredDueDate,
      deferredSaleDebtRemaining,
      scheduleCount,
      scheduleUnit,
    ],
  );

  const handleScheduleUnitChange = useCallback((unit: DebtScheduleUnit) => {
    setScheduleUnit(unit);
    setScheduleCount(defaultScheduleCount(unit));
    setDayInterval(defaultIntervalForUnit(unit));
    setDeferredDueDate(defaultFirstDueDate(unit));
  }, []);

  const handleSchedulePreset = useCallback((count: number) => {
    setScheduleCount(count);
  }, []);

  const handleDayIntervalChange = useCallback(
    (value: string) => {
      if (value === "") {
        setDayInterval("");
        return;
      }
      const numValue = parseInt(value, 10);
      if (Number.isNaN(numValue)) return;
      setDayInterval(normalizeScheduleInterval(scheduleUnit, numValue));
    },
    [scheduleUnit],
  );

  const handleDayIntervalBlur = useCallback(
    (value: string) => {
      const numValue = parseInt(value, 10);
      if (Number.isNaN(numValue) || numValue < 1) {
        setDayInterval(defaultIntervalForUnit(scheduleUnit));
        return;
      }
      setDayInterval(normalizeScheduleInterval(scheduleUnit, numValue));
    },
    [scheduleUnit],
  );

  const handleDayIntervalPreset = useCallback(
    (interval: number) => {
      setDayInterval(normalizeScheduleInterval(scheduleUnit, interval));
    },
    [scheduleUnit],
  );

  const setDebtDaysFromDate = useCallback((isoDate: string) => {
    if (!isoDate) return;
    setDeferredDueDate(isoDate);
    setDebtDays(calcDaysUntilIsoDate(isoDate));
  }, []);

  const setDebtDaysAndSyncDate = useCallback((days: number) => {
    const safeDays = Math.max(1, Number(days) || 1);
    setDebtDays(safeDays);
    setDeferredDueDate(addCalendarDaysToIso(safeDays));
  }, []);

  const handleDebtDaysChange = useCallback((value: string) => {
    if (value === "") {
      setDebtDays("");
      return;
    }
    const numValue = parseInt(value, 10);
    if (!Number.isNaN(numValue)) {
      setDebtDaysAndSyncDate(numValue);
    }
  }, [setDebtDaysAndSyncDate]);

  const handleDebtDaysBlur = useCallback(
    (value: string) => {
      const numValue = parseInt(value, 10);
      if (Number.isNaN(numValue) || numValue < 1) {
        setDebtDaysAndSyncDate(30);
      }
    },
    [setDebtDaysAndSyncDate],
  );

  const setFirstDueDate = useCallback((isoDate: string) => {
    if (!isoDate) return;
    setDeferredDueDate(isoDate);
  }, []);

  const openDeferredDueDatePicker = useCallback(() => {
    const input = deferredDueDateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  }, []);

  const handleSelectCustomer = useCallback(() => {
    setShowCustomerModal(true);
  }, []);

  const handleCustomerSelect = useCallback(
    (nextCustomer: any) => {
      setSelectedCustomer(nextCustomer);
      setShowCustomerModal(false);
      if (onSelectCustomer) {
        onSelectCustomer(nextCustomer);
      }
    },
    [onSelectCustomer],
  );

  const handleQuickSelect = useCallback((amount) => {
    setAmountReceived(amount.toString());
  }, []);

  const handleSplitOnlineAmountChange = useCallback(
    (value) => {
      const { raw, amount } = normalizeSplitAmountInput(value, total);
      const maxTotal = Math.max(0, Number(total) || 0);
      setSplitOnlineAmount(raw);
      setSplitTransferAmount(formatSplitAmount(maxTotal - amount));
    },
    [total],
  );

  const handleSplitTransferAmountChange = useCallback(
    (value) => {
      const { raw, amount } = normalizeSplitAmountInput(value, total);
      const maxTotal = Math.max(0, Number(total) || 0);
      setSplitTransferAmount(raw);
      setSplitOnlineAmount(formatSplitAmount(maxTotal - amount));
    },
    [total],
  );

  const handleDeferredPrepaymentEnabledChange = useCallback((checked) => {
    setDeferredPrepaymentEnabled(checked);
    if (!checked) {
      setDeferredPrepaymentAmount("");
      setDeferredPrepaymentBank("");
    }
  }, []);

  const handleDeferredPrepaymentMethodChange = useCallback((method) => {
    setDeferredPrepaymentMethod(method);
    if (method === "cash") {
      setDeferredPrepaymentBank("");
    }
  }, []);

  const handleWithoutCheckChange = useCallback((checked) => {
    setWithoutCheck(checked);
    try {
      localStorage.setItem("market_withoutCheck", String(checked));
    } catch {
      /* ignore */
    }
  }, []);

  const handleSkipDrawerOpenChange = useCallback((checked: boolean) => {
    setSkipDrawerOpen(checked);
    try {
      localStorage.setItem("market_skipDrawer", String(checked));
    } catch {
      /* ignore */
    }
  }, []);

  const readAmountReceived = useCallback(() => {
    const raw =
      amountReceivedInputRef.current?.value ??
      amountReceived ??
      String(total ?? 0);
    const n = parseFloat(String(raw).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [amountReceived, total]);

  const buildReceiptPrintPayload = useCallback(
    (apiPayload: any, splitParts: any = null) => {
      const received = readAmountReceived();
      let paidCash = 0;
      let paidCard = 0;

      if (paymentMethod === "cash") {
        paidCash = total;
      } else if (paymentMethod === "split" && splitParts) {
        paidCash = splitParts.transfer;
        paidCard = splitParts.online;
      } else if (paymentMethod === "cashless") {
        paidCard = total;
      } else if (paymentMethod === "deferred" && deferredPrepaymentValue > 0) {
        if (isCashlessPrepayment) paidCard = deferredPrepaymentValue;
        else paidCash = deferredPrepaymentValue;
      }
      const isCardPrepaymentReceipt = paymentMethod === "deferred" && paidCard > 0;

      try {
        const enriched = enrichMarketReceiptPayload(apiPayload, {
          paymentMethod,
          total,
          // Предоплата переводом: бэк эхом возвращает cash_received = сумма
          // предоплаты — явный 0, чтобы чек не напечатал её как наличные.
          amountReceived:
            paymentMethod === "cash"
              ? received
              : isCardPrepaymentReceipt
                ? 0
                : undefined,
          paidCash,
          paidCard,
          change: paymentMethod === "cash" ? Math.max(0, received - total) : 0,
        });
        if (enriched && Array.isArray(enriched.items)) {
          if (isCardPrepaymentReceipt) {
            enriched.paid_cash = 0;
            enriched.cash_received = 0;
            enriched.change = 0;
          }
          return enriched;
        }
      } catch (err: any) {
        console.warn("[PaymentPage] enrich receipt payload failed:", err);
      }
      return apiPayload;
    },
    [
      deferredPrepaymentValue,
      isCashlessPrepayment,
      paymentMethod,
      readAmountReceived,
      total,
    ],
  );

  const handleAcceptPayment = useCallback(async () => {
    if (payingInFlightRef.current) return;
    payingInFlightRef.current = true;

    try {
      if (!saleId) {
        showAlert("error", t("crm.cashier.paymentAlerts.error"), t("crm.cashier.paymentAlerts.saleNotFound"));
        return;
      }

      if (paymentMethod === "deferred") {
        if (!selectedCustomer?.id) {
          showAlert("warning", t("crm.cashier.paymentAlerts.customerRequired"), t("crm.cashier.paymentAlerts.customerRequiredDeferred"));
          return;
        }
        if (deferredPrepaymentEnabled) {
          if (deferredPrepaymentValue <= 0) {
            showAlert("warning", t("crm.cashier.paymentAlerts.prepayment"), t("crm.cashier.paymentAlerts.enterPrepayment"));
            return;
          }
          if (
            isDebtScheduleV2
              ? deferredPrepaymentValue >= total
              : deferredPrepaymentValue > total
          ) {
            showAlert(
              "warning",
              "Предоплата",
              isDebtScheduleV2
                ? t("crm.cashier.paymentAlerts.prepaymentLessThanTotal")
                : t("crm.cashier.paymentAlerts.prepaymentTooMuch"),
            );
            return;
          }
          if (
            deferredPrepaymentMethod === "cashless" &&
            !deferredPrepaymentBank
          ) {
            showAlert("warning", t("crm.cashier.paymentAlerts.bankRequired"), t("crm.cashier.paymentAlerts.bankRequiredPrepayment"));
            return;
          }
        }
        if (isDebtScheduleV2) {
          if (deferredSaleDebtRemaining <= 0) {
            showAlert("warning", t("crm.cashier.paymentAlerts.debtAmount"), t("crm.cashier.paymentAlerts.debtMustRemain"));
            return;
          }
          const countNum =
            typeof scheduleCount === "number"
              ? scheduleCount
              : parseInt(String(scheduleCount), 10);
          if (!Number.isFinite(countNum) || countNum < 1) {
            showAlert(
              "warning",
              "График погашения",
              scheduleUnit === "month"
                ? "Укажите число месяцев не менее 1"
                : "Укажите число платежей не менее 1",
            );
            return;
          }
          if (countNum > maxInstallmentsForUnit(scheduleUnit)) {
            showAlert(
              "warning",
              "График погашения",
              scheduleUnit === "month"
                ? `Максимум ${maxInstallmentsForUnit("month")} месяцев`
                : `Максимум ${maxInstallmentsForUnit("day")} платежей`,
            );
            return;
          }
          const intervalNum =
            typeof dayInterval === "number"
              ? dayInterval
              : parseInt(String(dayInterval), 10);
          if (!Number.isFinite(intervalNum) || intervalNum < 1) {
            showAlert("warning", t("crm.cashier.paymentAlerts.interval"), scheduleUnit === "month" ? t("crm.cashier.paymentAlerts.intervalMonthsMin") : t("crm.cashier.paymentAlerts.intervalDaysMin"));
            return;
          }
          if (intervalNum > maxIntervalForUnit(scheduleUnit)) {
            showAlert(
              "warning",
              "Интервал",
              scheduleUnit === "month"
                ? `Максимум ${MAX_MONTH_INTERVAL} месяцев между платежами`
                : `Максимум ${MAX_DAY_INTERVAL} дней между платежами`,
            );
            return;
          }
          if (!deferredDueDate || deferredDueDate < todayIsoDate()) {
            showAlert("warning", t("crm.cashier.paymentAlerts.firstPaymentDate"), t("crm.cashier.paymentAlerts.firstPaymentPast"));
            return;
          }
          if (!debtSchedule) {
            showAlert("warning", t("crm.cashier.paymentAlerts.schedule"), t("crm.cashier.paymentAlerts.scheduleBuildError"));
            return;
          }
        } else {
          const daysNum =
            typeof debtDays === "number"
              ? debtDays
              : parseInt(String(debtDays), 10);
          if (!Number.isFinite(daysNum) || daysNum < 1) {
            showAlert("warning", t("crm.cashier.paymentAlerts.deferredTerm"), t("crm.cashier.paymentAlerts.deferredTermMin"));
            return;
          }
        }
      }

      if (paymentMethod === "cashless" && !selectedBank) {
        showAlert("warning", t("crm.cashier.paymentAlerts.bankRequired"), t("crm.cashier.paymentAlerts.bankRequiredCashless"));
        return;
      }

      let splitParts: any = null;
      if (paymentMethod === "split") {
        if (!splitOnlineBank) {
          showAlert("warning", t("crm.cashier.paymentAlerts.bankRequired"), t("crm.cashier.paymentAlerts.bankRequiredOnline"));
          return;
        }
        const check = validateSplitAmounts(
          total,
          splitOnlineAmount,
          splitTransferAmount,
        );
        if (!check.ok) {
          showAlert("warning", t("crm.cashier.paymentAlerts.splitPayment"), check.message);
          return;
        }
        splitParts = check;
      }

      if (paymentMethod === "cash") {
        const received = readAmountReceived();
        if (received < total) {
          showAlert("warning", t("crm.cashier.paymentAlerts.insufficientFunds"), t("crm.cashier.paymentAlerts.receivedLessThanTotal"));
          return;
        }
      }

      const consultantError = validateConsultantDraft(consultant.draft);
      if (consultantError) {
        showAlert("warning", t("crm.cashier.paymentAlerts.consultant"), consultantError);
        return;
      }

      let paymentMethodApi = "cash";
      let checkoutPayments: any = null;
      let checkoutCashReceived: any = null;
      let checkoutPrepaymentMethod: string | null = null;

      if (paymentMethod === "cashless") {
        paymentMethodApi = mapBankToApiMethod(selectedBank);
      } else if (paymentMethod === "deferred") {
        paymentMethodApi = "debt";
        // При долге `cash_received` — сумма предоплаты (из неё бэк берёт
        // `prepayment` сделки), независимо от способа. Способ — отдельно.
        checkoutCashReceived =
          deferredPrepaymentValue > 0
            ? deferredPrepaymentValue.toFixed(2)
            : null;
        checkoutPrepaymentMethod =
          deferredPrepaymentValue > 0 ? deferredPrepaymentApiMethod : null;
      } else if (paymentMethod === "split" && splitParts) {
        const onlineMethod = mapBankToApiMethod(splitOnlineBank);
        checkoutPayments = [
          ...(splitParts.online > 0
            ? [{ method: onlineMethod, amount: splitParts.online.toFixed(2) }]
            : []),
          ...(splitParts.transfer > 0
            ? [{ method: "cash", amount: splitParts.transfer.toFixed(2) }]
            : []),
        ];
        checkoutCashReceived = splitParts.transfer.toFixed(2);
      }

      const shouldPrintReceipt = !withoutCheck;
      let isPrinterConnected = false;
      if (shouldPrintReceipt) {
        isPrinterConnected = await checkPrinterConnection();
        if (!isPrinterConnected) {
          isPrinterConnected = await ensurePrinterConnectedInteractively();
        }
      }

      const cashReceivedForCheckout =
        paymentMethod === "split" || paymentMethod === "deferred"
          ? checkoutCashReceived
          : paymentMethod === "cash"
            ? readAmountReceived() || total
            : null;

      // Ключ идемпотентности: один и тот же для повторов той же попытки
      // (ретрай после сетевого сбоя/409), новый — если реально поменялся
      // интент (сумма/способ оплаты/сколько получено).
      const checkoutSignature = [
        saleId,
        paymentMethodApi,
        total,
        cashReceivedForCheckout ?? "",
        checkoutPrepaymentMethod ?? "",
      ].join("|");
      if (checkoutIdempotencyRef.current?.signature !== checkoutSignature) {
        checkoutIdempotencyRef.current = {
          signature: checkoutSignature,
          key: crypto.randomUUID(),
        };
      }
      const checkoutIdempotencyKey = checkoutIdempotencyRef.current.key;

      const result = await dispatch(
        productCheckout({
          id: saleId,
          bool: isPrinterConnected,
          clientId: selectedCustomer?.id || null,
          payment_method: checkoutPayments ? null : paymentMethodApi,
          payments: checkoutPayments,
          ...buildPosRoutingFromUser(profile, company, shiftId),
          cash_received: cashReceivedForCheckout,
          prepayment_method: checkoutPrepaymentMethod,
          idempotencyKey: checkoutIdempotencyKey,
          ...buildCheckoutConsultantPayload(consultant.draft),
          ...(isDebtScheduleV2 &&
          paymentMethod === "deferred" &&
          debtSchedule
            ? {
                schedule_version: "v2",
                debt_schedule: {
                  unit: debtSchedule.unit,
                  count: debtSchedule.count,
                  interval_days:
                    debtSchedule.unit === "day"
                      ? debtSchedule.intervalDays
                      : undefined,
                  interval_months:
                    debtSchedule.unit === "month"
                      ? debtSchedule.intervalMonths
                      : undefined,
                  first_due_date: debtSchedule.firstDueDate,
                  installments: toDealInstallments(debtSchedule),
                },
              }
            : {}),
        }),
      );

      if (result.type === "products/productCheckout/fulfilled") {
        if (paymentMethod === "deferred" && selectedCustomer?.id) {
          const schedule = isDebtScheduleV2 ? debtSchedule : null;
          const daysAdd =
            typeof debtDays === "number" && debtDays >= 1
              ? debtDays
              : calcDaysUntilIsoDate(deferredDueDate);
          const dueDateString = isDebtScheduleV2
            ? schedule?.lastDueDate || deferredDueDate || todayIsoDate()
            : deferredDueDate || addCalendarDaysToIso(daysAdd);
          const hasPrepayment =
            deferredPrepaymentValue > 0 && deferredPrepaymentValue < total;
          const debtRecordAmount = hasPrepayment
            ? deferredSaleDebtRemaining
            : total;
          const clientDisplayName =
            selectedCustomer.full_name ||
            selectedCustomer.name ||
            t("crm.cashier.paymentAlerts.client");

          // checkout уже прошёл к этому моменту — откатывать нечего.
          // createDeal и /main/debts/ (тариф «Старт») собираем и пробуем
          // независимо: если что-то упадёт, кладём недостающее в очередь
          // автоповтора вместо блокирующего alert. См.
          // docs/sale-flow-bugs.md, пункт 7.
          const startDebtPayload =
            company?.subscription_plan?.name === "Старт"
              ? {
                  name: clientDisplayName,
                  phone: selectedCustomer.phone || "",
                  due_date: dueDateString,
                  amount:
                    typeof debtRecordAmount === "number"
                      ? debtRecordAmount.toFixed(2)
                      : String(debtRecordAmount),
                }
              : null;

          let startDebtOk = !startDebtPayload;
          if (startDebtPayload) {
            try {
              await api.post("/main/debts/", startDebtPayload);
              startDebtOk = true;
            } catch (startDebtError) {
              console.warn(
                "Ошибка при создании долга для тарифа Старт:",
                startDebtError,
              );
              startDebtOk = false;
            }
          }

          const createDealPayload = isDebtScheduleV2
            ? {
                clientId: selectedCustomer.id,
                title: `${hasPrepayment ? "Предоплата" : "Долг"} ${clientDisplayName}`,
                statusRu: t("crm.cashier.paymentAlerts.debts"),
                amount: total,
                prepayment: hasPrepayment
                  ? deferredPrepaymentValue
                  : undefined,
                debtDays:
                  schedule?.unit === "day" ? schedule.count : undefined,
                debtMonths:
                  schedule?.unit === "month" ? schedule.count : undefined,
                first_due_date:
                  schedule?.firstDueDate || deferredDueDate,
                intervalDays:
                  schedule?.unit === "day"
                    ? schedule.intervalDays
                    : undefined,
                intervalMonths:
                  schedule?.unit === "month"
                    ? schedule.intervalMonths
                    : undefined,
                installments: toDealInstallments(schedule),
                scheduleVersion: "v2",
              }
            : {
                clientId: selectedCustomer.id,
                title: `${hasPrepayment ? "Предоплата" : "Долг"} ${clientDisplayName}`,
                statusRu: hasPrepayment
                  ? t("crm.cashier.paymentAlerts.prepaymentLabel")
                  : t("crm.cashier.paymentAlerts.debts"),
                amount: total,
                prepayment: hasPrepayment
                  ? deferredPrepaymentValue
                  : undefined,
                debtDays: daysAdd,
                first_due_date: dueDateString,
                scheduleVersion: "v1",
              };

          let createDealOk = false;
          try {
            await dispatch(createDeal(createDealPayload)).unwrap();
            createDealOk = true;
          } catch (debtError) {
            console.warn("Ошибка при создании долга:", debtError);
            createDealOk = false;
          }

          if (!createDealOk || !startDebtOk) {
            enqueuePendingDebtDeal({
              saleId:
                result.payload?.sale_id || result.payload?.id || saleId,
              clientName: clientDisplayName,
              createDealPayload,
              createDealDone: createDealOk,
              startDebtPayload,
              startDebtDone: startDebtOk,
            });
            // Ненавязчивый toast вместо блокирующей модалки — система сама
            // дооформит долг в фоне, кассир может продолжать работать.
            notify.info(
              "Оплата оформлена. Не удалось сразу оформить долг — система повторит попытку автоматически.",
              { duration: 8000 },
            );
            void processPendingDebtDeals(dispatch);
          }
        }

        if (
          paymentMethod === "deferred" &&
          deferredPrepaymentValue > 0
        ) {
          const prepayMethodLabel =
            deferredPrepaymentMethod === "cashless"
              ? PAYMENT_BANKS.find((b) => b.id === deferredPrepaymentBank)
                  ?.name || t("crm.cashier.paymentAlerts.cashless")
              : t("crm.cashier.paymentAlerts.cash");
          try {
            await postCashflowIfNeeded(
              dispatch,
              {
                type: "income",
                name: `Предоплата (${prepayMethodLabel})`,
                amount: deferredPrepaymentValue.toFixed(2),
                source_cashbox_flow_id:
                  result.payload?.sale_id || result.payload?.id,
                source_business_operation_id: t("crm.cashier.paymentAlerts.sale"),
                status:
                  company?.subscription_plan?.name === "Старт"
                    ? "approved"
                    : "pending",
              },
              { warnOnFailure: true, failureContext: "sale" },
            );
          } catch (cashError) {
            void cashError;
          }
        }

        if (paymentMethod !== "deferred" && total > 0) {
          const flowBase = {
            type: "income",
            source_cashbox_flow_id:
              result.payload?.sale_id || result.payload?.id,
            source_business_operation_id: t("crm.cashier.paymentAlerts.sale"),
            status:
              company?.subscription_plan?.name === "Старт"
                ? "approved"
                : "pending",
          };
          try {
            if (paymentMethod === "split" && splitParts) {
              if (splitParts.online > 0) {
                await postCashflowIfNeeded(
                  dispatch,
                  {
                    ...flowBase,
                    name: t("crm.cashier.paymentAlerts.saleOnline"),
                    amount: splitParts.online,
                  },
                  { warnOnFailure: true, failureContext: "sale" },
                );
              }
              if (splitParts.transfer > 0) {
                await postCashflowIfNeeded(
                  dispatch,
                  {
                    ...flowBase,
                    name: t("crm.cashier.paymentAlerts.saleCash"),
                    amount: splitParts.transfer,
                  },
                  { warnOnFailure: true, failureContext: "sale" },
                );
              }
            } else {
              await postCashflowIfNeeded(
                dispatch,
                {
                  ...flowBase,
                  name: t("crm.cashier.paymentAlerts.sale"),
                  amount: total,
                },
                { warnOnFailure: true, failureContext: "sale" },
              );
            }
          } catch (cashError) {
            void cashError;
          }
        }

        const saleIdForReceipt =
          result.payload?.sale_id || result.payload?.id || saleId;

        if (!withoutCheck) {
          try {
            if (result.payload) {
              const printPayload = buildReceiptPrintPayload(
                result.payload,
                splitParts,
              );
              let ok = await printReceiptSmart(printPayload, {
                skipDrawer: skipDrawerOpen,
              });
              if (!ok) {
                const receiptResult = await dispatch(
                  getProductCheckout(saleIdForReceipt),
                );
                if (
                  receiptResult.type ===
                  "products/getProductCheckout/fulfilled"
                ) {
                  ok = await printReceiptSmart(
                    buildReceiptPrintPayload(
                      receiptResult.payload,
                      splitParts,
                    ),
                    { skipDrawer: skipDrawerOpen },
                  );
                }
              }
              if (!ok) {
                notify.warning(t("crm.cashier.paymentAlerts.printFailed"), {
                  title: t("crm.cashier.paymentAlerts.print"),
                });
              }
            } else {
              const receiptResult = await dispatch(
                getProductCheckout(saleIdForReceipt),
              );
              if (
                receiptResult.type === "products/getProductCheckout/fulfilled"
              ) {
                const ok = await printReceiptSmart(receiptResult.payload, {
                  skipDrawer: skipDrawerOpen,
                });
                if (!ok) {
                  notify.warning(
                    "Не удалось распечатать чек. Вы можете выбрать принтер и распечатать из окна успешной оплаты.",
                    { title: t("crm.cashier.paymentAlerts.print") },
                  );
                }
              }
            }
          } catch (receiptError) {
            console.warn("Не удалось получить чек для печати:", receiptError);
            notify.warning(t("crm.cashier.paymentAlerts.printFailedRetry"), {
              title: t("crm.cashier.paymentAlerts.print"),
            });
          }
        }

        successEnterBlockedUntilRef.current = Date.now() + 800;
        setSuccessEnterBlockedUntil(successEnterBlockedUntilRef.current);
        setShowSuccessModal(true);
        setReceiptData({
          saleId: saleIdForReceipt,
          checkoutResponse: buildReceiptPrintPayload(
            result.payload,
            splitParts,
          ),
          skipDrawer: skipDrawerOpen,
        });
      } else if (result.payload?.status === 409) {
        // Тот же Idempotency-Key уже обрабатывается — второе устройство/вкладка
        // отправили этот же платёж почти одновременно. Не показываем как
        // обычную ошибку и не трогаем ключ — следующий клик «Оплатить»
        // переиспользует его же и получит уже готовый результат от бэка.
        showAlert(
          "info",
          "Оплата обрабатывается",
          "Этот платёж уже обрабатывается — подождите немного и проверьте результат.",
        );
      } else {
        showAlert(
          "error",
          "Ошибка",
          validateResErrors(
            result.payload,
            "Ошибка при оформлении оплаты. ",
          ),
        );
      }
    } catch (error: any) {
      console.error("Ошибка при оформлении оплаты:", error);
      showAlert("error", t("crm.cashier.paymentAlerts.error"), validateResErrors(error, t("crm.cashier.paymentAlerts.checkoutError")));
    } finally {
      payingInFlightRef.current = false;
    }
  }, [
    buildReceiptPrintPayload,
    company?.subscription_plan?.name,
    consultant.draft,
    dayInterval,
    debtDays,
    debtSchedule,
    deferredDueDate,
    deferredPrepaymentApiMethod,
    deferredPrepaymentBank,
    deferredPrepaymentEnabled,
    deferredPrepaymentMethod,
    deferredPrepaymentValue,
    deferredSaleDebtRemaining,
    dispatch,
    isDebtScheduleV2,
    paymentMethod,
    readAmountReceived,
    saleId,
    shiftId,
    profile,
    selectedBank,
    scheduleCount,
    scheduleUnit,
    selectedCustomer,
    showAlert,
    splitOnlineAmount,
    splitOnlineBank,
    splitTransferAmount,
    total,
    withoutCheck,
    skipDrawerOpen,
  ]);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setReceiptData(null);
    onComplete();
  }, [onComplete]);

  const handlePrintReceipt = useCallback(async () => {
    if (!receiptData?.saleId) {
      showAlert("error", t("crm.cashier.paymentAlerts.error"), t("crm.cashier.paymentAlerts.receiptNotFound"));
      return;
    }

    setPrinting(true);
    try {
      if (receiptData.checkoutResponse) {
        const ok = await printReceiptSmart(receiptData.checkoutResponse, {
          skipDrawer: receiptData.skipDrawer === true,
        });
        if (!ok) {
          showAlert(
            "error",
            "Ошибка печати",
            "Не удалось распечатать чек. Проверьте принтер и повторите.",
          );
        }
      } else {
        const receiptResult = await dispatch(
          getProductCheckout(receiptData.saleId),
        );
        if (receiptResult.type === "products/getProductCheckout/fulfilled") {
          const ok = await printReceiptSmart(receiptResult.payload, {
            skipDrawer: receiptData.skipDrawer === true,
          });
          if (!ok) {
            showAlert(
              "error",
              "Ошибка печати",
              "Не удалось распечатать чек. Проверьте принтер и повторите.",
            );
          }
        } else {
          showAlert(
            "error",
            "Ошибка печати",
            "Не удалось получить данные чека для печати",
          );
        }
      }
    } catch (error: any) {
      console.error("Ошибка при печати чека:", error);
      showAlert(
        "error",
        "Ошибка печати",
        validateResErrors(error, "Ошибка при печати чека. "),
      );
    } finally {
      setPrinting(false);
    }
  }, [dispatch, receiptData, showAlert]);

  const paymentAmounts = useMemo(
    () =>
      getPaymentAmounts({
        paymentMethod,
        total,
        splitOnlineAmount,
        splitTransferAmount,
        deferredPrepaymentValue,
        deferredPrepaymentMethod,
        deferredSaleDebtRemaining,
      }),
    [
      deferredPrepaymentMethod,
      deferredPrepaymentValue,
      deferredSaleDebtRemaining,
      paymentMethod,
      splitOnlineAmount,
      splitTransferAmount,
      total,
    ],
  );

  const change =
    paymentMethod === "cash" && amountReceived
      ? Math.max(0, (parseFloat(amountReceived) || 0) - total)
      : 0;

  const customerDisplayPaid =
    paymentMethod === "cash" && amountReceived
      ? parseFloat(amountReceived) || 0
      : undefined;

  const customerDisplayDebt = useMemo(() => {
    if (paymentMethod !== "deferred") return null;
    return {
      customerName:
        selectedCustomer?.full_name ||
        selectedCustomer?.name ||
        selectedCustomer?.fio ||
        undefined,
      totalDebt: deferredSaleDebtRemaining,
      prepayment: deferredPrepaymentValue > 0 ? deferredPrepaymentValue : undefined,
      installments: debtSchedule?.installments.map((item) => ({
        number: item.number,
        dueDate: item.dueDate,
        amount: item.amount,
      })),
    };
  }, [
    paymentMethod,
    selectedCustomer,
    deferredSaleDebtRemaining,
    deferredPrepaymentValue,
    debtSchedule,
  ]);

  useCustomerDisplayPublisher({
    phase: showSuccessModal ? "thanks" : "payment",
    cart,
    total,
    cartId: saleId,
    paid: customerDisplayPaid,
    change: paymentMethod === "cash" ? change : undefined,
    debt: customerDisplayDebt,
  });

  useEffect(() => {
    if (paymentMethod === "cashless" || paymentMethod === "cash") {
      setAmountReceived(total ? total.toFixed(2) : "0.00");
    }
    if (paymentMethod === "split" && total > 0) {
      const half = (total / 2).toFixed(2);
      setSplitOnlineAmount(half);
      setSplitTransferAmount((total - parseFloat(half)).toFixed(2));
    }
    if (paymentMethod !== "cashless") {
      setSelectedBank("");
    }
  }, [paymentMethod, total]);

  useEffect(() => {
    if (!Array.isArray(cart) || cart.length === 0) return;
    if (paymentMethod === "deferred") return;
    if (showSuccessModal || showCustomerModal || alertModal.open) return;

    const input = amountReceivedInputRef.current;
    if (!input) return;

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [cart, paymentMethod, showSuccessModal, showCustomerModal, alertModal.open]);

  showSuccessModalRef.current = showSuccessModal;
  showCustomerModalRef.current = showCustomerModal;
  alertModalOpenRef.current = alertModal.open;
  acceptPaymentRef.current = handleAcceptPayment;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
      if (showSuccessModalRef.current) return;
      if (showCustomerModalRef.current || alertModalOpenRef.current) return;
      if (payingInFlightRef.current) {
        e.preventDefault();
        return;
      }

      const activeElement = document.activeElement;
      const tag = activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        const cls = String(activeElement?.className || "");
        const isAmount = cls.includes("payment-page__amount-input");
        const isDebtDays = cls.includes("payment-page__debt-days-input");
        if (!isAmount && !isDebtDays) return;
      }

      e.preventDefault();
      e.stopPropagation();
      void acceptPaymentRef.current();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return {
    customers,
    paymentMethod,
    setPaymentMethod,
    selectedCustomer,
    customerDebt,
    handleSelectCustomer,
    handleCustomerSelect,
    deferredPrepaymentValue,
    deferredSaleDebtRemaining,
    totalDebt,
    selectedBank,
    setSelectedBank,
    splitOnlineBank,
    setSplitOnlineBank,
    splitOnlineAmount,
    splitTransferAmount,
    handleSplitOnlineAmountChange,
    handleSplitTransferAmountChange,
    deferredPrepaymentEnabled,
    handleDeferredPrepaymentEnabledChange,
    deferredPrepaymentAmount,
    setDeferredPrepaymentAmount,
    deferredPrepaymentMethod,
    handleDeferredPrepaymentMethodChange,
    deferredPrepaymentBank,
    setDeferredPrepaymentBank,
    debtScheduleVersion,
    isDebtScheduleV2,
    debtDays,
    onDebtDaysChange: handleDebtDaysChange,
    onDebtDaysBlur: handleDebtDaysBlur,
    onDebtDaysDateChange: setDebtDaysFromDate,
    scheduleUnit,
    onScheduleUnitChange: handleScheduleUnitChange,
    scheduleCount,
    onSchedulePreset: handleSchedulePreset,
    dayInterval,
    onDayIntervalChange: handleDayIntervalChange,
    onDayIntervalBlur: handleDayIntervalBlur,
    onDayIntervalPreset: handleDayIntervalPreset,
    debtSchedule,
    deferredDueDate,
    deferredDueDateInputRef,
    openDeferredDueDatePicker,
    onFirstDueDateChange: setFirstDueDate,
    amountReceived,
    setAmountReceived,
    amountReceivedInputRef,
    quickSelectAmounts,
    handleQuickSelect,
    change,
    withoutCheck,
    handleWithoutCheckChange,
    skipDrawerOpen,
    handleSkipDrawerOpenChange,
    handleAcceptPayment,
    showCustomerModal,
    setShowCustomerModal,
    showSuccessModal,
    handleCloseSuccess,
    handlePrintReceipt,
    printing,
    paymentAmounts,
    successEnterBlockedUntil,
    receiptData,
    alertModal,
    closeAlert,
    consultant,
  };
}

export type PaymentPageVm = ReturnType<typeof usePaymentPage>;
