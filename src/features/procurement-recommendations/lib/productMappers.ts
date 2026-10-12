import type { LastPurchase, ProcurementRecommendationItem } from "../model/types";
import {
  extractPackSize,
  isWeightProduct,
  sanitizeNonNegative,
  toFiniteNumber,
} from "./recommendationMath";
import { formatUnit } from "./formatRecommendation";

export function listFrom(res: { data?: unknown } | unknown): unknown[] {
  const data =
    res && typeof res === "object" && "data" in res
      ? (res as { data?: unknown }).data
      : res;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: unknown[] }).results;
  }
  return [];
}

export function buildSupplierLabel(supplier: {
  full_name?: unknown;
  name?: unknown;
  company_name?: unknown;
  phone?: unknown;
  email?: unknown;
} | null | undefined): string {
  if (!supplier || typeof supplier !== "object") return "Без названия";
  return (
    String(
      supplier.full_name ||
        supplier.name ||
        supplier.company_name ||
        supplier.phone ||
        supplier.email ||
        "Без названия",
    ).trim() || "Без названия"
  );
}

export function buildProductLabel(product: {
  name?: unknown;
  title?: unknown;
  product_name?: unknown;
  code?: unknown;
} | null | undefined): string {
  return (
    String(
      product?.name ||
        product?.title ||
        product?.product_name ||
        product?.code ||
        "Товар",
    ).trim() || "Товар"
  );
}

function readLastPurchase(product: Record<string, unknown>): LastPurchase | null {
  const nested =
    (product.last_purchase as Record<string, unknown> | undefined) ||
    (product.lastPurchase as Record<string, unknown> | undefined);
  const batches = Array.isArray(product.purchase_batches)
    ? product.purchase_batches
    : [];
  const batch = nested || (batches[0] as Record<string, unknown> | undefined);
  if (!batch || typeof batch !== "object") return null;
  const date = String(
    batch.date || batch.created_at || batch.purchased_at || "",
  ).trim();
  if (!date) return null;
  const quantity = sanitizeNonNegative(batch.quantity ?? batch.qty);
  const purchasePriceRaw = batch.purchase_price ?? batch.purchasePrice;
  const purchasePrice =
    purchasePriceRaw == null || purchasePriceRaw === ""
      ? null
      : toFiniteNumber(purchasePriceRaw, NaN);
  return {
    date,
    quantity,
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : null,
  };
}

export function mapSupplierProductToRecommendationItem(
  product: Record<string, unknown>,
  sales: {
    sales7d: number;
    sales14d: number;
    sales30d: number;
    previous7d: number;
    previous14d: number;
    previous30d: number;
  },
): ProcurementRecommendationItem | null {
  const productId = String(product.id ?? product.uuid ?? "").trim();
  if (!productId) return null;
  const purchasePriceRaw = product.purchase_price ?? product.purchasePrice;
  const purchasePrice =
    purchasePriceRaw == null || purchasePriceRaw === ""
      ? null
      : toFiniteNumber(purchasePriceRaw, NaN);

  return {
    productId,
    productName: buildProductLabel(product),
    barcode: product.barcode ? String(product.barcode) : undefined,
    article: product.article ? String(product.article) : undefined,
    code: product.code ? String(product.code) : undefined,
    unit: formatUnit(product.unit),
    isWeight: isWeightProduct(product),
    currentStock: sanitizeNonNegative(product.quantity ?? product.stock),
    sales7d: sanitizeNonNegative(sales.sales7d),
    sales14d: sanitizeNonNegative(sales.sales14d),
    sales30d: sanitizeNonNegative(sales.sales30d),
    previous7d: sanitizeNonNegative(sales.previous7d),
    previous14d: sanitizeNonNegative(sales.previous14d),
    previous30d: sanitizeNonNegative(sales.previous30d),
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : null,
    packSize: extractPackSize(product),
    lastPurchase: readLastPurchase(product),
  };
}
