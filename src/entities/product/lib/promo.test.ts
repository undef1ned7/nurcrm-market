import { describe, expect, it } from "vitest";
import { isPromoProduct, promoPayload } from "./promo";

describe("акционный товар (is_promo / stock)", () => {
  it("новое имя is_promo главнее старого stock", () => {
    expect(isPromoProduct({ is_promo: true, stock: false })).toBe(true);
    expect(isPromoProduct({ is_promo: false, stock: true })).toBe(false);
  });

  it("старый сервер без is_promo — читаем stock", () => {
    expect(isPromoProduct({ stock: true })).toBe(true);
    expect(isPromoProduct({})).toBe(false);
    expect(isPromoProduct(null)).toBe(false);
  });

  it("при сохранении уходят оба имени с одним значением", () => {
    expect(promoPayload(true)).toEqual({ is_promo: true, stock: true });
    expect(promoPayload(false)).toEqual({ is_promo: false, stock: false });
  });
});
