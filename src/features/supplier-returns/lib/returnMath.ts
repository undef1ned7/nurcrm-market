export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const num = Number(String(value).replace(",", "."));
  return Number.isFinite(num) ? num : fallback;
}

export function sanitizeNonNegative(value: unknown): number {
  return Math.max(0, toFiniteNumber(value, 0));
}

export function isWeightProduct(product: {
  is_weight?: unknown;
  isWeight?: unknown;
  scale_type?: unknown;
  scaleType?: unknown;
} | null | undefined): boolean {
  if (!product || typeof product !== "object") return false;
  if (product.is_weight === true || product.isWeight === true) return true;
  const scale = String(product.scale_type ?? product.scaleType ?? "").toLowerCase();
  return scale === "weight";
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function lineTotal(qty: number, purchasePrice: number): number {
  return roundMoney(sanitizeNonNegative(qty) * sanitizeNonNegative(purchasePrice));
}

export function returnableQty({
  stock,
  purchasedQty,
  alreadyReturnedQty = 0,
}: {
  stock: number;
  purchasedQty?: number | null;
  alreadyReturnedQty?: number;
}): number {
  const stockQty = sanitizeNonNegative(stock);
  const returned = sanitizeNonNegative(alreadyReturnedQty);
  if (purchasedQty == null || !Number.isFinite(Number(purchasedQty))) {
    return stockQty;
  }
  const remainingFromReceipt = Math.max(0, sanitizeNonNegative(purchasedQty) - returned);
  return Math.min(stockQty, remainingFromReceipt);
}

export function isQtyAllowed(qty: number, isWeight: boolean): boolean {
  if (!Number.isFinite(qty) || qty <= 0) return false;
  if (isWeight) return true;
  return Number.isInteger(qty);
}

export function validateReturnQty({
  qty,
  maxQty,
  isWeight,
  unit = "шт",
}: {
  qty: number;
  maxQty: number;
  isWeight: boolean;
  unit?: string;
}): string | null {
  if (!Number.isFinite(qty) || qty <= 0) {
    return "Укажите количество больше 0";
  }
  if (!isWeight && !Number.isInteger(qty)) {
    return "Для штучного товара количество должно быть целым";
  }
  if (qty > maxQty) {
    return `Нельзя вернуть больше ${maxQty} ${unit || "шт"}`;
  }
  return null;
}

export function sumReturnItems(
  items: Array<{ qty?: unknown; purchasePrice?: unknown; purchase_price?: unknown }>,
): number {
  return roundMoney(
    items.reduce((sum, item) => {
      const qty = sanitizeNonNegative(item.qty);
      const price = sanitizeNonNegative(item.purchasePrice ?? item.purchase_price);
      return sum + qty * price;
    }, 0),
  );
}
 