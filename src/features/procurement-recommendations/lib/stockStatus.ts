import {
  CRITICAL_DAYS_OF_STOCK,
  ENDING_DAYS_OF_STOCK,
} from "../model/constants";
import type { StockStatus } from "../model/types";
import { sanitizeNonNegative } from "./recommendationMath";

export function resolveStockStatus({
  currentStock,
  daysOfStock,
  recommendedQty,
  averageDailySales,
}: {
  currentStock: unknown;
  daysOfStock: number | null;
  recommendedQty: unknown;
  averageDailySales: unknown;
}): StockStatus {
  const stock = sanitizeNonNegative(currentStock);
  const recommended = sanitizeNonNegative(recommendedQty);
  const avg = sanitizeNonNegative(averageDailySales);

  if (stock <= 0) return "critical";
  if (avg <= 0) return "ok";
  if (daysOfStock != null && daysOfStock < CRITICAL_DAYS_OF_STOCK) {
    return "critical";
  }
  if (daysOfStock != null && daysOfStock < ENDING_DAYS_OF_STOCK) {
    return "ending";
  }
  if (recommended > 0) return "low";
  return "ok";
}

export function stockStatusLabel(status: StockStatus): string {
  if (status === "critical") return "Критический остаток";
  if (status === "ending") return "Скоро закончится";
  if (status === "low") return "Низкий остаток";
  return "Запаса достаточно";
}

export function stockStatusTone(
  status: StockStatus,
): "danger" | "warning" | "info" | "success" {
  if (status === "critical") return "danger";
  if (status === "ending") return "warning";
  if (status === "low") return "info";
  return "success";
}
