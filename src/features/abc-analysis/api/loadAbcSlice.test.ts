import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));

import { resetCatalogVersionSupport } from "@entities/product";
import { loadAbcSlice, resetAbcCatalogCache } from "./loadAbcSlice";
import { ABC_SLICES } from "../model/slices";

const stockSlice = ABC_SLICES.find((s) => s.id === "stock")!;
const period = { from: new Date("2026-10-01"), to: new Date("2026-10-08") };
const catalog = { next: null, results: [{ id: "p1", kind: "product", name: "Соль", purchase_price: "20", price: "30", quantity: "5" }] };

const listCalls = () => apiMock.get.mock.calls.filter(([u]) => String(u).includes("products/list")).length;

beforeEach(() => {
  apiMock.get.mockReset();
  resetCatalogVersionSupport();
  resetAbcCatalogCache();
});

describe("ABC «Склад» и версия каталога", () => {
  it("версия та же — каталог второй раз не качается", async () => {
    apiMock.get.mockImplementation((url: string) =>
      Promise.resolve({ data: String(url).includes("catalog-version") ? { version: "v1" } : catalog }),
    );
    const first = await loadAbcSlice(stockSlice, period);
    const second = await loadAbcSlice(stockSlice, period);
    expect(listCalls()).toBe(1);
    expect(second.total).toBe(first.total);
    expect(first.total).toBe(100);
  });

  it("версия изменилась — каталог качается заново", async () => {
    let v = "v1";
    apiMock.get.mockImplementation((url: string) =>
      Promise.resolve({ data: String(url).includes("catalog-version") ? { version: v } : catalog }),
    );
    await loadAbcSlice(stockSlice, period);
    v = "v2";
    await loadAbcSlice(stockSlice, period);
    expect(listCalls()).toBe(2);
  });

  it("сервер без версии — качается каждый раз, как раньше", async () => {
    apiMock.get.mockImplementation((url: string) =>
      String(url).includes("catalog-version")
        ? Promise.reject({ response: { status: 404 } })
        : Promise.resolve({ data: catalog }),
    );
    await loadAbcSlice(stockSlice, period);
    await loadAbcSlice(stockSlice, period);
    expect(listCalls()).toBe(2);
  });
});
