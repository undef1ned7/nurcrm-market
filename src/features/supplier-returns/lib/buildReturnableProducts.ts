import type { ReturnableProduct, SupplierReturn } from "../model/types";
import { productLabel } from "./formatReturn";
import {
  isWeightProduct,
  returnableQty,
  sanitizeNonNegative,
  toFiniteNumber,
} from "./returnMath";
import { alreadyReturnedQtyForProduct } from "../api/localStore";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const pickId = (value: unknown): string => {
  const row = asRecord(value);
  return String(row?.id ?? row?.uuid ?? value ?? "").trim();
};

const receiptItemProductId = (item: Record<string, unknown>): string => {
  const product = asRecord(item.product);
  return String(
    item.product_id ?? item.productId ?? product?.id ?? product?.uuid ?? "",
  ).trim();
};

export function buildReturnableProducts({
  products,
  receipt,
  existingReturns,
  receiptId,
}: {
  products: unknown[];
  receipt?: unknown;
  existingReturns: SupplierReturn[];
  receiptId?: string | null;
}): ReturnableProduct[] {
  const receiptRow = asRecord(receipt);
  const receiptItems = Array.isArray(receiptRow?.items)
    ? (receiptRow?.items as unknown[])
    : Array.isArray(receiptRow?.lines)
      ? (receiptRow?.lines as unknown[])
      : [];

  if (receiptId && receiptItems.length > 0) {
    const fromReceipt: ReturnableProduct[] = [];
    receiptItems.forEach((raw) => {
        const item = asRecord(raw);
        if (!item) return;
        const productId = receiptItemProductId(item);
        if (!productId) return;
        const catalog =
          products.find((product) => pickId(product) === productId) || null;
        const catalogRow = asRecord(catalog);
        const currentStock = sanitizeNonNegative(
          catalogRow?.quantity ?? catalogRow?.stock ?? item.current_stock,
        );
        const purchasedQty = sanitizeNonNegative(item.qty ?? item.quantity);
        const alreadyReturnedQty = alreadyReturnedQtyForProduct({
          rows: existingReturns,
          productId,
          receiptId,
          receiptItemId: pickId(item) || null,
        });
        const purchasePrice = toFiniteNumber(
          item.purchase_price ??
            item.purchasePrice ??
            catalogRow?.purchase_price ??
            catalogRow?.price,
          0,
        );
        fromReceipt.push({
          productId,
          productName: productLabel({
            product_name: item.product_name,
            name: catalogRow?.name,
            title: catalogRow?.title,
            productName: catalogRow?.product_name,
          }),
          barcode: String(catalogRow?.barcode ?? item.barcode ?? ""),
          article: String(catalogRow?.article ?? item.article ?? ""),
          code: String(catalogRow?.code ?? ""),
          unit: String(item.unit ?? catalogRow?.unit ?? "шт") || "шт",
          isWeight: isWeightProduct(catalogRow) || isWeightProduct(item),
          currentStock,
          purchasePrice,
          purchasedQty,
          alreadyReturnedQty,
          returnableQty: returnableQty({
            stock: currentStock,
            purchasedQty,
            alreadyReturnedQty,
          }),
          receiptItemId: pickId(item) || null,
        });
    });
    return fromReceipt;
  }

  const fromCatalog: ReturnableProduct[] = [];
  products.forEach((raw) => {
      const product = asRecord(raw);
      if (!product) return;
      const productId = pickId(product);
      if (!productId) return;
      const currentStock = sanitizeNonNegative(product.quantity ?? product.stock);
      const alreadyReturnedQty = alreadyReturnedQtyForProduct({
        rows: existingReturns,
        productId,
        receiptId: receiptId || null,
      });
      fromCatalog.push({
        productId,
        productName: productLabel(product),
        barcode: String(product.barcode ?? ""),
        article: String(product.article ?? ""),
        code: String(product.code ?? ""),
        unit: String(product.unit ?? "шт") || "шт",
        isWeight: isWeightProduct(product),
        currentStock,
        purchasePrice: toFiniteNumber(product.purchase_price ?? product.price, 0),
        purchasedQty: null,
        alreadyReturnedQty,
        returnableQty: returnableQty({
          stock: currentStock,
          purchasedQty: null,
          alreadyReturnedQty,
        }),
        receiptItemId: null,
      });
  });
  return fromCatalog;
}
