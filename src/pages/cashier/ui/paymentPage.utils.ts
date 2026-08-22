import {
  handleCheckoutResponseForPrinting,
  ensurePrinterConnectedInteractively,
} from "@pages/sell/ui/services/printService";
import type { PaymentAmounts, PaymentMethodId } from "./paymentPage.types";

export const KYRGYZSTAN_BILLS = [20, 50, 100, 200, 500, 1000, 2000, 5000];

export const SUPPORTED_CHECKOUT_BANKS = ["mbank", "optima", "obank", "bakai"];

export const PAYMENT_METHODS = [
  {
    id: "cash",
    labelKey: "crm.cashier.payment.methods.cash.label",
    descriptionKey: "crm.cashier.payment.methods.cash.description",
  },
  {
    id: "cashless",
    labelKey: "crm.cashier.payment.methods.cashless.label",
    descriptionKey: "crm.cashier.payment.methods.cashless.description",
  },
  {
    id: "deferred",
    labelKey: "crm.cashier.payment.methods.deferred.label",
    descriptionKey: "crm.cashier.payment.methods.deferred.description",
  },
  {
    id: "split",
    labelKey: "crm.cashier.payment.methods.split.label",
    descriptionKey: "crm.cashier.payment.methods.split.description",
  },
];

export function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function addCalendarDaysToIso(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().split("T")[0];
}

export function calcDaysUntilIsoDate(isoDate) {
  if (!isoDate) return 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 30;
  due.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff);
}

export function formatSplitAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return Math.max(0, amount).toFixed(2);
}

export function normalizeSplitAmountInput(value, total) {
  if (value === "") return { raw: "", amount: 0 };
  const amount = Number(value);
  if (!Number.isFinite(amount)) return { raw: "", amount: 0 };
  const maxTotal = Math.max(0, Number(total) || 0);
  const clampedAmount = Math.min(Math.max(0, amount), maxTotal);
  return {
    raw: clampedAmount === amount ? value : formatSplitAmount(clampedAmount),
    amount: clampedAmount,
  };
}

export function getQuickSelectAmounts(total) {
  return KYRGYZSTAN_BILLS.filter((bill) => bill >= total).slice(0, 3);
}

export function parseMoneyInput(value) {
  const n = parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyRu(value) {
  return Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function debtDaysLabel(debtDays, deferredDueDate) {
  const days =
    typeof debtDays === "number" ? debtDays : calcDaysUntilIsoDate(deferredDueDate);
  if (days === 1) return "день";
  if (days >= 2 && days <= 4) return "дня";
  return "дней";
}

export function mapBankToApiMethod(bankId) {
  if (bankId && SUPPORTED_CHECKOUT_BANKS.includes(bankId)) return bankId;
  return "transfer";
}

export function getPaymentAmounts({
  paymentMethod,
  total,
  splitOnlineAmount,
  splitTransferAmount,
  deferredPrepaymentValue,
  deferredSaleDebtRemaining,
}: {
  paymentMethod: PaymentMethodId | string;
  total: number;
  splitOnlineAmount?: string | number;
  splitTransferAmount?: string | number;
  deferredPrepaymentValue?: number;
  deferredSaleDebtRemaining?: number;
}): PaymentAmounts {
  if (paymentMethod === "cash") {
    return { cash: total, cashless: 0, deferred: 0 };
  }
  if (paymentMethod === "cashless") {
    return { cash: 0, cashless: total, deferred: 0 };
  }
  if (paymentMethod === "split") {
    const online = parseFloat(String(splitOnlineAmount)) || 0;
    const cash = parseFloat(String(splitTransferAmount)) || 0;
    return { cash, cashless: online, deferred: 0 };
  }
  return {
    cash: deferredPrepaymentValue || 0,
    cashless: 0,
    deferred: deferredSaleDebtRemaining || 0,
  };
}

export async function printReceiptSmart(payload) {
  try {
    await handleCheckoutResponseForPrinting(payload, {
      interactive: false,
      receiptStyle: "market",
    });
    return true;
  } catch (err) {
    console.warn(
      "[PaymentPage] Печать не удалась, запрашиваем выбор USB-принтера:",
      err,
    );
    const connected = await ensurePrinterConnectedInteractively();
    if (!connected) return false;

    try {
      await handleCheckoutResponseForPrinting(payload, {
        interactive: false,
        receiptStyle: "market",
      });
      return true;
    } catch (err2) {
      console.warn("[PaymentPage] Повторная печать не удалась:", err2);
      return false;
    }
  }
}
