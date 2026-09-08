import { describe, expect, it, vi } from "vitest";
import {
  mapMarketReceiptItem,
  matchPayloadItemForEkassaLine,
  mergeEkassaItemsWithPayload,
  readReceiptLineId,
  warnIfEkassaDiscountMismatch,
} from "./receiptItems";

function ekassaLine(name: string, qty: number, priceSom: number, extra: Record<string, unknown> = {}) {
  return {
    "1030": name,
    "1023": qty,
    "1076": Math.round(priceSom * 100),
    "1043": Math.round(priceSom * qty * 100),
    ...extra,
  };
}

describe("readReceiptLineId", () => {
  it("prefers item_id / line_id over missing id", () => {
    expect(readReceiptLineId({ item_id: "line-1", id: "other" })).toBe("line-1");
    expect(readReceiptLineId({ sale_item_id: 42 })).toBe("42");
    expect(readReceiptLineId({ name: "Cola" })).toBe("");
  });
});

describe("mergeEkassaItemsWithPayload", () => {
  it("matches two identical products with different discounts by item_id even if order differs", () => {
    const ekassa = [
      ekassaLine("Кола", 1, 50, { item_id: "a" }),
      ekassaLine("Кола", 1, 50, { item_id: "b" }),
    ];
    const payload = [
      {
        item_id: "b",
        name: "Кола",
        qty: 1,
        unit_price: 50,
        line_discount: 20,
        line_total: 30,
      },
      {
        item_id: "a",
        name: "Кола",
        qty: 1,
        unit_price: 50,
        line_discount: 5,
        line_total: 45,
      },
    ];

    const { items, strategies } = mergeEkassaItemsWithPayload(ekassa, payload);
    expect(strategies).toEqual(["id", "id"]);
    expect(items[0].line_discount_amount).toBe(5);
    expect(items[1].line_discount_amount).toBe(20);
  });

  it("uses index (not name+qty) when lengths match and there is no line id", () => {
    const ekassa = [
      ekassaLine("Кола", 1, 50),
      ekassaLine("Кола", 1, 50),
    ];
    // Обратный порядок скидок относительно «ожидания по имени».
    const payload = [
      { name: "Кола", qty: 1, unit_price: 50, line_discount: 20, line_total: 30 },
      { name: "Кола", qty: 1, unit_price: 50, line_discount: 5, line_total: 45 },
    ];

    const { items, strategies } = mergeEkassaItemsWithPayload(ekassa, payload);
    expect(strategies).toEqual(["index", "index"]);
    expect(items[0].line_discount_amount).toBe(20);
    expect(items[1].line_discount_amount).toBe(5);
  });

  it("falls back to name+qty only when array lengths differ", () => {
    const ekassa = [ekassaLine("Кола", 1, 50), ekassaLine("Сок", 1, 40)];
    const payload = [
      { name: "Сок", qty: 1, unit_price: 40, line_discount: 8, line_total: 32 },
      { name: "Кола", qty: 1, unit_price: 50, line_discount: 5, line_total: 45 },
      { name: "Лишняя", qty: 1, unit_price: 10, line_discount: 0, line_total: 10 },
    ];

    const { items, strategies } = mergeEkassaItemsWithPayload(ekassa, payload);
    expect(strategies).toEqual(["name+qty", "name+qty"]);
    expect(items[0].line_discount_amount).toBe(5);
    expect(items[1].line_discount_amount).toBe(8);
  });
});

describe("matchPayloadItemForEkassaLine", () => {
  it("does not reuse a payload row already consumed", () => {
    const payloadItems = [
      { name: "Кола", qty: 1, line_discount: 5 },
      { name: "Кола", qty: 1, line_discount: 9 },
    ];
    const used = new Set<number>();
    const first = matchPayloadItemForEkassaLine({
      ekassaItem: {},
      ekassaName: "Кола",
      ekassaQty: 1,
      index: 0,
      payloadItems,
      usedPayloadIndexes: used,
      sameLength: true,
    });
    const second = matchPayloadItemForEkassaLine({
      ekassaItem: {},
      ekassaName: "Кола",
      ekassaQty: 1,
      index: 1,
      payloadItems,
      usedPayloadIndexes: used,
      sameLength: true,
    });
    expect(first.item.line_discount).toBe(5);
    expect(second.item.line_discount).toBe(9);
  });
});

describe("warnIfEkassaDiscountMismatch", () => {
  it("warns when name+qty fallback was used or line discounts exceed order discount", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnIfEkassaDiscountMismatch({
      lineDiscountSum: 40,
      orderDiscount: 10,
      strategies: ["name+qty", "index"],
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("mapMarketReceiptItem", () => {
  it("uses explicit line_discount without inferring extra", () => {
    const mapped = mapMarketReceiptItem({
      name: "Чай",
      qty: 2,
      unit_price: 100,
      line_discount: 10,
      line_total: 190,
    });
    expect(mapped.line_discount_amount).toBe(10);
    expect(mapped.total).toBe(190);
  });
});
