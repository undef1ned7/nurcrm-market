import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  productCheckout,
  getProductCheckout,
  createDeal,
} from "@entities/sale";
import { addCashFlows, getCashBoxes, useCash } from "@entities/cash";
import { useUser } from "@entities/user";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { validateSplitAmounts } from "@shared/lib/tools/marketCashierSplitPayment";
import {
  checkPrinterConnection,
  ensurePrinterConnectedInteractively,
  enrichMarketReceiptPayload,
} from "@pages/sell/ui/services/printService";
import api from "@shared/api";
import { PAYMENT_BANKS } from "../paymentPage.banks";
import {
  addCalendarDaysToIso,
  calcDaysUntilIsoDate,
  formatSplitAmount,
  getPaymentAmounts,
  getQuickSelectAmounts,
  mapBankToApiMethod,
  normalizeSplitAmountInput,
  printReceiptSmart,
} from "../paymentPage.utils";
import type { PaymentPageProps } from "../paymentPage.types";

export function usePaymentPage({
  cart,
  total,
  customer,
  onSelectCustomer,
  onComplete,
  customers = [],
  saleId,
}: PaymentPageProps) {
  const dispatch = useDispatch() as any;
  const { list: cashBoxes } = useCash();
  const { company } = useUser();

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
  const [debtDays, setDebtDays] = useState<any>(30);
  const [deferredDueDate, setDeferredDueDate] = useState(() =>
    addCalendarDaysToIso(30),
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
  const [selectCashBox, setSelectCashBox] = useState("");
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

  const setDebtDaysFromDate = useCallback((isoDate: any) => {
    setDeferredDueDate(isoDate);
    setDebtDays(calcDaysUntilIsoDate(isoDate));
  }, []);

  const setDebtDaysAndSyncDate = useCallback((days: any) => {
    const safeDays = Math.max(1, Number(days) || 1);
    setDebtDays(safeDays);
    setDeferredDueDate(addCalendarDaysToIso(safeDays));
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

  const handleDebtDaysChange = useCallback(
    (value: any) => {
      if (value === "") {
        setDebtDays("");
        return;
      }
      const numValue = parseInt(value, 10);
      if (!Number.isNaN(numValue)) {
        setDebtDaysAndSyncDate(numValue);
      }
    },
    [setDebtDaysAndSyncDate],
  );

  const handleDebtDaysBlur = useCallback(
    (value) => {
      const numValue = parseInt(value, 10);
      if (Number.isNaN(numValue) || numValue < 1) {
        setDebtDaysAndSyncDate(30);
      }
    },
    [setDebtDaysAndSyncDate],
  );

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
        paidCash = deferredPrepaymentValue;
      }

      try {
        const enriched = enrichMarketReceiptPayload(apiPayload, {
          paymentMethod,
          total,
          amountReceived: paymentMethod === "cash" ? received : undefined,
          paidCash,
          paidCard,
          change: paymentMethod === "cash" ? Math.max(0, received - total) : 0,
        });
        if (enriched && Array.isArray(enriched.items)) return enriched;
      } catch (err: any) {
        console.warn("[PaymentPage] enrich receipt payload failed:", err);
      }
      return apiPayload;
    },
    [deferredPrepaymentValue, paymentMethod, readAmountReceived, total],
  );

  const handleAcceptPayment = useCallback(async () => {
    if (payingInFlightRef.current) return;
    payingInFlightRef.current = true;

    try {
      if (!saleId) {
        showAlert("error", "Ошибка", "Продажа не найдена");
        return;
      }

      if (paymentMethod === "deferred") {
        if (!selectedCustomer?.id) {
          showAlert(
            "warning",
            "Требуется клиент",
            "Для оформления отсрочки необходимо выбрать клиента",
          );
          return;
        }
        if (deferredPrepaymentEnabled) {
          if (deferredPrepaymentValue <= 0) {
            showAlert("warning", "Предоплата", "Укажите сумму предоплаты");
            return;
          }
          if (deferredPrepaymentValue > total) {
            showAlert(
              "warning",
              "Предоплата",
              "Сумма предоплаты не может быть больше суммы заказа",
            );
            return;
          }
          if (
            deferredPrepaymentMethod === "cashless" &&
            !deferredPrepaymentBank
          ) {
            showAlert(
              "warning",
              "Требуется банк",
              "Выберите банк для безналичной предоплаты",
            );
            return;
          }
        }
        const daysNum =
          typeof debtDays === "number"
            ? debtDays
            : parseInt(String(debtDays), 10);
        if (!Number.isFinite(daysNum) || daysNum < 1) {
          showAlert(
            "warning",
            "Срок рассрочки",
            "Укажите срок рассрочки не менее 1 дня",
          );
          return;
        }
      }

      if (paymentMethod === "cashless" && !selectedBank) {
        showAlert(
          "warning",
          "Требуется банк",
          "Для безналичной оплаты необходимо выбрать банк",
        );
        return;
      }

      let splitParts: any = null;
      if (paymentMethod === "split") {
        if (!splitOnlineBank) {
          showAlert(
            "warning",
            "Требуется банк",
            "Выберите банк для онлайн-оплаты",
          );
          return;
        }
        const check = validateSplitAmounts(
          total,
          splitOnlineAmount,
          splitTransferAmount,
        );
        if (!check.ok) {
          showAlert("warning", "Смешанная оплата", check.message);
          return;
        }
        splitParts = check;
      }

      if (paymentMethod === "cash") {
        const received = readAmountReceived();
        if (received < total) {
          showAlert(
            "warning",
            "Недостаточно средств",
            "Полученная сумма меньше суммы заказа!",
          );
          return;
        }
      }

      let paymentMethodApi = "cash";
      let checkoutPayments: any = null;
      let checkoutCashReceived: any = null;

      if (paymentMethod === "cashless") {
        paymentMethodApi = mapBankToApiMethod(selectedBank);
      } else if (paymentMethod === "deferred") {
        paymentMethodApi = "debt";
        checkoutCashReceived =
          deferredPrepaymentValue > 0
            ? deferredPrepaymentValue.toFixed(2)
            : null;
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

      const result = await dispatch(
        productCheckout({
          id: saleId,
          bool: isPrinterConnected,
          clientId: selectedCustomer?.id || null,
          payment_method: checkoutPayments ? null : paymentMethodApi,
          payments: checkoutPayments,
          cash_received:
            paymentMethod === "split" || paymentMethod === "deferred"
              ? checkoutCashReceived
              : paymentMethod === "cash"
                ? readAmountReceived() || total
                : null,
        }),
      );

      if (result.type === "products/productCheckout/fulfilled") {
        if (paymentMethod === "deferred" && selectedCustomer?.id) {
          try {
            const daysAdd =
              typeof debtDays === "number" && debtDays >= 1
                ? debtDays
                : calcDaysUntilIsoDate(deferredDueDate);
            const dueDateString =
              deferredDueDate || addCalendarDaysToIso(daysAdd);
            const isPrepaymentDeal =
              deferredPrepaymentValue > 0 && deferredPrepaymentValue < total;
            const debtRecordAmount = isPrepaymentDeal
              ? deferredSaleDebtRemaining
              : total;

            if (company?.subscription_plan?.name === "Старт") {
              try {
                await api.post("/main/debts/", {
                  name:
                    selectedCustomer.full_name ||
                    selectedCustomer.name ||
                    "Клиент",
                  phone: selectedCustomer.phone || "",
                  due_date: dueDateString,
                  amount:
                    typeof debtRecordAmount === "number"
                      ? debtRecordAmount.toFixed(2)
                      : String(debtRecordAmount),
                });
              } catch (startDebtError) {
                console.warn(
                  "Ошибка при создании долга для тарифа Старт:",
                  startDebtError,
                );
                showAlert(
                  "warning",
                  "Предупреждение",
                  validateResErrors(
                    startDebtError,
                    "Оплата оформлена, но не удалось создать запись о долге для тарифа Старт. ",
                  ),
                );
              }
            }

            await dispatch(
              createDeal({
                clientId: selectedCustomer.id,
                title: `${isPrepaymentDeal ? "Предоплата" : "Долг"} ${
                  selectedCustomer.full_name ||
                  selectedCustomer.name ||
                  "Клиент"
                }`,
                statusRu: isPrepaymentDeal ? "Предоплата" : "Долги",
                amount: total,
                prepayment:
                  deferredPrepaymentValue > 0
                    ? deferredPrepaymentValue
                    : undefined,
                debtDays: daysAdd,
                first_due_date: dueDateString,
              }),
            ).unwrap();
          } catch (debtError) {
            console.warn("Ошибка при создании долга:", debtError);
            showAlert(
              "warning",
              "Предупреждение",
              validateResErrors(
                debtError,
                "Оплата оформлена, но не удалось создать запись о долге. ",
              ),
            );
          }
        }

        if (
          paymentMethod === "deferred" &&
          deferredPrepaymentValue > 0 &&
          selectCashBox
        ) {
          const prepayMethodLabel =
            deferredPrepaymentMethod === "cashless"
              ? PAYMENT_BANKS.find((b) => b.id === deferredPrepaymentBank)
                  ?.name || "Безналичные"
              : "Наличные";
          try {
            await dispatch(
              addCashFlows({
                cashbox: selectCashBox,
                type: "income",
                name: `Предоплата (${prepayMethodLabel})`,
                amount: deferredPrepaymentValue.toFixed(2),
                source_cashbox_flow_id:
                  result.payload?.sale_id || result.payload?.id,
                source_business_operation_id: "Продажа",
                status:
                  company?.subscription_plan?.name === "Старт"
                    ? "approved"
                    : "pending",
              }),
            ).unwrap();
          } catch (cashError) {
            console.warn(
              "Ошибка при создании денежного потока предоплаты:",
              cashError,
            );
            showAlert(
              "warning",
              "Предупреждение",
              validateResErrors(
                cashError,
                "Оплата оформлена, но не удалось записать предоплату в кассу. ",
              ),
            );
          }
        }

        if (paymentMethod !== "deferred" && selectCashBox && total > 0) {
          const flowBase = {
            cashbox: selectCashBox,
            type: "income",
            source_cashbox_flow_id:
              result.payload?.sale_id || result.payload?.id,
            source_business_operation_id: "Продажа",
            status:
              company?.subscription_plan?.name === "Старт"
                ? "approved"
                : "pending",
          };
          try {
            if (paymentMethod === "split" && splitParts) {
              if (splitParts.online > 0) {
                await dispatch(
                  addCashFlows({
                    ...flowBase,
                    name: "Продажа (онлайн)",
                    amount: splitParts.online,
                  }),
                ).unwrap();
              }
              if (splitParts.transfer > 0) {
                await dispatch(
                  addCashFlows({
                    ...flowBase,
                    name: "Продажа (наличные)",
                    amount: splitParts.transfer,
                  }),
                ).unwrap();
              }
            } else {
              await dispatch(
                addCashFlows({
                  ...flowBase,
                  name: "Продажа",
                  amount: total,
                }),
              ).unwrap();
            }
          } catch (cashError) {
            console.warn("Ошибка при создании денежного потока:", cashError);
            showAlert(
              "warning",
              "Предупреждение",
              validateResErrors(
                cashError,
                "Оплата оформлена, но не удалось записать доход в кассу. ",
              ),
            );
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
              let ok = await printReceiptSmart(printPayload);
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
                  );
                }
              }
              if (!ok) {
                showAlert(
                  "warning",
                  "Печать",
                  "Не удалось распечатать чек. Вы можете выбрать принтер и распечатать из окна успешной оплаты.",
                );
              }
            } else {
              const receiptResult = await dispatch(
                getProductCheckout(saleIdForReceipt),
              );
              if (
                receiptResult.type === "products/getProductCheckout/fulfilled"
              ) {
                const ok = await printReceiptSmart(receiptResult.payload);
                if (!ok) {
                  showAlert(
                    "warning",
                    "Печать",
                    "Не удалось распечатать чек. Вы можете выбрать принтер и распечатать из окна успешной оплаты.",
                  );
                }
              }
            }
          } catch (receiptError) {
            console.warn("Не удалось получить чек для печати:", receiptError);
            showAlert(
              "warning",
              "Печать",
              "Не удалось распечатать чек. Вы можете повторить печать из окна успешной оплаты.",
            );
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
        });
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
      showAlert(
        "error",
        "Ошибка",
        validateResErrors(error, "Ошибка при оформлении оплаты. "),
      );
    } finally {
      payingInFlightRef.current = false;
    }
  }, [
    buildReceiptPrintPayload,
    company?.subscription_plan?.name,
    debtDays,
    deferredDueDate,
    deferredPrepaymentBank,
    deferredPrepaymentEnabled,
    deferredPrepaymentMethod,
    deferredPrepaymentValue,
    deferredSaleDebtRemaining,
    dispatch,
    paymentMethod,
    readAmountReceived,
    saleId,
    selectCashBox,
    selectedBank,
    selectedCustomer,
    showAlert,
    splitOnlineAmount,
    splitOnlineBank,
    splitTransferAmount,
    total,
    withoutCheck,
  ]);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccessModal(false);
    setReceiptData(null);
    onComplete();
  }, [onComplete]);

  const handlePrintReceipt = useCallback(async () => {
    if (!receiptData?.saleId) {
      showAlert("error", "Ошибка", "Данные чека не найдены");
      return;
    }

    setPrinting(true);
    try {
      if (receiptData.checkoutResponse) {
        const ok = await printReceiptSmart(receiptData.checkoutResponse);
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
          const ok = await printReceiptSmart(receiptResult.payload);
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
        deferredSaleDebtRemaining,
      }),
    [
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

  useEffect(() => {
    dispatch(getCashBoxes(undefined as any));
  }, [dispatch]);

  useEffect(() => {
    if (cashBoxes && cashBoxes.length > 0 && !selectCashBox) {
      const firstCashBox = cashBoxes[0];
      const firstCashBoxId = firstCashBox?.id || firstCashBox?.uuid || "";
      if (firstCashBoxId) {
        setSelectCashBox(firstCashBoxId);
      }
    }
  }, [cashBoxes, selectCashBox]);

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
    debtDays,
    deferredDueDate,
    deferredDueDateInputRef,
    handleDebtDaysChange,
    handleDebtDaysBlur,
    openDeferredDueDatePicker,
    setDebtDaysFromDate,
    amountReceived,
    setAmountReceived,
    amountReceivedInputRef,
    quickSelectAmounts,
    handleQuickSelect,
    change,
    withoutCheck,
    handleWithoutCheckChange,
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
  };
}

export type PaymentPageVm = ReturnType<typeof usePaymentPage>;
