/**
 * Расчёт окна обмена до отправки на сервер. Сервер считает окончательно и
 * возвращает returned_amount / new_amount / difference — их и показываем
 * после проведения. Здесь — предварительный итог для кассира.
 */

const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ExchangeReturnRow = {
  id: string;
  name: string;
  /** Цена за единицу с учётом скидки строки. */
  unitPrice: number;
  /** Сколько ещё можно вернуть (returnable_qty). */
  returnable: number;
};

export type ExchangeNewLine = {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  qty: string;
};

/** Строка продажи → строка «что возвращают». */
export const toExchangeReturnRow = (item: any, name: string): ExchangeReturnRow => {
  const sold = num(item?.quantity ?? item?.qty);
  const returned = num(item?.returned_qty ?? item?.returned_quantity ?? item?.refunded_qty);
  const explicit = item?.returnable_qty ?? item?.returnable_quantity ?? item?.available_qty;
  const returnable = explicit != null ? num(explicit) : Math.max(0, sold - returned);
  const lineTotal = item?.line_total ?? item?.total;
  const unitPrice =
    lineTotal != null && sold > 0 ? num(lineTotal) / sold : num(item?.unit_price ?? item?.price);
  return {
    id: String(item?.id ?? item?.sale_item_id ?? ""),
    name,
    unitPrice: round2(unitPrice),
    returnable: Math.max(0, returnable),
  };
};

/** Количество из поля ввода: положительное число или 0 (пусто/мусор). */
export const parseQty = (raw: unknown): number => {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return 0;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export type ExchangeTotals = {
  returned: number;
  added: number;
  /** > 0 — доплата покупателя, < 0 — сдача покупателю. */
  difference: number;
};

export const computeExchangeTotals = (
  rows: ExchangeReturnRow[],
  returnQty: Record<string, string>,
  lines: ExchangeNewLine[],
): ExchangeTotals => {
  const returned = rows.reduce(
    (s, r) => s + Math.min(parseQty(returnQty[r.id]), r.returnable) * r.unitPrice,
    0,
  );
  const added = lines.reduce((s, l) => s + parseQty(l.qty) * l.price, 0);
  return {
    returned: round2(returned),
    added: round2(added),
    difference: round2(added - returned),
  };
};

export type ExchangeValidationError =
  | "noReturn"
  | "noNew"
  | "exceedsReturnable"
  | "badNewQty";

export const validateExchange = (
  rows: ExchangeReturnRow[],
  returnQty: Record<string, string>,
  lines: ExchangeNewLine[],
): ExchangeValidationError | null => {
  const anyReturn = rows.some((r) => parseQty(returnQty[r.id]) > 0);
  if (!anyReturn) return "noReturn";
  if (rows.some((r) => parseQty(returnQty[r.id]) > r.returnable)) return "exceedsReturnable";
  if (!lines.length) return "noNew";
  if (lines.some((l) => parseQty(l.qty) <= 0)) return "badNewQty";
  return null;
};

/** Тело POST …/exchange/. Количества — строками, как шлёт касса NurMarket. */
export const buildExchangePayload = (
  rows: ExchangeReturnRow[],
  returnQty: Record<string, string>,
  lines: ExchangeNewLine[],
  method: "cash" | "transfer",
) => ({
  return_items: rows
    .filter((r) => parseQty(returnQty[r.id]) > 0)
    .map((r) => ({ item: r.id, qty: String(parseQty(returnQty[r.id])) })),
  new_items: lines.map((l) => ({
    product: l.productId,
    ...(l.variantId ? { variant: l.variantId } : {}),
    qty: String(parseQty(l.qty)),
  })),
  payment: { method },
});
