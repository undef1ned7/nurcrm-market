import type {
  CalculatedRecommendationRow,
  ProcurementRecommendationItem,
  ProcurementRecommendationSettings,
  RecommendationExplanation,
} from "../model/types";
import {
  calculateAverageDailySales,
  calculateDaysOfStock,
  calculateRawRecommendedQuantity,
  calculateRecommendedQuantity,
  calculateSalesTrendPercent,
  pickSalesForAnalysisPeriod,
  roundWeight,
  sanitizeNonNegative,
} from "./recommendationMath";
import { resolveStockStatus } from "./stockStatus";

export function buildRecommendationRow(
  item: ProcurementRecommendationItem,
  settings: ProcurementRecommendationSettings,
): CalculatedRecommendationRow {
  const { current, previous } = pickSalesForAnalysisPeriod(
    item,
    settings.analysisDays,
  );
  const currentStock = sanitizeNonNegative(item.currentStock);
  const averageDailySales = calculateAverageDailySales(
    current,
    settings.analysisDays,
  );
  const daysOfStock = calculateDaysOfStock(currentStock, averageDailySales);
  const rawRecommendedQty = calculateRawRecommendedQuantity({
    averageDailySales,
    coverageDays: settings.coverageDays,
    safetyDays: settings.safetyDays,
    currentStock,
  });
  const recommendedQty = calculateRecommendedQuantity({
    averageDailySales,
    coverageDays: settings.coverageDays,
    safetyDays: settings.safetyDays,
    currentStock,
    packSize: item.packSize,
    isWeight: item.isWeight,
  });
  const requiredStock = item.isWeight
    ? roundWeight(
        averageDailySales * (settings.coverageDays + settings.safetyDays),
      )
    : averageDailySales * (settings.coverageDays + settings.safetyDays);
  const packSize = item.packSize && item.packSize > 1 ? item.packSize : null;
  const roundedToPack =
    !item.isWeight && Boolean(packSize) && recommendedQty !== Math.ceil(rawRecommendedQty - 1e-9);

  const explanation: RecommendationExplanation = {
    averageDailySales,
    daysOfStock,
    coverageDays: settings.coverageDays,
    safetyDays: settings.safetyDays,
    requiredStock,
    currentStock,
    rawRecommendedQty,
    recommendedQty,
    packSize,
    roundedToPack,
    isWeight: item.isWeight,
    unit: item.unit,
  };

  return {
    ...item,
    currentStock,
    salesAnalysisPeriod: current,
    previousPeriodSales: previous,
    averageDailySales,
    salesTrendPercent: calculateSalesTrendPercent(current, previous),
    daysOfStock,
    stockStatus: resolveStockStatus({
      currentStock,
      daysOfStock,
      recommendedQty,
      averageDailySales,
    }),
    recommendedQty,
    explanation,
  };
}

export function buildRecommendationRows(
  items: ProcurementRecommendationItem[],
  settings: ProcurementRecommendationSettings,
): CalculatedRecommendationRow[] {
  return items.map((item) => buildRecommendationRow(item, settings));
}
