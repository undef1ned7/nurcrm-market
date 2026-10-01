/**
 * Разбивка смены по способам оплаты: сколько раз и на какую сумму.
 * Источник: shift.payment_breakdown с бэка, иначе агрегат продаж.
 */

export const SHIFT_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
  cashless: "Безналичные",
  mbank: "МБанк",
  optima: "Оптима Банк",
  obank: "О-Банк",
  bakai: "Бакай Банк",
  demir: "Демир Банк",
  other: "Другой банк",
  debt: "Отсрочка",
  deferred: "Отсрочка",
  split: "Смешанная",
};

const SKIP_STATUSES = new Set([
  "canceled",
  "cancelled",
  "refunded",
  "returned",
]);

export type ShiftPaymentBreakdownRow = {
  method: string;
  label: string;
  count: number;
  amount: number;
};

export const normalizeShiftPaymentMethod = (raw: unknown) => {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!key) return "cash";
  if (key === "deferred") return "debt";
  return key;
};

export const shiftPaymentMethodLabel = (method: unknown) => {
  const key = normalizeShiftPaymentMethod(method);
  return SHIFT_PAYMENT_METHOD_LABELS[key] || String(method || "Оплата");
};

/** «12 раз» / «3 раза» / «21 раз» */
export const timesLabel = (count: unknown) => {
  const n = Math.abs(Math.trunc(Number(count) || 0));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 > 10 && mod100 < 20) return `${n} раз`;
  if (mod10 === 1) return `${n} раз`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} раза`;
  return `${n} раз`;
};

export const formatShiftMoney = (value: unknown) => {
  const n = Number(value);
  const amount = Number.isFinite(n) ? n : 0;
  return `${amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} сом`;
};

const saleAmount = (sale: any) => {
  const n = parseFloat(String(sale?.total ?? sale?.amount ?? 0));
  return Number.isFinite(n) ? n : 0;
};

export const isSkippedSale = (sale: any) => {
  const status = String(sale?.status ?? "")
    .trim()
    .toLowerCase();
  return SKIP_STATUSES.has(status);
};

const paymentEntries = (sale: any) => {
  const payments = sale?.payments;
  if (!Array.isArray(payments)) return [];
  return payments
    .map((item: any) => ({
      method: normalizeShiftPaymentMethod(item?.method ?? item?.payment_method),
      amount: saleAmount({ total: item?.amount }),
    }))
    .filter((item: any) => item.method);
};

export const isSplitSale = (sale: any) => {
  const methods = new Set(paymentEntries(sale).map((item: any) => item.method));
  return methods.size > 1;
};

const emptyRow = (method: string): ShiftPaymentBreakdownRow => ({
  method,
  label: shiftPaymentMethodLabel(method),
  count: 0,
  amount: 0,
});

export const aggregateSalesPaymentBreakdown = (
  sales: any,
): ShiftPaymentBreakdownRow[] => {
  const map = new Map<string, ShiftPaymentBreakdownRow>();

  const add = (method: string, amount: number, countDelta: number) => {
    const key = normalizeShiftPaymentMethod(method);
    const prev = map.get(key) || emptyRow(key);
    prev.count += countDelta;
    prev.amount += amount;
    map.set(key, prev);
  };

  for (const sale of Array.isArray(sales) ? sales : []) {
    if (isSkippedSale(sale)) continue;
    const amount = saleAmount(sale);
    if (isSplitSale(sale)) {
      add("split", amount, 1);
      continue;
    }
    const entries = paymentEntries(sale);
    const method =
      sale?.payment_method ||
      sale?.paymentMethod ||
      entries[0]?.method ||
      "cash";
    add(method, amount, 1);
  }

  return [...map.values()]
    .filter((row) => row.count > 0 || row.amount > 0)
    .sort((a, b) => b.amount - a.amount || b.count - a.count);
};

export const parseApiPaymentBreakdown = (
  raw: unknown,
): ShiftPaymentBreakdownRow[] => {
  if (!Array.isArray(raw)) return [];

  const rows = raw
    .map((item: any) => {
      const method = normalizeShiftPaymentMethod(
        item?.method ?? item?.payment_method,
      );
      const count = Math.max(0, Math.trunc(Number(item?.count) || 0));
      const amount = Number(item?.amount);
      return {
        method,
        label:
          String(item?.label || "").trim() || shiftPaymentMethodLabel(method),
        count,
        amount: Number.isFinite(amount) ? amount : 0,
      } as ShiftPaymentBreakdownRow;
    })
    .filter((row) => row.count > 0 || row.amount > 0);

  return rows;
};

export const resolveShiftPaymentBreakdown = (
  shift: any,
  salesFallback: any = [],
): ShiftPaymentBreakdownRow[] => {
  if (Array.isArray(shift?.payment_breakdown)) {
    return parseApiPaymentBreakdown(shift.payment_breakdown);
  }
  return aggregateSalesPaymentBreakdown(salesFallback);
};

export const formatPaymentBreakdownMessage = (
  rows: ShiftPaymentBreakdownRow[],
) => {
  if (!rows.length) return "Оплат за смену нет";
  return rows
    .map(
      (row) =>
        `${row.label} — ${timesLabel(row.count)} (${formatShiftMoney(row.amount)})`,
    )
    .join("\n");
};
