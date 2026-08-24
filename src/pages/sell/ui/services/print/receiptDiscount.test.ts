import { describe, expect, it } from "vitest";
import {
  inferDiscountFromPriceDiff,
  isPriceManuallyEdited,
  readExplicitLineDiscount,
} from "./receiptDiscount";

describe("isPriceManuallyEdited", () => {
  it("is false for empty / ordinary line", () => {
    expect(isPriceManuallyEdited(null)).toBe(false);
    expect(isPriceManuallyEdited({ price: 230, line_discount: 0 })).toBe(false);
  });

  it("reads boolean and string flags already used in some payloads", () => {
    expect(isPriceManuallyEdited({ price_manually_edited: true })).toBe(true);
    expect(isPriceManuallyEdited({ is_price_edited: "1" })).toBe(true);
    expect(isPriceManuallyEdited({ price_override_reason: "manual" })).toBe(true);
  });
});

describe("inferDiscountFromPriceDiff", () => {
  it("keeps an explicit line discount", () => {
    expect(
      inferDiscountFromPriceDiff({
        explicitDiscount: 10,
        unitPrice: 250,
        qty: 1,
        lineTotal: 240,
      }),
    ).toBe(10);
  });

  it("does not infer when line_total matches price × qty", () => {
    expect(
      inferDiscountFromPriceDiff({
        explicitDiscount: 0,
        unitPrice: 230,
        qty: 1,
        lineTotal: 230,
      }),
    ).toBe(0);
  });

  /**
   * Текущее (неидеальное) поведение: без флага ручной цены разрыв
   * price×qty − line_total печатается как скидка. Если кассир сменил
   * цену 250→230, а бэк оставил price=250 и line_total=230, на чеке
   * появится фантомная скидка 20. Нужен price_manually_edited с бэка.
   */
  it("infers a discount from price×qty − line_total when no explicit discount (legacy heuristic)", () => {
    expect(
      inferDiscountFromPriceDiff({
        explicitDiscount: 0,
        unitPrice: 250,
        qty: 1,
        lineTotal: 230,
      }),
    ).toBe(20);
  });

  it("skips the heuristic when the payload marks a manual price edit", () => {
    expect(
      inferDiscountFromPriceDiff({
        explicitDiscount: 0,
        unitPrice: 250,
        qty: 1,
        lineTotal: 230,
        item: { price_manually_edited: true },
      }),
    ).toBe(0);
  });
});

describe("readExplicitLineDiscount", () => {
  it("prefers line_discount, then discount_total / line_discount_total", () => {
    expect(readExplicitLineDiscount({ line_discount: "5.50" })).toBe(5.5);
    expect(readExplicitLineDiscount({ discount_total: 3 })).toBe(3);
    expect(readExplicitLineDiscount({})).toBe(0);
  });
});
