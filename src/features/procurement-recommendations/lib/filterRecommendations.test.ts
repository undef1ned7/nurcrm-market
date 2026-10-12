import { describe, expect, it } from "vitest";
import { buildRecommendationRow } from "./buildRecommendationRows";
import {
  filterRecommendationRows,
  resolveRecommendationsEmptyKind,
} from "./filterRecommendations";
import { formatTrend } from "./formatRecommendation";
import { buildExplanationLines } from "./explainRecommendation";
import type { ProcurementRecommendationItem } from "../model/types";
import { DEFAULT_RECOMMENDATION_SETTINGS } from "../model/constants";

const baseItem = (
  patch: Partial<ProcurementRecommendationItem>,
): ProcurementRecommendationItem => ({
  productId: "p1",
  productName: "Молоко 1 л",
  barcode: "123",
  unit: "шт",
  isWeight: false,
  currentStock: 8,
  sales7d: 35,
  sales14d: 70,
  sales30d: 140,
  previous7d: 28,
  previous14d: 56,
  previous30d: 112,
  purchasePrice: 62,
  packSize: 10,
  lastPurchase: { date: "2026-08-01T10:00:00+06:00", quantity: 40, purchasePrice: 62 },
  ...patch,
});

describe("filterRecommendations", () => {
  const milk = buildRecommendationRow(baseItem({}), DEFAULT_RECOMMENDATION_SETTINGS);
  const kefir = buildRecommendationRow(
    baseItem({
      productId: "p2",
      productName: "Кефир 1 л",
      barcode: "999",
      currentStock: 80,
      sales7d: 10,
      sales14d: 20,
      sales30d: 40,
      previous7d: 10,
      previous14d: 20,
      previous30d: 40,
      packSize: null,
    }),
    DEFAULT_RECOMMENDATION_SETTINGS,
  );

  it("filters by search, required and critical", () => {
    const rows = [milk, kefir];
    expect(filterRecommendationRows(rows, { search: "кефир", filter: "all" })).toHaveLength(1);
    expect(
      filterRecommendationRows(rows, { search: "123", filter: "all" })[0].productId,
    ).toBe("p1");
    expect(
      filterRecommendationRows(rows, { search: "", filter: "required" }).every(
        (row) => row.recommendedQty > 0,
      ),
    ).toBe(true);
    expect(
      filterRecommendationRows(rows, { search: "", filter: "critical" }).every(
        (row) => row.stockStatus === "critical",
      ),
    ).toBe(true);
  });

  it("resolves empty states", () => {
    expect(
      resolveRecommendationsEmptyKind({
        supplierId: "",
        loadedCount: 0,
        visibleCount: 0,
        filter: "all",
        search: "",
      }),
    ).toBe("no-supplier");
    expect(
      resolveRecommendationsEmptyKind({
        supplierId: "s1",
        loadedCount: 0,
        visibleCount: 0,
        filter: "all",
        search: "",
      }),
    ).toBe("no-products");
    expect(
      resolveRecommendationsEmptyKind({
        supplierId: "s1",
        loadedCount: 4,
        visibleCount: 0,
        filter: "required",
        search: "",
      }),
    ).toBe("none-required");
  });
});

describe("formatTrend and explanation", () => {
  it("never renders Infinity for a trend", () => {
    expect(formatTrend(null, 12)).toBe("↑ новые продажи");
    expect(formatTrend(0, 0)).toBe("Без изменений");
    expect(formatTrend(24.4, 10)).toBe("↑ 24%");
    expect(formatTrend(-12.2, 10)).toBe("↓ 12%");
  });

  it("explains pack rounding", () => {
    const row = buildRecommendationRow(
      baseItem({}),
      DEFAULT_RECOMMENDATION_SETTINGS,
    );
    const lines = buildExplanationLines(row.explanation);
    expect(lines.some((line) => line.includes("В среднем продаётся"))).toBe(true);
    expect(lines.some((line) => line.includes("Текущий остаток"))).toBe(true);
    expect(lines.some((line) => line.includes("Округлено до упаковки"))).toBe(
      true,
    );
    expect(row.recommendedQty).toBeGreaterThan(0);
  });
});
