/**
 * Нормализация позиций чека и сопоставление eKassa 1059 ↔ payload.items.
 */

import {
  inferDiscountFromPriceDiff,
  readExplicitLineDiscount,
  toReceiptNum,
} from "./receiptDiscount";
import { formatSaleItemName } from "@entities/sale";

const fromTyiyn = (v: unknown) => toReceiptNum(v) / 100;

export type MergeStrategy = "id" | "index" | "name+qty" | "none";

export type MappedReceiptItem = {
  name: string;
  qty: number;
  price: number;
  total: number;
  line_discount_pct: number;
  line_discount_amount: number;
};

/** Стабильный id строки (не product_id / barcode — они повторяются). */
export function readReceiptLineId(item: any): string {
  if (!item || typeof item !== "object") return "";
  const raw =
    item.item_id ??
    item.line_id ??
    item.sale_item_id ??
    item.saleItemId ??
    item.itemId ??
    item.lineId ??
    (typeof item.id === "string" || typeof item.id === "number" ? item.id : null);
  if (raw == null) return "";
  const s = String(raw).trim();
  return s && s !== "undefined" && s !== "null" ? s : "";
}

/** Строка чека маркета: скидка как в eKassa, те же поля что при fiscal merge. */
export function mapMarketReceiptItem(it: any): MappedReceiptItem {
  const qty = toReceiptNum(it?.qty ?? it?.quantity) || 1;
  const unitPrice = toReceiptNum(it?.unit_price ?? it?.price);
  const lineTotalRaw =
    it?.line_total != null && it?.line_total !== ""
      ? it.line_total
      : it?.total != null && it?.total !== ""
        ? it.total
        : null;
  const lineTotalNum =
    lineTotalRaw != null ? toReceiptNum(lineTotalRaw) : null;
  const explicit = readExplicitLineDiscount(it);
  const lineDiscountAmt = inferDiscountFromPriceDiff({
    explicitDiscount: explicit,
    unitPrice,
    qty,
    lineTotal: lineTotalNum,
    item: it,
  });
  const grossLine = Math.max(0, qty * unitPrice);
  const lineDiscountPct =
    it?.line_discount_pct != null && it?.line_discount_pct !== ""
      ? toReceiptNum(it.line_discount_pct)
      : lineDiscountAmt > 0 && grossLine > 0
        ? (lineDiscountAmt / grossLine) * 100
        : 0;
  const total =
    lineTotalNum != null && Number.isFinite(lineTotalNum)
      ? lineTotalNum
      : Math.max(0, grossLine - lineDiscountAmt);
  return {
    name: formatSaleItemName(
      { ...it, product_name: it?.name ?? it?.product_name },
      "Товар",
    ),
    qty,
    price: unitPrice,
    total,
    line_discount_pct: lineDiscountPct,
    line_discount_amount: lineDiscountAmt,
  };
}

function namesAndQtyMatch(payloadItem: any, name: string, qty: number): boolean {
  const nm = String(payloadItem?.name ?? payloadItem?.product_name ?? "").trim();
  const q = toReceiptNum(payloadItem?.qty ?? payloadItem?.quantity) || 1;
  return nm === name && q === qty;
}

export function matchPayloadItemForEkassaLine(opts: {
  ekassaItem: any;
  ekassaName: string;
  ekassaQty: number;
  index: number;
  payloadItems: any[];
  usedPayloadIndexes: Set<number>;
  sameLength: boolean;
}): { item: any | null; strategy: MergeStrategy } {
  const { payloadItems, usedPayloadIndexes } = opts;
  if (!payloadItems.length) return { item: null, strategy: "none" };

  const ekassaId = readReceiptLineId(opts.ekassaItem);
  if (ekassaId) {
    const found = payloadItems.findIndex(
      (p, i) => !usedPayloadIndexes.has(i) && readReceiptLineId(p) === ekassaId,
    );
    if (found >= 0) {
      usedPayloadIndexes.add(found);
      return { item: payloadItems[found], strategy: "id" };
    }
  }

  // Индекс в рамках одного ответа обычно стабильнее имени (два одинаковых товара).
  if (opts.sameLength && !usedPayloadIndexes.has(opts.index)) {
    const byIndex = payloadItems[opts.index];
    if (byIndex) {
      usedPayloadIndexes.add(opts.index);
      return { item: byIndex, strategy: "index" };
    }
  }

  const nm = opts.ekassaName.trim();
  const found = payloadItems.findIndex(
    (p, i) =>
      !usedPayloadIndexes.has(i) && namesAndQtyMatch(p, nm, opts.ekassaQty),
  );
  if (found >= 0) {
    usedPayloadIndexes.add(found);
    return { item: payloadItems[found], strategy: "name+qty" };
  }

  return { item: null, strategy: "none" };
}

export function mergeEkassaItemsWithPayload(
  ekassaLines: any[],
  payloadItems: any[] | null,
): { items: MappedReceiptItem[]; strategies: MergeStrategy[] } {
  const source = Array.isArray(payloadItems) ? payloadItems : [];
  const used = new Set<number>();
  const sameLength = source.length === ekassaLines.length;
  const strategies: MergeStrategy[] = [];

  const items = ekassaLines.map((it, idx) => {
    const qty = toReceiptNum(it?.["1023"]) || 1;
    // В ответах eKassa для Маркета часто:
    // 1043 = сумма позиции, 1076 = цена за единицу.
    const raw1043 = fromTyiyn(it?.["1043"]);
    const raw1076 = fromTyiyn(it?.["1076"]);
    const price = raw1076 > 0 ? raw1076 : qty > 0 ? raw1043 / qty : raw1043;
    const total = raw1043 > 0 ? raw1043 : price * qty;
    const base: MappedReceiptItem = {
      name: String(it?.["1030"] || "Товар"),
      qty,
      price,
      total,
      line_discount_pct: 0,
      line_discount_amount: 0,
    };

    const { item: src, strategy } = matchPayloadItemForEkassaLine({
      ekassaItem: it,
      ekassaName: base.name,
      ekassaQty: qty,
      index: idx,
      payloadItems: source,
      usedPayloadIndexes: used,
      sameLength,
    });
    strategies.push(strategy);
    if (!src) return base;
    const mapped = mapMarketReceiptItem({
      ...src,
      qty,
      price,
      unit_price: price,
    });
    return {
      ...base,
      line_discount_pct: mapped.line_discount_pct,
      line_discount_amount: mapped.line_discount_amount,
      total: mapped.total,
    };
  });

  return { items, strategies };
}

export function warnIfEkassaDiscountMismatch(opts: {
  lineDiscountSum: number;
  orderDiscount: number;
  strategies: MergeStrategy[];
}): void {
  const usedNameFallback = opts.strategies.includes("name+qty");
  if (usedNameFallback) {
    console.warn(
      "[PrintService] eKassa items matched by name+qty; line discounts may attach to the wrong row",
      opts,
    );
  }
  if (
    opts.orderDiscount > 0 &&
    opts.lineDiscountSum > opts.orderDiscount + 0.05
  ) {
    console.warn(
      "[PrintService] eKassa line discounts exceed order-level discount after merge",
      {
        lineDiscountSum: opts.lineDiscountSum,
        orderDiscount: opts.orderDiscount,
        strategies: opts.strategies,
      },
    );
  }
}
