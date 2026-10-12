import { describe, expect, it } from "vitest";
import {
  calculateAverageDailySales,
  calculateDaysOfStock,
  calculateRawRecommendedQuantity,
  calculateRecommendedQuantity,
  calculateSalesTrendPercent,
  extractPackSize,
  isWeightProduct,
  pickSalesForAnalysisPeriod,
  roundToPackSize,
  roundWeight,
} from "./recommendationMath";

describe("recommendationMath", () => {
  it("calculates a typical piece product recommendation", () => {
    const avg = calculateAverageDailySales(140, 30);
    expect(avg).toBeCloseTo(14 / 3, 5);
    expect(calculateDaysOfStock(8, avg)).toBeCloseTo(1.714, 3);
    expect(
      calculateRecommendedQuantity({
        averageDailySales: avg,
        coverageDays: 7,
        safetyDays: 2,
        currentStock: 8,
        packSize: 10,
        isWeight: false,
      }),
    ).toBe(40);
  });

  it("treats stock = 0 as a full demand order", () => {
    expect(
      calculateRecommendedQuantity({
        averageDailySales: 5,
        coverageDays: 7,
        safetyDays: 2,
        currentStock: 0,
        isWeight: false,
      }),
    ).toBe(45);
  });

  it("returns 0 recommendation and null days of stock when sales = 0", () => {
    expect(calculateAverageDailySales(0, 30)).toBe(0);
    expect(calculateDaysOfStock(15, 0)).toBeNull();
    expect(
      calculateRecommendedQuantity({
        averageDailySales: 0,
        coverageDays: 7,
        safetyDays: 2,
        currentStock: 15,
        isWeight: false,
      }),
    ).toBe(0);
  });

  it("does not produce Infinity when previous sales = 0", () => {
    expect(calculateSalesTrendPercent(14, 0)).toBeNull();
    expect(calculateSalesTrendPercent(0, 0)).toBe(0);
    expect(calculateSalesTrendPercent(24, 20)).toBe(20);
  });

  it("clamps negative recommendation to 0", () => {
    expect(
      calculateRawRecommendedQuantity({
        averageDailySales: 1,
        coverageDays: 3,
        safetyDays: 0,
        currentStock: 100,
      }),
    ).toBe(0);
    expect(
      calculateRecommendedQuantity({
        averageDailySales: 1,
        coverageDays: 3,
        safetyDays: 0,
        currentStock: 100,
        isWeight: false,
      }),
    ).toBe(0);
  });

  it("rounds piece products up to pack size", () => {
    expect(roundToPackSize(27, 10, false)).toBe(30);
    expect(roundToPackSize(10, 10, false)).toBe(10);
    expect(roundToPackSize(0, 10, false)).toBe(0);
    expect(roundToPackSize(5, null, false)).toBe(5);
  });

  it("keeps fractional quantities for weight products", () => {
    expect(roundWeight(12.4567)).toBe(12.457);
    expect(roundToPackSize(12.41, 10, true)).toBe(12.41);
    expect(
      calculateRecommendedQuantity({
        averageDailySales: 2.5,
        coverageDays: 7,
        safetyDays: 1,
        currentStock: 7.5,
        packSize: 10,
        isWeight: true,
      }),
    ).toBe(12.5);
  });

  it("handles very large values without overflowing to Infinity", () => {
    const qty = calculateRecommendedQuantity({
      averageDailySales: 1_000_000,
      coverageDays: 14,
      safetyDays: 3,
      currentStock: 10,
      isWeight: false,
    });
    expect(Number.isFinite(qty)).toBe(true);
    expect(qty).toBe(16_999_990);
  });

  it("sanitizes negative and invalid inputs", () => {
    expect(calculateAverageDailySales(-10, 7)).toBe(0);
    expect(calculateAverageDailySales(10, 0)).toBe(0);
    expect(calculateDaysOfStock(-4, 2)).toBe(0);
    expect(calculateSalesTrendPercent("abc", 10)).toBe(-100);
  });

  it("detects weight products and pack size from existing product fields", () => {
    expect(isWeightProduct({ is_weight: true })).toBe(true);
    expect(isWeightProduct({ scale_type: "weight" })).toBe(true);
    expect(isWeightProduct({ scale_type: "piece" })).toBe(false);
    expect(
      extractPackSize({
        packages: [{ quantity_in_package: 0 }, { quantity_in_package: 12 }],
      }),
    ).toBe(12);
    expect(extractPackSize({ packages: [{ quantity_in_package: 1 }] })).toBeNull();
  });

  it("picks sales windows for 7/14/30 days", () => {
    const item = {
      sales7d: 7,
      sales14d: 14,
      sales30d: 30,
      previous7d: 5,
      previous14d: 10,
      previous30d: 20,
    };
    expect(pickSalesForAnalysisPeriod(item, 7)).toEqual({
      current: 7,
      previous: 5,
    });
    expect(pickSalesForAnalysisPeriod(item, 14).current).toBe(14);
    expect(pickSalesForAnalysisPeriod(item, 30).previous).toBe(20);
  });
});
