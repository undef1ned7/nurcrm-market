import { describe, expect, it } from "vitest";
import {
  MARKET_WAREHOUSE_SALE_UNIT,
  applySaleUnitParams,
  buildMarketWarehouseListParams,
  classifyMarketWarehouseSaleUnit,
  filterProductsBySaleUnit,
  isMarketWarehousePieceSaleProduct,
  isMarketWarehouseWeightProduct,
  modalStateFromAppliedFilters,
} from "./marketWarehouseFilters";

describe("warehouse sale unit", () => {
  it("treats is_weight and scale_type=weight as weight products", () => {
    expect(isMarketWarehouseWeightProduct({ is_weight: true })).toBe(true);
    expect(isMarketWarehouseWeightProduct({ scale_type: "weight" })).toBe(true);
    expect(isMarketWarehouseWeightProduct({ scale_type: "piece" })).toBe(false);
  });

  it("treats retail packages as piece-sale only for ordinary products", () => {
    const pack = { packages: [{ quantity_in_package: 12 }] };
    expect(isMarketWarehousePieceSaleProduct(pack)).toBe(true);
    expect(
      isMarketWarehousePieceSaleProduct({
        kind: "bundle",
        packages: [{ quantity_in_package: 12 }],
      }),
    ).toBe(false);
    expect(
      isMarketWarehousePieceSaleProduct({
        packages: [{ quantity_in_package: 1 }],
      }),
    ).toBe(false);
  });

  it("classifies weight / piece / piece_sale", () => {
    expect(
      classifyMarketWarehouseSaleUnit({
        is_weight: true,
      }),
    ).toBe(MARKET_WAREHOUSE_SALE_UNIT.weight);
    expect(classifyMarketWarehouseSaleUnit({ name: "Хлеб" })).toBe(
      MARKET_WAREHOUSE_SALE_UNIT.piece,
    );
    expect(
      classifyMarketWarehouseSaleUnit({
        packages: [{ quantity_in_package: 10 }],
      }),
    ).toBe(MARKET_WAREHOUSE_SALE_UNIT.piece_sale);
  });

  it("prefers piece-sale over weight when product can be unpacked", () => {
    expect(
      classifyMarketWarehouseSaleUnit({
        is_weight: true,
        packages: [{ quantity_in_package: 8 }],
      }),
    ).toBe(MARKET_WAREHOUSE_SALE_UNIT.piece_sale);
  });

  it("filters a list by sale unit", () => {
    const items = [
      { id: 1, is_weight: true },
      { id: 2, name: "Штучный" },
      { id: 3, packages: [{ quantity_in_package: 6 }] },
    ];
    expect(
      filterProductsBySaleUnit(items, MARKET_WAREHOUSE_SALE_UNIT.weight).map(
        (p: any) => p.id,
      ),
    ).toEqual([1]);
    expect(
      filterProductsBySaleUnit(items, MARKET_WAREHOUSE_SALE_UNIT.piece).map(
        (p: any) => p.id,
      ),
    ).toEqual([2]);
    expect(
      filterProductsBySaleUnit(items, MARKET_WAREHOUSE_SALE_UNIT.piece_sale).map(
        (p: any) => p.id,
      ),
    ).toEqual([3]);
    expect(filterProductsBySaleUnit(items, "").map((p: any) => p.id)).toEqual([
      1, 2, 3,
    ]);
  });
});

describe("buildMarketWarehouseListParams sale_unit", () => {
  const base = {
    itemTypes: { product: true, service: true, kit: true },
  };

  it("omits sale_unit when not selected", () => {
    const { params } = buildMarketWarehouseListParams(base);
    expect(params.sale_unit).toBeUndefined();
    expect(params.is_weight).toBeUndefined();
  });

  it("sends is_weight=true for weight products", () => {
    const { params } = buildMarketWarehouseListParams({
      ...base,
      saleUnit: MARKET_WAREHOUSE_SALE_UNIT.weight,
    });
    expect(params.sale_unit).toBe("weight");
    expect(params.is_weight).toBe(true);
  });

  it("sends is_weight=false for piece products", () => {
    const { params } = buildMarketWarehouseListParams({
      ...base,
      saleUnit: MARKET_WAREHOUSE_SALE_UNIT.piece,
    });
    expect(params.sale_unit).toBe("piece");
    expect(params.is_weight).toBe(false);
  });

  it("sends only sale_unit for piece-sale products", () => {
    const { params } = buildMarketWarehouseListParams({
      ...base,
      saleUnit: MARKET_WAREHOUSE_SALE_UNIT.piece_sale,
    });
    expect(params.sale_unit).toBe("piece_sale");
    expect(params.is_weight).toBeUndefined();
  });

  it("restores sale unit from applied query params", () => {
    expect(modalStateFromAppliedFilters({ sale_unit: "piece_sale" }).saleUnit).toBe(
      "piece_sale",
    );
    expect(modalStateFromAppliedFilters({ is_weight: true }).saleUnit).toBe(
      "weight",
    );
    expect(modalStateFromAppliedFilters({}).saleUnit).toBe("");
  });

  it("applySaleUnitParams clears nothing when unit is empty", () => {
    const params: any = { search: "молоко" };
    applySaleUnitParams(params, "");
    expect(params).toEqual({ search: "молоко" });
  });
});
