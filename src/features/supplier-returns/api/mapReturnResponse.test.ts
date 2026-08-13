import { describe, expect, it } from "vitest";
import { mapReturnListResponse, mapSupplierReturn } from "./mapReturnResponse";

describe("mapSupplierReturn", () => {
  it("maps aliases and computes line totals", () => {
    const mapped = mapSupplierReturn({
      uuid: "ret-1",
      supplier_id: "15",
      supplier_name: "Белая река",
      created_at: "2026-08-11T10:00:00+06:00",
      created_by_name: "Айжан",
      reason: "defect",
      compensation_type: "cash",
      items: [
        {
          product_id: "123",
          product_name: "Молоко 1 л",
          qty: 2,
          purchase_price: 62,
          unit: "шт",
        },
      ],
    });
    expect(mapped?.id).toBe("ret-1");
    expect(mapped?.supplierName).toBe("Белая река");
    expect(mapped?.compensation).toBe("cash");
    expect(mapped?.items[0].lineTotal).toBe(124);
    expect(mapped?.totalAmount).toBe(124);
  });

  it("returns null without id", () => {
    expect(mapSupplierReturn({ supplier_name: "X" })).toBeNull();
  });
});

describe("mapReturnListResponse", () => {
  it("reads results + meta total", () => {
    const payload = mapReturnListResponse({
      count: 1,
      results: [
        {
          id: "1",
          supplier_name: "Белая река",
          created_at: "2026-08-01",
          items: [],
          total_amount: 10,
        },
      ],
      meta: { total_amount: 10 },
    });
    expect(payload.count).toBe(1);
    expect(payload.list).toHaveLength(1);
    expect(payload.totalAmount).toBe(10);
    expect(payload.source).toBe("backend");
  });
});
