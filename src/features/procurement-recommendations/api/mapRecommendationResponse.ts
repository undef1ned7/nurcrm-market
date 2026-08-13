import { mapSupplierProductToRecommendationItem } from "../lib/productMappers";
import {
  extractPackSize,
  isWeightProduct,
  sanitizeNonNegative,
  toFiniteNumber,
} from "../lib/recommendationMath";
import { formatUnit } from "../lib/formatRecommendation";
import type {
  LastPurchase,
  ProcurementRecommendationItem,
  ProcurementRecommendationPayload,
} from "../model/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readLastPurchase(raw: unknown): LastPurchase | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const date = String(rec.date || rec.created_at || rec.purchased_at || "").trim();
  if (!date) return null;
  const quantity = sanitizeNonNegative(rec.quantity ?? rec.qty);
  const priceRaw = rec.purchase_price ?? rec.purchasePrice;
  const purchasePrice =
    priceRaw == null || priceRaw === "" ? null : toFiniteNumber(priceRaw, NaN);
  return {
    date,
    quantity,
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : null,
  };
}

function mapBackendItem(raw: unknown): ProcurementRecommendationItem | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const productId = String(
    rec.product_id ?? rec.productId ?? rec.id ?? "",
  ).trim();
  if (!productId) return null;

  const sales = asRecord(rec.sales) || {};
  const lastPurchase = readLastPurchase(rec.last_purchase ?? rec.lastPurchase);
  const purchasePriceRaw =
    rec.purchase_price ?? rec.purchasePrice ?? lastPurchase?.purchasePrice;
  const purchasePrice =
    purchasePriceRaw == null || purchasePriceRaw === ""
      ? null
      : toFiniteNumber(purchasePriceRaw, NaN);

  const sales7d = sanitizeNonNegative(
    sales.last_7_days ?? sales.sales7d ?? rec.sales7d,
  );
  const sales30d = sanitizeNonNegative(
    sales.last_30_days ?? sales.sales30d ?? rec.sales30d,
  );
  const sales14d = sanitizeNonNegative(
    sales.last_14_days ?? sales.sales14d ?? rec.sales14d ?? sales7d + (sales30d - sales7d) * (7 / 23),
  );

  return {
    productId,
    productName: String(
      rec.product_name || rec.productName || rec.name || "Товар",
    ).trim() || "Товар",
    barcode: rec.barcode ? String(rec.barcode) : undefined,
    article: rec.article ? String(rec.article) : undefined,
    code: rec.code ? String(rec.code) : undefined,
    unit: formatUnit(rec.unit),
    isWeight: isWeightProduct(rec),
    currentStock: sanitizeNonNegative(
      rec.current_stock ?? rec.currentStock ?? rec.quantity,
    ),
    sales7d,
    sales14d,
    sales30d,
    previous7d: sanitizeNonNegative(
      sales.previous_7_days ?? sales.previous7d ?? rec.previous7d,
    ),
    previous14d: sanitizeNonNegative(
      sales.previous_14_days ?? sales.previous14d ?? rec.previous14d,
    ),
    previous30d: sanitizeNonNegative(
      sales.previous_30_days ??
        sales.previous_period ??
        sales.previousPeriod ??
        rec.previous30d,
    ),
    purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : null,
    packSize: extractPackSize(rec),
    lastPurchase,
  };
}

export function mapRecommendationResponse(
  data: unknown,
  fallbackSupplier: { id: string; name: string },
): ProcurementRecommendationPayload {
  const rec = asRecord(data) || {};
  const supplierRec = asRecord(rec.supplier);
  const results = Array.isArray(rec.results)
    ? rec.results
    : Array.isArray(rec.items)
      ? rec.items
      : Array.isArray(data)
        ? data
        : [];

  const items = results
    .map((row) => mapBackendItem(row))
    .filter((row): row is ProcurementRecommendationItem => Boolean(row));

  return {
    supplier: {
      id: String(supplierRec?.id || fallbackSupplier.id),
      name: String(
        supplierRec?.name ||
          supplierRec?.full_name ||
          fallbackSupplier.name,
      ),
    },
    source: "backend",
    items,
  };
}

export { mapSupplierProductToRecommendationItem };
