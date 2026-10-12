import { describe, expect, it } from "vitest";
import { isServiceProduct, mapCatalogProduct } from "./catalog";

describe("isServiceProduct", () => {
  it("обычный товар с stock=false (не акционный) — не услуга", () => {
    expect(isServiceProduct({ kind: "product", stock: false })).toBe(false);
  });

  it("услуга определяется по kind", () => {
    expect(isServiceProduct({ kind: "service", stock: false })).toBe(true);
  });
});

describe("mapCatalogProduct", () => {
  it("товар из /main/products/list/ попадает в калькулятор с ценой", () => {
    const p = mapCatalogProduct({
      id: "532685d6",
      kind: "product",
      name: "Батончик Mars 50г",
      barcode: "4011100091108",
      purchase_price: "0.00",
      price: "100.00",
      quantity: "48.000",
      stock: false,
    });
    expect(p).toMatchObject({ isService: false, price: 100, cost: 0, qty: 48 });
  });
});
 