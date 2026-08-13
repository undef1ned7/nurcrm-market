import { describe, expect, it } from "vitest";
import {
  isQtyAllowed,
  isWeightProduct,
  lineTotal,
  returnableQty,
  sumReturnItems,
  validateReturnQty,
} from "./returnMath";

describe("returnableQty", () => {
  it("caps by stock when there is no receipt", () => {
    expect(returnableQty({ stock: 8, purchasedQty: null })).toBe(8);
  });

  it("caps by remaining receipt qty and stock", () => {
    expect(
      returnableQty({ stock: 10, purchasedQty: 40, alreadyReturnedQty: 5 }),
    ).toBe(10);
    expect(
      returnableQty({ stock: 50, purchasedQty: 40, alreadyReturnedQty: 5 }),
    ).toBe(35);
  });

  it("never goes negative", () => {
    expect(
      returnableQty({ stock: 2, purchasedQty: 10, alreadyReturnedQty: 12 }),
    ).toBe(0);
  });
});

describe("validateReturnQty", () => {
  it("rejects zero, over-max and fractional piece qty", () => {
    expect(validateReturnQty({ qty: 0, maxQty: 5, isWeight: false })).toBeTruthy();
    expect(validateReturnQty({ qty: 6, maxQty: 5, isWeight: false })).toMatch(
      /больше/,
    );
    expect(
      validateReturnQty({ qty: 1.5, maxQty: 5, isWeight: false }),
    ).toMatch(/целым/);
  });

  it("allows fractional weight qty", () => {
    expect(
      validateReturnQty({ qty: 1.25, maxQty: 5, isWeight: true, unit: "кг" }),
    ).toBeNull();
  });
});

describe("isQtyAllowed / money", () => {
  it("accepts integers for piece goods", () => {
    expect(isQtyAllowed(2, false)).toBe(true);
    expect(isQtyAllowed(2.2, false)).toBe(false);
    expect(isQtyAllowed(2.2, true)).toBe(true);
  });

  it("rounds line totals to kopecks", () => {
    expect(lineTotal(3, 12.345)).toBe(37.04);
    expect(
      sumReturnItems([
        { qty: 2, purchasePrice: 10 },
        { qty: 1, purchase_price: 5.5 },
      ]),
    ).toBe(25.5);
  });
});

describe("isWeightProduct", () => {
  it("reads is_weight and scale_type", () => {
    expect(isWeightProduct({ is_weight: true })).toBe(true);
    expect(isWeightProduct({ scale_type: "weight" })).toBe(true);
    expect(isWeightProduct({ scale_type: "piece" })).toBe(false);
  });
});
