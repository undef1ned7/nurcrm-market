import { WEIGHT_QTY_DECIMALS } from "../model/constants";
import type { AnalysisDays, ProcurementRecommendationItem } from "../model/types";

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function sanitizeNonNegative(value: unknown): number {
  const n = toFiniteNumber(value, 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function roundWeight(value: number): number {
  const factor = 10 ** WEIGHT_QTY_DECIMALS;
  return Math.round(sanitizeNonNegative(value) * factor) / factor;
}

export function calculateAverageDailySales(
  salesQty: unknown,
  analysisDays: unknown,
): number {
  const sales = sanitizeNonNegative(salesQty);
  const days = toFiniteNumber(analysisDays, 0);
  if (days <= 0) return 0;
  return sales / days;
}

export function calculateDaysOfStock(
  currentStock: unknown,
  averageDailySales: unknown,
): number | null {
  const stock = sanitizeNonNegative(currentStock);
  const avg = sanitizeNonNegative(averageDailySales);
  if (avg <= 0) return null;
  return stock / avg;
}

export function calculateSalesTrendPercent(
  currentPeriodSales: unknown,
  previousPeriodSales: unknown,
): number | null {
  const current = sanitizeNonNegative(currentPeriodSales);
  const previous = sanitizeNonNegative(previousPeriodSales);
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function calculateRawRecommendedQuantity({
  averageDailySales,
  coverageDays,
  safetyDays,
  currentStock,
}: {
  averageDailySales: unknown;
  coverageDays: unknown;
  safetyDays: unknown;
  currentStock: unknown;
}): number {
  const avg = sanitizeNonNegative(averageDailySales);
  const coverage = Math.max(0, toFiniteNumber(coverageDays, 0));
  const safety = Math.max(0, toFiniteNumber(safetyDays, 0));
  const stock = sanitizeNonNegative(currentStock);
  const raw = avg * (coverage + safety) - stock;
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw;
}

export function roundToPackSize(
  qty: unknown,
  packSize: unknown,
  isWeight: boolean,
): number {
  const value = sanitizeNonNegative(qty);
  if (value === 0) return 0;
  if (isWeight) return roundWeight(value);

  const pack = sanitizeNonNegative(packSize);
  if (pack > 1) {
    return Math.ceil(value / pack - 1e-9) * pack;
  }
  return Math.ceil(value - 1e-9);
}

export function calculateRecommendedQuantity({
  averageDailySales,
  coverageDays,
  safetyDays,
  currentStock,
  packSize,
  isWeight,
}: {
  averageDailySales: unknown;
  coverageDays: unknown;
  safetyDays: unknown;
  currentStock: unknown;
  packSize?: unknown;
  isWeight: boolean;
}): number {
  const raw = calculateRawRecommendedQuantity({
    averageDailySales,
    coverageDays,
    safetyDays,
    currentStock,
  });
  return roundToPackSize(raw, packSize, isWeight);
}

export function pickSalesForAnalysisPeriod(
  item: Pick<
    ProcurementRecommendationItem,
    | "sales7d"
    | "sales14d"
    | "sales30d"
    | "previous7d"
    | "previous14d"
    | "previous30d"
  >,
  analysisDays: AnalysisDays,
): { current: number; previous: number } {
  if (analysisDays === 7) {
    return {
      current: sanitizeNonNegative(item.sales7d),
      previous: sanitizeNonNegative(item.previous7d),
    };
  }
  if (analysisDays === 14) {
    return {
      current: sanitizeNonNegative(item.sales14d),
      previous: sanitizeNonNegative(item.previous14d),
    };
  }
  return {
    current: sanitizeNonNegative(item.sales30d),
    previous: sanitizeNonNegative(item.previous30d),
  };
}

export function isWeightProduct(product: {
  is_weight?: unknown;
  isWeight?: unknown;
  scale_type?: unknown;
  scaleType?: unknown;
}): boolean {
  if (product?.is_weight === true || product?.isWeight === true) return true;
  const scaleType = String(product?.scale_type ?? product?.scaleType ?? "")
    .trim()
    .toLowerCase();
  return scaleType === "weight";
}

export function extractPackSize(product: {
  packages?: unknown;
  pack_size?: unknown;
  packSize?: unknown;
}): number | null {
  const direct = sanitizeNonNegative(product?.pack_size ?? product?.packSize);
  if (direct > 1) return direct;
  const packages = Array.isArray(product?.packages) ? product.packages : [];
  for (const pkg of packages) {
    const qty = sanitizeNonNegative(
      pkg?.quantity_in_package ?? pkg?.quantityInPackage,
    );
    if (qty > 1) return qty;
  }
  return null;
}
