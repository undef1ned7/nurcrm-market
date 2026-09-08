/**
 * Скидки строк чека и эвристика «разница цены ≠ скидка».
 *
 * Явный флаг ручной цены с бэка пока не гарантирован — см.
 * docs/backend/receipt-price-override-flag.md
 */

export const toReceiptNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const TRUTHY_FLAG = new Set(["1", "true", "yes"]);

/**
 * Поля, которые бэк уже мог начать отдавать (или отдаст) как сигнал
 * «кассир вручную сменил цену, это не скидка».
 */
export function isPriceManuallyEdited(item: any): boolean {
  if (!item || typeof item !== "object") return false;

  if (
    item.price_manually_edited === true ||
    item.is_price_edited === true ||
    item.unit_price_edited === true ||
    item.price_edited === true ||
    item.price_override === true
  ) {
    return true;
  }

  for (const key of [
    "price_manually_edited",
    "is_price_edited",
    "unit_price_edited",
    "price_edited",
    "price_override",
  ]) {
    const raw = item[key];
    if (raw == null || raw === false) continue;
    if (TRUTHY_FLAG.has(String(raw).trim().toLowerCase())) return true;
  }

  const reason = String(
    item.price_override_reason ?? item.price_edit_reason ?? "",
  )
    .trim()
    .toLowerCase();
  return reason === "manual" || reason === "price_override" || reason === "cashier";
}

export function readExplicitLineDiscount(item: any): number {
  return Math.max(
    0,
    toReceiptNum(
      item?.line_discount ?? item?.discount_total ?? item?.line_discount_total,
    ),
  );
}

/**
 * Временная эвристика до появления `price_manually_edited` / `price_override_reason` с бэка.
 *
 * Если явной скидки нет, но `line_total < price × qty`, считаем разницу скидкой.
 * Это ломается, когда разрыв — ручная смена цены, а `price` остался каталожным.
 * Не вызывать, если `isPriceManuallyEdited(item)` уже true.
 */
export function inferDiscountFromPriceDiff(opts: {
  explicitDiscount: number;
  unitPrice: number;
  qty: number;
  lineTotal: number | null;
  item?: any;
}): number {
  const explicit = Math.max(0, toReceiptNum(opts.explicitDiscount));
  if (explicit > 0) return explicit;
  if (isPriceManuallyEdited(opts.item)) return 0;

  const lineTotal = opts.lineTotal;
  if (lineTotal == null || !Number.isFinite(lineTotal)) return 0;

  const qty = toReceiptNum(opts.qty) || 1;
  const gross = Math.max(0, qty * toReceiptNum(opts.unitPrice));
  if (gross > lineTotal + 1e-9) return gross - lineTotal;
  return 0;
}
