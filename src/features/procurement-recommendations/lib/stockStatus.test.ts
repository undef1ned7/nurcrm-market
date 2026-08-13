import { describe, expect, it } from "vitest";
import { resolveStockStatus, stockStatusLabel } from "./stockStatus";

describe("stockStatus", () => {
  it("marks zero stock as critical", () => {
    expect(
      resolveStockStatus({
        currentStock: 0,
        daysOfStock: null,
        recommendedQty: 0,
        averageDailySales: 0,
      }),
    ).toBe("critical");
  });

  it("marks short days of stock as critical or ending", () => {
    expect(
      resolveStockStatus({
        currentStock: 8,
        daysOfStock: 1.6,
        recommendedQty: 30,
        averageDailySales: 5,
      }),
    ).toBe("critical");
    expect(
      resolveStockStatus({
        currentStock: 10,
        daysOfStock: 3.2,
        recommendedQty: 12,
        averageDailySales: 3,
      }),
    ).toBe("ending");
  });

  it("marks horizon shortage as low and enough stock as ok", () => {
    expect(
      resolveStockStatus({
        currentStock: 20,
        daysOfStock: 10,
        recommendedQty: 5,
        averageDailySales: 2,
      }),
    ).toBe("low");
    expect(
      resolveStockStatus({
        currentStock: 40,
        daysOfStock: 20,
        recommendedQty: 0,
        averageDailySales: 2,
      }),
    ).toBe("ok");
  });

  it("treats no-sales leftover stock as ok", () => {
    expect(
      resolveStockStatus({
        currentStock: 12,
        daysOfStock: null,
        recommendedQty: 0,
        averageDailySales: 0,
      }),
    ).toBe("ok");
    expect(stockStatusLabel("ok")).toBe("Запаса достаточно");
  });
});
