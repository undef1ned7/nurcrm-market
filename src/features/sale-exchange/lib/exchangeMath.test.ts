import { describe, expect, it } from "vitest";
import {
  buildExchangePayload,
  computeExchangeTotals,
  parseQty,
  toExchangeReturnRow,
  validateExchange,
  type ExchangeNewLine,
} from "./exchangeMath";

const rows = [
  toExchangeReturnRow(
    { id: "it-1", quantity: "1", unit_price: "2500.00", line_total: "2500.00", returnable_qty: "1" },
    "Платье — 44, Красный",
  ),
  toExchangeReturnRow(
    { id: "it-2", quantity: "2", unit_price: "500", line_total: "900", returned_qty: "1" },
    "Носки",
  ),
];

const line = (over: Partial<ExchangeNewLine> = {}): ExchangeNewLine => ({
  key: "n1",
  productId: "p-1",
  variantId: "v-46",
  name: "Платье — 46, Красный",
  price: 2500,
  qty: "1",
  ...over,
});

describe("toExchangeReturnRow", () => {
  it("цена единицы — с учётом скидки строки; остаток к возврату — returnable_qty или продано − возвращено", () => {
    expect(rows[0]).toMatchObject({ id: "it-1", unitPrice: 2500, returnable: 1 });
    expect(rows[1]).toMatchObject({ unitPrice: 450, returnable: 1 });
  });
});

describe("computeExchangeTotals", () => {
  it("44 на 46 той же цены — без доплаты", () => {
    expect(computeExchangeTotals(rows, { "it-1": "1" }, [line()])).toEqual({
      returned: 2500,
      added: 2500,
      difference: 0,
    });
  });

  it("на более дорогую — доплата; на дешёвую — сдача", () => {
    expect(computeExchangeTotals(rows, { "it-1": "1" }, [line({ price: 3200 })]).difference).toBe(700);
    expect(computeExchangeTotals(rows, { "it-1": "1" }, [line({ price: 1990.5 })]).difference).toBe(-509.5);
  });

  it("количество сверх returnable не засчитывается; мусор = 0", () => {
    expect(computeExchangeTotals(rows, { "it-1": "5", "it-2": "abc" }, []).returned).toBe(2500);
  });
});

describe("validateExchange", () => {
  it("по шагам: что возвращают → не больше остатка → что берут → количество", () => {
    expect(validateExchange(rows, {}, [line()])).toBe("noReturn");
    expect(validateExchange(rows, { "it-1": "2" }, [line()])).toBe("exceedsReturnable");
    expect(validateExchange(rows, { "it-1": "1" }, [])).toBe("noNew");
    expect(validateExchange(rows, { "it-1": "1" }, [line({ qty: "-1" })])).toBe("badNewQty");
    expect(validateExchange(rows, { "it-1": "1" }, [line()])).toBeNull();
  });
});

describe("buildExchangePayload", () => {
  it("тело как в ТЗ: строки строками, variant только если есть", () => {
    expect(
      buildExchangePayload(rows, { "it-1": "1", "it-2": "" }, [line(), line({ key: "n2", productId: "p-2", variantId: undefined, qty: "2" })], "transfer"),
    ).toEqual({
      return_items: [{ item: "it-1", qty: "1" }],
      new_items: [
        { product: "p-1", variant: "v-46", qty: "1" },
        { product: "p-2", qty: "2" },
      ],
      payment: { method: "transfer" },
    });
  });
});

describe("parseQty", () => {
  it("только положительные числа; запятая как точка", () => {
    expect(parseQty("1,5")).toBe(1.5);
    expect(parseQty("-1")).toBe(0);
    expect(parseQty("1e3")).toBe(0);
    expect(parseQty("<script>")).toBe(0);
  });
});
