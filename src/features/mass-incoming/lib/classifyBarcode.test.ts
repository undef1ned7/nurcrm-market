import { beforeEach, describe, expect, it, vi } from "vitest";

const productApi = vi.hoisted(() => ({
  lookupWarehouseProductByBarcodeApi: vi.fn(),
  getProductByBarcodeApi: vi.fn(),
  fetchProductsApi: vi.fn(),
}));

vi.mock("@entities/product", () => productApi);

import { classifyBarcodeFallback, mergeScannedRow } from "./classifyBarcode";

const notFound = { status: 404, data: { detail: "Не найден" } };

describe("mergeScannedRow", () => {
  it("uses company product id as stable key", () => {
    const row = mergeScannedRow(
      {
        status: "IN_STOCK",
        source: "company",
        barcode: "4601",
        product: { id: "p1", name: "Чай", stock_qty: 4, price: "120" },
      },
      "4601",
    );
    expect(row.key).toBe("p:p1");
    expect(row.productId).toBe("p1");
    expect(row.quantity).toBe(1);
    expect(row.stockQty).toBe(4);
    expect(row.initialPrice).toBe("120");
  });

  it("does not treat a global product id as a company product", () => {
    const row = mergeScannedRow(
      {
        status: "IN_CATALOG",
        source: "global",
        barcode: "4602",
        product: { id: "g1", name: "Кофе", price: "300" },
      },
      "4602",
    );
    expect(row.key).toBe("global:4602");
    expect(row.productId).toBeUndefined();
    expect(row.price).toBe("300");
    expect(row.initialPrice).toBe("");
  });

  it("keeps unknown barcodes unique by code", () => {
    const row = mergeScannedRow(
      { status: "UNKNOWN", source: "none", barcode: "999", product: null },
      "999",
    );
    expect(row.key).toBe("none:999");
    expect(row.productId).toBeUndefined();
  });
});

describe("classifyBarcodeFallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    productApi.fetchProductsApi.mockResolvedValue({ results: [] });
  });

  it("company card → IN_STOCK", async () => {
    productApi.lookupWarehouseProductByBarcodeApi.mockResolvedValue({
      id: "p1",
      name: "Чай",
      quantity: "3",
    });
    const res = await classifyBarcodeFallback("4601");
    expect(res).toMatchObject({ status: "IN_STOCK", source: "company" });
    expect(productApi.getProductByBarcodeApi).not.toHaveBeenCalled();
  });

  it("alternate barcode of a company card → IN_STOCK", async () => {
    productApi.lookupWarehouseProductByBarcodeApi.mockRejectedValue(notFound);
    productApi.fetchProductsApi.mockResolvedValue({
      results: [{ id: "p2", name: "Сок", barcode: "111", alternate_barcodes: ["4603"] }],
    });
    const res = await classifyBarcodeFallback("4603");
    expect(res).toMatchObject({ status: "IN_STOCK", source: "company" });
    expect(res.product?.id).toBe("p2");
  });

  it("global NurCRM base only → IN_CATALOG / global", async () => {
    productApi.lookupWarehouseProductByBarcodeApi.mockRejectedValue(notFound);
    productApi.getProductByBarcodeApi.mockResolvedValue({ id: "g1", name: "Кофе" });
    const res = await classifyBarcodeFallback("4602");
    expect(res).toMatchObject({ status: "IN_CATALOG", source: "global" });
  });

  it("nowhere → UNKNOWN", async () => {
    productApi.lookupWarehouseProductByBarcodeApi.mockRejectedValue(notFound);
    productApi.getProductByBarcodeApi.mockRejectedValue(notFound);
    const res = await classifyBarcodeFallback("000");
    expect(res).toMatchObject({ status: "UNKNOWN", source: "none", barcode: "000" });
  });

  it("ambiguous barcode is reported, not guessed", async () => {
    productApi.lookupWarehouseProductByBarcodeApi.mockRejectedValue({
      status: 409,
      data: { matches: [{ id: "a" }, { id: "b" }] },
    });
    const res = await classifyBarcodeFallback("555");
    expect(res.ambiguous).toBe(true);
  });
});
