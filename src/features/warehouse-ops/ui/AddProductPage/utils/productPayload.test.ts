import { describe, expect, it } from "vitest";
import { buildProductPayload, isSameQuantity } from "./productUtils";

const base = (over: Record<string, any> = {}) => ({
  newItemData: { name: "Хлеб", barcode: "123", price: "50", purchase_price: "30", quantity: "10", ...over },
  marketData: { unit: "шт", stock: true, promotionRules: [], packagings: [] },
  itemType: "product",
  weightProductsCount: 0,
});

describe("buildProductPayload: акционный товар", () => {
  it("уходят is_promo и старое stock с одним значением", () => {
    const p: any = buildProductPayload(base());
    expect(p.is_promo).toBe(true);
    expect(p.stock).toBe(true);
  });

  it("услуга — не акционная", () => {
    const p: any = buildProductPayload({ ...base(), itemType: "service" });
    expect(p).toMatchObject({ is_promo: false, stock: false });
  });
});

describe("isSameQuantity (правка товара без смены остатка)", () => {
  it("одно число в разной записи — не изменение", () => {
    expect(isSameQuantity("20", "20")).toBe(true);
    expect(isSameQuantity("20.0", "20")).toBe(true);
    expect(isSameQuantity("1,5", "1.5")).toBe(true);
    expect(isSameQuantity(" 7 ", "7")).toBe(true);
    expect(isSameQuantity("", "")).toBe(true);
  });

  it("другое число, пусто против числа, мусор — изменение", () => {
    expect(isSameQuantity("25", "20")).toBe(false);
    expect(isSameQuantity("", "20")).toBe(false);
    expect(isSameQuantity("0", "")).toBe(false);
    expect(isSameQuantity("abc", "20")).toBe(false);
  });
});
