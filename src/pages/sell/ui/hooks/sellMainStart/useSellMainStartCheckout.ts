import { useEffect, useState } from "react";
import {
  productCheckout,
  createDeal,
  getProductCheckout,
  getReceiptJson,
} from "@entities/sale";
import { postCashflowIfNeeded } from "@entities/cash";
import { useUser } from "@entities/user";
import { buildPosRoutingFromUser } from "@shared/lib/tools/cashboxResolution";
import { createDebt } from "../../sellHelpers";
import { calcDaysUntilIsoDate } from "@shared/lib/tools/deferredPaymentDates";
import { handleCheckoutResponseForPrinting } from "../../services/printService";
import { buildInitialCashData } from "../../utils/sellMainStartUtils";
import { validateResErrors } from "@shared/lib/tools/validateResErrors";
import { useConfirm } from "@shared/hooks/useDialog";

export function useSellMainStartCheckout({
  company,
  dispatch,
  start,
  setAlert,
  onRefresh,
  currentTotal,
  clientId,
  pickClient,
  debt,
  amount,
  debtMonths,
  state,
  setShowDebtModal,
}: any) {
  const confirm = useConfirm();
  const { profile } = useUser();
  const run = (thunk: any) => dispatch(thunk).unwrap();
  const [showPaymentChoiceModal, setShowPaymentChoiceModal] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState("cash");
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [cashPaymentConfirmed, setCashPaymentConfirmed] = useState(false);
  const [showReceiptChoiceModal, setShowReceiptChoiceModal] = useState(false);
  const [receiptWithCheck, setReceiptWithCheck] = useState(true);
  const [pendingCheckout, setPendingCheckout] = useState<any>(null);
  const [cashData, setCashData] = useState(() => buildInitialCashData(company));

  const validateDebtTerm = () => {
    if (debt === "Долги" || debt === "Предоплата") {
      if (!debtMonths || Number(debtMonths) <= 0) {
        setAlert({
          open: true,
          type: "error",
          message: "Введите корректный срок долга (в месяцах)",
        });
        return false;
      }
      if (!state.dueDate) {
        setAlert({
          open: true,
          type: "error",
          message: "Выберите дату первого платежа",
        });
        return false;
      }
    }
    return true;
  };

  // Обработка оплаты наличными
  const handleCashPayment = async () => {
    // Нормализуем значение: заменяем запятую на точку
    const normalizedReceived = String(cashReceived).replace(/,/g, ".");
    const normalizedTotal = String(currentTotal).replace(/,/g, ".");
    const received = parseFloat(normalizedReceived) || 0;
    const total = parseFloat(normalizedTotal) || 0;

    if (!received || received <= 0) {
      setAlert({
        open: true,
        type: "error",
        message: "Введите сумму, полученную от покупателя",
      });
      return;
    }

    if (received < total) {
      setAlert({
        open: true,
        type: "error",
        message: `Недостаточно средств. К оплате: ${total.toFixed(2)} сом`,
      });
      return;
    }

    setPaymentMethod("cash");
    setCashPaymentConfirmed(true);
    setShowCashModal(false);
    setReceiptWithCheck(true);
    setShowReceiptChoiceModal(true);
  };

  // Ключевая функция: checkout + ПЕЧАТЬ
  const performCheckout = async (withReceipt, paymentType = null) => {
    const finalPaymentType = paymentType || paymentMethod || "card";
    try {
      if (!cashData.cashbox) {
        setAlert({
          open: true,
          type: "error",
          message: "Выберите кассу для проведения операции",
        });
        return;
      }

      if (debt === "Долги") {
        if (!clientId) {
          setAlert({
            open: true,
            type: "error",
            message: "Выберите клиента",
          });
          return;
        }

        if (company.subscription_plan.name === "Старт") {
          if (!state.phone) {
            setAlert({
              open: true,
              type: "error",
              message: "Введите номер телефона",
            });
            return;
          }
        }
      }

      const itemsToCheck = start?.items;
      if (itemsToCheck?.length === 0) {
        setAlert({
          open: true,
          type: "error",
          message: "Добавьте товар для проведения операции",
        });
        return;
      }
      if (debt && !clientId) {
        setAlert({
          open: true,
          type: "error",
          message: "Выберите клиента для долговой операции",
        });
        return;
      }
      if (debt === "Предоплата") {
        if (!amount || Number(amount) <= 0) {
          setAlert({
            open: true,
            type: "error",
            message: "Введите корректную сумму предоплаты",
          });
          return;
        }
        const totalToCheck = start?.total;
        if (Number(amount) > Number(totalToCheck)) {
          setAlert({
            open: true,
            type: "error",
            message: "Сумма предоплаты не может превышать общую сумму",
          });
          return;
        }
        if (!validateDebtTerm()) return;
      }
      if (debt === "Долги") {
        if (!validateDebtTerm()) return;
      }

      // Стартовый тариф: создаём запись в /main/debts/
      if (debt === "Долги" && company.subscription_plan.name === "Старт") {
        const debtAmount = start?.total;
        await createDebt({
          name: pickClient?.full_name,
          phone: state.phone,
          due_date: state.dueDate,
          amount: debtAmount,
        });
      }

      if (clientId) {
        const totalForDeal = start?.total;
        const dealPayload: any = {
          clientId: clientId,
          title: `${debt || "Продажа"} ${pickClient?.full_name}`,
          statusRu: debt,
          amount: totalForDeal,
        };

        if (debt === "Предоплата") {
          dealPayload.prepayment = Number(amount);
        }

        if (debt === "Долги" || debt === "Предоплата") {
          dealPayload.debtMonths = Number(debtMonths || 0);
          dealPayload.debtDays = calcDaysUntilIsoDate(state.dueDate);
          dealPayload.first_due_date = state.dueDate;
        }

        await dispatch(createDeal(dealPayload)).unwrap();
        // await run(deleteSale(start?.id));
        // await run(
        //   postCashflowIfNeeded(dispatch, {
        //     ...cashData,
        //     name: cashData.name === "" ? "Продажа" : cashData.name,
        //     amount: amountForCash,
        //     source_cashbox_flow_id: result?.sale_id,
        //     type: finalPaymentType === "cash" ? "income" : "income",
        //   })
        // );
      }

      if (finalPaymentType === "cash") {
        // Нормализуем значение: заменяем запятую на точку
        const normalizedReceived = String(cashReceived).replace(/,/g, ".");
        const normalizedTotal = String(currentTotal).replace(/,/g, ".");
        const received = parseFloat(normalizedReceived) || 0;
        const total = parseFloat(normalizedTotal) || 0;

        if (!cashReceived || received <= 0) {
          setAlert({
            open: true,
            type: "error",
            message: "Введите сумму, полученную от покупателя",
          });
          return;
        }
        if (received < total) {
          setAlert({
            open: true,
            type: "error",
            message: `Недостаточно средств. К оплате: ${total.toFixed(2)} сом`,
          });
          return;
        }
      }

      const checkoutParams: any = {
        id: start?.id,
        bool: withReceipt,
        clientId: clientId,
        ...buildPosRoutingFromUser(profile, company),
      };

      if (finalPaymentType === "cash") {
        checkoutParams.payment_method = "cash";
        // Нормализуем значение: заменяем запятую на точку
        const normalizedReceived = String(cashReceived).replace(/,/g, ".");
        checkoutParams.cash_received = parseFloat(
          String(normalizedReceived || 0)
        ).toFixed(2);
      } else if (finalPaymentType === "card") {
        checkoutParams.payment_method = "transfer";
      }

      const result = await run(productCheckout(checkoutParams));

      const amountForCash = debt === "Предоплата" ? amount : start.total;
      if (debt !== "Долги") {
        await postCashflowIfNeeded(
          dispatch,
          {
            name: cashData.name === "" ? "Продажа" : cashData.name,
            amount: amountForCash,
            source_cashbox_flow_id: result?.sale_id,
            type: finalPaymentType === "cash" ? "income" : "income",
          },
          { warnOnFailure: true, failureContext: "sale" },
        );
      }

      if (withReceipt && result?.sale_id) {
        try {
          // Для /crm/sell сначала берем JSON чека (новый ККМ формат),
          // и только потом фолбэк на getProductCheckout (blob/pdf).
          let resp = null;
          try {
            resp = await run(getReceiptJson(result.sale_id));
          } catch {
            resp = await run(getProductCheckout(result.sale_id));
          }
          await handleCheckoutResponseForPrinting(resp);
        } catch (e: any) {
          console.error("Печать чека не удалась:", e);
          setAlert({
            open: true,
            type: "error",
            message:
              "Не удалось распечатать чек. Проверьте WinUSB и формат ответа (JSON/PDF).",
          });
        }
      }

      setAlert({
        open: true,
        type: "success",
        message: "Операция успешно выполнена!",
      });
      setPaymentMethod(null);
      setCashReceived("");
      setCashPaymentConfirmed(false);
      onRefresh()
    } catch (e: any) {
      setAlert({
        open: true,
        type: "error",
        message: `Что то пошло не так.\n\n${e?.data?.detail
          ?.replace("у агента:", "товара")
          ?.replace("Нужно 2, доступно 0.", "") ||
          e?.message ||
          ""
          }`,
      });
    }
  };

  // Подтверждение выбора способа оплаты из модалки (клавиатура/Enter)
  const handleConfirmPaymentChoice = async () => {
    if (!start?.id || !(start?.items || []).length) return;

    try {
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
    } catch (error: any) {
      console.error("Ошибка при подтверждении оплаты:", error);
    }
  };

  // Обработка отложенного вызова performCheckout
  useEffect(() => {
    if (pendingCheckout) {
      performCheckout(pendingCheckout.withReceipt, pendingCheckout.paymentType);
      setPendingCheckout(null);
    }
     
  }, [pendingCheckout]);

  // Обработка сохранения долга из модалки (кнопка "Сохранить" в DebtModal)
  const handleSaveDebt = async () => {
    try {
      if (!clientId) {
        setAlert({
          open: true,
          type: "error",
          message: "Выберите клиента",
        });
        return;
      }

      if (!debt) {
        setAlert({
          open: true,
          type: "error",
          message: "Выберите тип оплаты",
        });
        return;
      }

      if (!validateDebtTerm()) return;
      let printingResult = null;
      if (debt === "Долги") {
        if (company?.subscription_plan?.name === "Старт") {
          if (!state.phone) {
            setAlert({
              open: true,
              type: "error",
              message: "Введите номер телефона",
            });
            return;
          }

          // Создаём отдельный "долг" в /main/debts/
          await createDebt({
            name: pickClient?.full_name,
            phone: state.phone,
            due_date: state.dueDate,
            amount: start?.total,
          });
        }

        if (clientId) {
          const totalForDeal = start?.total;
          const dealPayload: any = {
            clientId: clientId,
            name: pickClient?.full_name,
            phone: pickClient.phone,
            title: `Долг ${pickClient?.full_name}`,
            statusRu: debt,
            amount: totalForDeal,
            debtMonths: Number(debtMonths || 0),
            debtDays: calcDaysUntilIsoDate(state.dueDate),
            first_due_date: state.dueDate,
          };

          await dispatch(createDeal(dealPayload)).unwrap();
          const checkoutParams: any = {
            id: start?.id,
            bool: true,
            clientId: clientId,
            payment_method: "debt",
            amount: 0,
            cash_received: 0,
          };
          const result = await run(productCheckout(checkoutParams));
          try {
            printingResult = await run(getReceiptJson(result?.sale_id));
          } catch {
            printingResult = await run(getProductCheckout(result?.sale_id));
          }

        }
      } else if (debt === "Предоплата") {
        if (!amount || Number(amount) <= 0) {
          setAlert({
            open: true,
            type: "error",
            message: "Введите корректную сумму предоплаты",
          });
          return;
        }

        const totalToCheck = start?.total;
        if (Number(amount) > Number(totalToCheck)) {
          setAlert({
            open: true,
            type: "error",
            message: "Сумма предоплаты не может превышать общую сумму",
          });
          return;
        }

        if (clientId) {
          const totalForDeal = start?.total;
          const dealPayload: any = {
            clientId: clientId,
            name: pickClient?.full_name,
            phone: pickClient.phone,
            title: `Предоплата ${pickClient?.full_name}`,
            statusRu: debt,
            amount: totalForDeal,
            prepayment: Number(amount),
            debtMonths: Number(debtMonths || 0),
            debtDays: calcDaysUntilIsoDate(state.dueDate),
            first_due_date: state.dueDate,
          };
          const checkoutParams: any = {
            id: start?.id,
            bool: true,
            clientId: clientId,
            payment_method: "debt",
            amount: 0,
            cash_received: Number(amount),
          };
          if (
            company?.subscription_plan?.name === "Старт" &&
            Number(amount) < Number(totalForDeal)
          ) {
            await createDebt({
              name: pickClient?.full_name,
              phone: state.phone,
              due_date: state.dueDate,
              amount: Number(totalForDeal) - Number(amount),
            });
          }
          await dispatch(createDeal(dealPayload)).unwrap();
          const result = await run(productCheckout(checkoutParams));
          try {
            printingResult = await run(getReceiptJson(result?.sale_id));
          } catch {
            printingResult = await run(getProductCheckout(result?.sale_id));
          }

        }
      }
      confirm(`Напечатать чек?`, async (ok) => {
        if (ok && printingResult) {
          await handleCheckoutResponseForPrinting(printingResult);
        }
        setAlert({
          open: true,
          type: "success",
          message:
            debt === "Долги"
              ? "Долг успешно создан!"
              : "Предоплата успешно сохранена!",
        });
        setShowDebtModal(false);
        onRefresh()
      });
    } catch (error: any) {
      console.error("Ошибка при сохранении долга:", error);

      setAlert({
        open: true,
        type: "error",
        message: validateResErrors(error, "Ошибка при сохранении долга"),
      });
    }
  };


  return {
    cashData,
    setCashData,
    showPaymentChoiceModal,
    setShowPaymentChoiceModal,
    paymentChoice,
    setPaymentChoice,
    showCashModal,
    setShowCashModal,
    cashReceived,
    setCashReceived,
    paymentMethod,
    setPaymentMethod,
    cashPaymentConfirmed,
    setCashPaymentConfirmed,
    showReceiptChoiceModal,
    setShowReceiptChoiceModal,
    receiptWithCheck,
    setReceiptWithCheck,
    pendingCheckout,
    setPendingCheckout,
    validateDebtTerm,
    handleCashPayment,
    performCheckout,
    handleConfirmPaymentChoice,
    handleSaveDebt,
  };
}
