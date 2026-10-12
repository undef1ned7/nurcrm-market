import { describe, expect, it, vi } from "vitest";
import type { CartLine, CartSaleItem, CashierProduct } from "./cashierPage.types";
import {
  calcTotalConsumeForProduct,
  formatCartPromotionRulesLabel,
  formatDiscountPercentFromLine,
  formatPrice,
  formatQuantity,
  fmtSomShort,
  getActiveCartPromotionTier,
  getSaleShiftId,
  isIncompleteDecimalInput,
  isSameCartLine,
  isShiftNotOpenApiError,
  mergeChangedMap,
  normalizeCartPromotionRules,
  normalizeCompactProductsResponse,
  normalizeHotkeyGroup,
  normalizePrice,
  normalizeQuantity,
  parseDecimalInput,
  setNativeInputValue,
  shouldSyncDecimalFieldWhileTyping,
  stripTrailingZerosAfterDecimal,
} from "./cashierPage.utils";

const baseLine = (overrides: Partial<CartLine> = {}): CartLine => ({
  id: "line-1",
  saleId: 10,
  itemId: 20,
  productId: 30,
  isCustom: false,
  isWeight: false,
  salePackage: null,
  name: "Товар",
  price: 100,
  quantity: 1,
  discountTotal: 0,
  unit: "шт",
  image: null,
  ...overrides,
});

describe("mergeChangedMap", () => {
  it("returns the same reference when patch does not change values", () => {
    const prev = { a: 1, b: "x" };
    expect(mergeChangedMap(prev, { a: 1 })).toBe(prev);
  });

  it("returns a new object when at least one value changes", () => {
    const prev = { a: 1, b: "x" };
    const next = mergeChangedMap(prev, { a: 2 });
    expect(next).not.toBe(prev);
    expect(next).toEqual({ a: 2, b: "x" });
  });

  it("applies multiple patch keys and ignores unchanged ones", () => {
    const prev = { a: 1, b: 2, c: 3 };
    expect(mergeChangedMap(prev, { a: 1, b: 9 })).toEqual({ a: 1, b: 9, c: 3 });
  });
});

describe("isSameCartLine", () => {
  it("returns true for identical cart lines", () => {
    const a = baseLine();
    const b = baseLine();
    expect(isSameCartLine(a, b)).toBe(true);
  });

  it("returns false when either side is null/undefined (empty cart / missing selection)", () => {
    expect(isSameCartLine(null, baseLine())).toBe(false);
    expect(isSameCartLine(baseLine(), undefined)).toBe(false);
    expect(isSameCartLine(null, null)).toBe(false);
  });

  it("returns false when a compared field differs", () => {
    const a = baseLine();
    expect(isSameCartLine(a, baseLine({ quantity: 2 }))).toBe(false);
    expect(isSameCartLine(a, baseLine({ price: 99 }))).toBe(false);
    expect(isSameCartLine(a, baseLine({ discountTotal: 5 }))).toBe(false);
    expect(isSameCartLine(a, baseLine({ isWeight: true }))).toBe(false);
    expect(isSameCartLine(a, baseLine({ name: "Другой" }))).toBe(false);
  });

  it("treats duplicate-looking lines as different if itemId differs", () => {
    expect(
      isSameCartLine(baseLine({ itemId: 1 }), baseLine({ itemId: 2 })),
    ).toBe(false);
  });
});

describe("normalizeHotkeyGroup", () => {
  it("normalizes valid F1–F12 groups (trim + upper)", () => {
    expect(normalizeHotkeyGroup("f1")).toBe("F1");
    expect(normalizeHotkeyGroup(" F12 ")).toBe("F12");
    expect(normalizeHotkeyGroup("F5")).toBe("F5");
  });

  it("rejects invalid groups", () => {
    expect(normalizeHotkeyGroup("")).toBe("");
    expect(normalizeHotkeyGroup(null)).toBe("");
    expect(normalizeHotkeyGroup("F0")).toBe("");
    expect(normalizeHotkeyGroup("F13")).toBe("");
    expect(normalizeHotkeyGroup("G1")).toBe("");
    expect(normalizeHotkeyGroup("F1A")).toBe("");
  });
});

describe("setNativeInputValue", () => {
  it("sets value and dispatches bubbling input event", () => {
    const el = document.createElement("input");
    el.value = "";
    const handler = vi.fn();
    el.addEventListener("input", handler);

    setNativeInputValue(el, "12.5");

    expect(el.value).toBe("12.5");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].bubbles).toBe(true);
  });
});

describe("normalizeCompactProductsResponse", () => {
  it("unwraps paginated { results } and ensures images/packages arrays", () => {
    const out = normalizeCompactProductsResponse({
      results: [{ id: 1, name: "A", images: null, packages: undefined }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
    expect(out[0].images).toEqual([]);
    expect(out[0].packages).toEqual([]);
  });

  it("accepts a bare array and empty/invalid payloads", () => {
    expect(normalizeCompactProductsResponse([{ id: 2, images: [1] }])).toEqual([
      { id: 2, images: [1], packages: [] },
    ]);
    expect(normalizeCompactProductsResponse(null)).toEqual([]);
    expect(normalizeCompactProductsResponse(undefined)).toEqual([]);
    expect(normalizeCompactProductsResponse({ results: "bad" })).toEqual([]);
  });

  it("maps null list items to empty product shells", () => {
    expect(normalizeCompactProductsResponse([null])).toEqual([
      { images: [], packages: [] },
    ]);
  });
});

describe("stripTrailingZerosAfterDecimal", () => {
  it("strips trailing zeros only when a decimal point exists", () => {
    expect(stripTrailingZerosAfterDecimal("50.00")).toBe("50");
    expect(stripTrailingZerosAfterDecimal("12.50")).toBe("12.5");
    expect(stripTrailingZerosAfterDecimal(100)).toBe("100");
    expect(stripTrailingZerosAfterDecimal("50")).toBe("50");
  });

  it("does not collapse whole numbers like 50 → 5", () => {
    expect(stripTrailingZerosAfterDecimal("50")).toBe("50");
    expect(stripTrailingZerosAfterDecimal("100")).toBe("100");
  });
});

describe("fmtSomShort", () => {
  it("formats finite numbers with up to 2 decimals, stripped", () => {
    expect(fmtSomShort(10)).toBe("10");
    expect(fmtSomShort(10.5)).toBe("10.5");
    expect(fmtSomShort(10.999)).toBe("11");
  });

  it("returns original string for non-finite values", () => {
    expect(fmtSomShort(NaN)).toBe("NaN");
    expect(fmtSomShort(undefined)).toBe("");
    expect(fmtSomShort("abc")).toBe("abc");
  });
});

describe("normalizeCartPromotionRules", () => {
  it("parses, filters zero discounts, sorts by position", () => {
    const rules = normalizeCartPromotionRules([
      { position: 2, min_amount: "200", discount_percent: "10", promo_quantity: "3" },
      { position: 1, min_amount: "100,5", discount_percent: "5", promo_quantity: "" },
      { position: 0, min_amount: 50, discount_percent: 0 },
    ]);
    expect(rules).toEqual([
      {
        position: 1,
        min_amount: 100.5,
        discount_percent: 5,
        promo_quantity: null,
      },
      {
        position: 2,
        min_amount: 200,
        discount_percent: 10,
        promo_quantity: 3,
      },
    ]);
  });

  it("handles non-array and malformed rules", () => {
    expect(normalizeCartPromotionRules(null)).toEqual([]);
    expect(normalizeCartPromotionRules({})).toEqual([]);
    expect(
      normalizeCartPromotionRules([null, { discount_percent: "x" }]),
    ).toEqual([]);
  });

  it("clamps negative promo_quantity to 0 and keeps null when empty", () => {
    expect(
      normalizeCartPromotionRules([
        { discount_percent: 5, promo_quantity: -2 },
        { discount_percent: 7, promo_quantity: null },
      ]),
    ).toEqual([
      {
        position: 0,
        min_amount: 0,
        discount_percent: 5,
        promo_quantity: 0,
      },
      {
        position: 1,
        min_amount: 0,
        discount_percent: 7,
        promo_quantity: null,
      },
    ]);
  });
});

describe("getActiveCartPromotionTier", () => {
  const rules = [
    { position: 1, min_amount: 100, discount_percent: 5, promo_quantity: null },
    { position: 2, min_amount: 300, discount_percent: 10, promo_quantity: 2 },
  ];

  it("returns null when no rules or gross below all thresholds", () => {
    expect(getActiveCartPromotionTier(10, 1, [])).toBeNull();
    expect(getActiveCartPromotionTier(10, 1, rules)).toBeNull();
  });

  it("picks the highest matching min_amount tier", () => {
    // gross = 100*2 = 200 → only first tier
    expect(getActiveCartPromotionTier(100, 2, rules)?.discount_percent).toBe(5);
    // gross = 100*4 = 400 and qty 4 ≥ 2 → second tier
    expect(getActiveCartPromotionTier(100, 4, rules)?.discount_percent).toBe(10);
  });

  it("skips qty-gated tier when quantity is too low", () => {
    // gross 400 but qty 1 < promo_quantity 2
    expect(getActiveCartPromotionTier(400, 1, rules)?.discount_percent).toBe(5);
  });

  it("handles zero/negative qty and bad types as no active tier", () => {
    expect(getActiveCartPromotionTier(100, 0, rules)).toBeNull();
    expect(getActiveCartPromotionTier(100, -1, rules)).toBeNull();
    expect(getActiveCartPromotionTier("bad", "x", rules)).toBeNull();
  });
});

describe("formatCartPromotionRulesLabel", () => {
  it("returns empty string without valid rules", () => {
    expect(formatCartPromotionRulesLabel(null)).toBe("");
    expect(formatCartPromotionRulesLabel([{ discount_percent: 0 }])).toBe("");
  });

  it("formats amount and optional qty thresholds", () => {
    const label = formatCartPromotionRulesLabel([
      { min_amount: 100, discount_percent: 5, promo_quantity: null },
      { min_amount: 200, discount_percent: 10, promo_quantity: 3 },
    ]);
    expect(label).toContain("от 100 сом: −5%");
    expect(label).toContain("от 200 сом, от 3 шт: −10%");
    expect(label).toContain(" · ");
  });
});

describe("getSaleShiftId", () => {
  it("reads nested shift.id / shift.pk", () => {
    expect(getSaleShiftId({ shift: { id: 7 } })).toBe(7);
    expect(getSaleShiftId({ shift: { pk: "pk-1" } })).toBe("pk-1");
  });

  it("falls back to shift_id or scalar shift", () => {
    expect(getSaleShiftId({ shift_id: 42 })).toBe(42);
    expect(getSaleShiftId({ shift: 99 })).toBe(99);
  });

  it("returns null when sale or shift is missing", () => {
    expect(getSaleShiftId(null)).toBeNull();
    expect(getSaleShiftId({})).toBeNull();
    expect(getSaleShiftId({ shift: null })).toBeNull();
    expect(getSaleShiftId({ shift: {} })).toBeNull();
  });
});

describe("isShiftNotOpenApiError", () => {
  it("detects Russian «смена не открыта / закрыта» in string and object forms", () => {
    expect(isShiftNotOpenApiError("Смена не открыта")).toBe(true);
    expect(isShiftNotOpenApiError({ detail: "Смена уже закрыта" })).toBe(true);
    expect(
      isShiftNotOpenApiError({
        response: { data: { detail: "Смена не открыта" } },
      }),
    ).toBe(true);
  });

  it("detects mixed RU stem + English «not open» (axios-like payload)", () => {
    expect(
      isShiftNotOpenApiError({
        isAxiosError: true,
        response: { data: { detail: "Смена not open" } },
        message: "Request failed with status code 400",
      }),
    ).toBe(true);
  });

  it("returns false for unrelated, incomplete, or English-only messages", () => {
    // matcher требует «смен» И («не открыт»|«закрыт»|«not open»)
    expect(isShiftNotOpenApiError("Недостаточно средств")).toBe(false);
    expect(isShiftNotOpenApiError("смена")).toBe(false);
    expect(isShiftNotOpenApiError("Shift is not open")).toBe(false);
    expect(
      isShiftNotOpenApiError({
        response: { data: { message: "Нет открытой смены" } },
      }),
    ).toBe(false);
    expect(isShiftNotOpenApiError({ message: "Network Error" })).toBe(false);
    expect(isShiftNotOpenApiError(null)).toBe(false);
    expect(isShiftNotOpenApiError("")).toBe(false);
  });
});

describe("formatDiscountPercentFromLine", () => {
  it("computes percent from discount amount and line total", () => {
    expect(formatDiscountPercentFromLine(10, 100)).toBe("10");
    expect(formatDiscountPercentFromLine(25, 200)).toBe("12.5");
  });

  it("returns empty when line total ≤ 0; 0 when discount ≤ 0", () => {
    expect(formatDiscountPercentFromLine(10, 0)).toBe("");
    expect(formatDiscountPercentFromLine(10, -5)).toBe("");
    expect(formatDiscountPercentFromLine(0, 100)).toBe("0");
    expect(formatDiscountPercentFromLine(-1, 100)).toBe("0");
  });

  it("allows discount greater than line total (>100%)", () => {
    expect(formatDiscountPercentFromLine(150, 100)).toBe("150");
  });
});

describe("formatQuantity / normalizeQuantity", () => {
  it("formats integers and strips trailing decimal zeros", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(2.5)).toBe("2.5");
    expect(formatQuantity("1.50")).toBe("1.5");
  });

  it("treats empty / invalid qty as 0", () => {
    expect(formatQuantity(null)).toBe("0");
    expect(formatQuantity("")).toBe("0");
    expect(formatQuantity("abc")).toBe("0");
    expect(normalizeQuantity(null)).toBe(0);
    expect(normalizeQuantity("")).toBe(0);
    expect(normalizeQuantity("abc")).toBe(0);
  });

  it("normalizes with 4-decimal rounding; supports zero and negative", () => {
    expect(normalizeQuantity(1)).toBe(1);
    expect(normalizeQuantity(1.23456)).toBe(1.2346);
    expect(normalizeQuantity(0)).toBe(0);
    expect(normalizeQuantity(-2)).toBe(-2);
  });
});

describe("decimal input helpers", () => {
  it("marks incomplete decimal typing states", () => {
    expect(isIncompleteDecimalInput("")).toBe(true);
    expect(isIncompleteDecimalInput("-")).toBe(true);
    expect(isIncompleteDecimalInput(".")).toBe(true);
    expect(isIncompleteDecimalInput("12.")).toBe(true);
    expect(isIncompleteDecimalInput("0")).toBe(true);
    expect(isIncompleteDecimalInput("0.")).toBe(true);
    expect(isIncompleteDecimalInput("12.5")).toBe(false);
    expect(isIncompleteDecimalInput("3")).toBe(false);
  });

  it("parses comma decimals", () => {
    expect(parseDecimalInput("1,25")).toBe(1.25);
    expect(parseDecimalInput(" 2 ")).toBe(2);
  });

  it("syncs only finished non-negative decimals", () => {
    expect(shouldSyncDecimalFieldWhileTyping("12.")).toBe(false);
    expect(shouldSyncDecimalFieldWhileTyping("12.5")).toBe(true);
    expect(shouldSyncDecimalFieldWhileTyping("-1")).toBe(false);
    expect(shouldSyncDecimalFieldWhileTyping("abc")).toBe(false);
  });
});

describe("formatPrice / normalizePrice", () => {
  it("formats and normalizes money to 2 decimals", () => {
    expect(formatPrice(10)).toBe("10");
    expect(formatPrice(10.5)).toBe("10.5");
    expect(normalizePrice(10.456)).toBe(10.46);
    expect(normalizePrice(10)).toBe(10);
  });

  it("treats empty / invalid price as 0", () => {
    expect(formatPrice(null)).toBe("0");
    expect(formatPrice("")).toBe("0");
    expect(formatPrice("x")).toBe("0");
    expect(normalizePrice(null)).toBe(0);
    expect(normalizePrice("")).toBe(0);
    expect(normalizePrice("x")).toBe(0);
  });

  it("keeps negative prices as parsed numbers", () => {
    expect(normalizePrice(-5.5)).toBe(-5.5);
    expect(formatPrice(-5.5)).toBe("-5.5");
  });
});

describe("calcTotalConsumeForProduct", () => {
  const products: CashierProduct[] = [
    {
      id: 1,
      packages: [
        { id: 10, quantity_in_package: 12 },
        { id: 11, quantity_in_package: 0 },
      ],
    },
  ];

  it("sums piece quantities for the product (empty cart → 0)", () => {
    expect(calcTotalConsumeForProduct([], 1, products)).toBe(0);
  });

  it("sums plain qty and package qty / quantity_in_package", () => {
    const items: CartSaleItem[] = [
      { product: 1, quantity: 2 },
      { product_id: 1, quantity: "1", sale_package: 10 }, // 1/12
      { product: 2, quantity: 99 }, // other product
    ];
    expect(calcTotalConsumeForProduct(items, 1, products)).toBeCloseTo(
      2 + 1 / 12,
      6,
    );
  });

  it("adds 0 for package lines with missing/zero quantity_in_package", () => {
    const items: CartSaleItem[] = [
      { product: 1, quantity: 3, sale_package: 11 },
      { product: 1, quantity: 2, sale_package: 999 },
    ];
    expect(calcTotalConsumeForProduct(items, 1, products)).toBe(0);
  });

  it("handles duplicate lines for the same product", () => {
    const items: CartSaleItem[] = [
      { product: 1, quantity: 1 },
      { product: 1, quantity: 1 },
      { product: 1, quantity: -1 },
    ];
    expect(calcTotalConsumeForProduct(items, 1, products)).toBe(1);
  });

  it("returns 0 for unknown productId / invalid qty", () => {
    expect(
      calcTotalConsumeForProduct([{ product: 1, quantity: "x" }], 1, products),
    ).toBe(0);
    expect(
      calcTotalConsumeForProduct([{ product: 1, quantity: 5 }], undefined, products),
    ).toBe(0);
  });
});
