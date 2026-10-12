/**
 * Способ оплаты при погашении долга: наличными или переводом с конкретного банка.
 * Используется в модалке «Оплатить» (/crm/debts) и в модалке долга клиента/сделки
 * (/crm/clients/{id} → «Долг»). Контракт для бэка:
 * docs/backend/kassa/debt-payment-method-backend.md
 */
export type DebtPayMethod = "cash" | "transfer";

/** Банки для перевода. id совпадает с checkout-конвенцией кассы. */
export const DEBT_PAYMENT_BANKS: { id: string; name: string }[] = [
  { id: "mbank", name: "МБанк" },
  { id: "optima", name: "Оптима Банк" },
  { id: "obank", name: "О!Банк" },
  { id: "bakai", name: "Бакай Банк" },
  { id: "demir", name: "Демир Банк" },
  { id: "other", name: "Другой банк" },
];

export const DEBT_PAY_BANK_DEFAULT = "mbank";

/**
 * Приводит выбор (способ + банк) к значению `payment_method` для API.
 * Наличные → "cash"; перевод → id банка (или "transfer", если банк не выбран).
 */
export const resolveDebtPaymentMethod = (
  method: DebtPayMethod,
  bankId: string,
): string => (method === "cash" ? "cash" : bankId || "transfer");

/** Человекочитаемая метка способа оплаты для имени кассовой операции. */
export const debtPaymentMethodLabel = (
  method: DebtPayMethod,
  bankId: string,
): string => {
  if (method === "cash") return "Наличные";
  const bank = DEBT_PAYMENT_BANKS.find((b) => b.id === bankId);
  return bank ? bank.name : "Перевод";
};
