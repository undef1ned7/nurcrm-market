import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));

import {
  PriceCheckUnavailableError,
  buildLocalPriceCheck,
  fetchPriceCheckPage,
  parsePriceCheckResponse,
  resetPriceCheckConditional,
} from "./priceCheck";
import { fetchCatalogVersion, resetCatalogVersionSupport } from "./catalogVersion";
import { mapCatalogProduct } from "./catalog";

const query = { filter: "all" as const, threshold: 15, search: "" };

beforeEach(() => {
  apiMock.get.mockReset();
  resetPriceCheckConditional();
  resetCatalogVersionSupport();
});

describe("parsePriceCheckResponse", () => {
  it("деньги строками → числа, маржа числом, null остаётся null", () => {
    const page = parsePriceCheckResponse(
      {
        summary: { stock_at_cost: "350000.00", stock_at_price: "1590000.00", future_profit: "61000.00", average_margin: "21.10", products_total: 20000 },
        counts: { all: 20000, loss: 412, lowMargin: 1033, noCost: 2857, negativeStock: 1818 },
        count: 2857,
        next: "…?page=2",
        results: [
          { id: "m1", name: "Батончик Mars 50г", barcode: "4011100091108", purchase_price: "0.00", price: "100.00", quantity: "48.000", markup: null, margin: null, stock_profit: null, flags: ["noCost"] },
        ],
        calculated_at: "2026-10-06T10:15:00+06:00",
      },
      '"etag-1"',
    );
    expect(page.summary).toEqual({ stockAtCost: 350000, stockAtPrice: 1590000, futureProfit: 61000, averageMargin: 21.1, productsTotal: 20000 });
    expect(page.counts.noCost).toBe(2857);
    expect(page.hasNext).toBe(true);
    expect(page.rows[0]).toMatchObject({ cost: 0, price: 100, qty: 48, markup: null, margin: null, stockProfit: null, flags: ["noCost"] });
    expect(page.calculatedAt?.toISOString()).toBe("2026-10-06T04:15:00.000Z");
    expect(page.etag).toBe('"etag-1"');
  });

  it("неизвестные метки отбрасываются, мусор в числах — 0, нет счётчика — 0", () => {
    const page = parsePriceCheckResponse({
      summary: { stock_at_cost: "abc", average_margin: null },
      counts: { all: "5" },
      results: [{ id: 1, name: "X", price: "1e400", flags: ["loss", "superDeal", 7] }],
    });
    expect(page.summary.stockAtCost).toBe(0);
    expect(page.summary.averageMargin).toBeNull();
    expect(page.counts).toEqual({ all: 5, loss: 0, lowMargin: 0, noCost: 0, negativeStock: 0 });
    expect(page.rows[0].flags).toEqual(["loss"]);
    expect(page.rows[0].price).toBe(0);
    expect(page.count).toBe(1);
  });

  it("null, массив или строка вместо объекта — ошибка, а не пустой склад", () => {
    expect(() => parsePriceCheckResponse(null)).toThrow();
    expect(() => parsePriceCheckResponse([])).toThrow();
    expect(() => parsePriceCheckResponse("<html>")).toThrow();
  });
});

describe("fetchPriceCheckPage", () => {
  it("параметры запроса по контракту, поиск — только если задан", async () => {
    apiMock.get.mockResolvedValue({ status: 200, data: { results: [] }, headers: {} });
    await fetchPriceCheckPage({ filter: "noCost", threshold: 20, search: "  " }, 3);
    const [url, cfg] = apiMock.get.mock.calls[0];
    expect(url).toBe("main/products/price-check/");
    expect(cfg.params).toEqual({ filter: "noCost", threshold: 20, page: 3, page_size: 200, ordering: "name" });
    await fetchPriceCheckPage({ ...query, search: " 4011100091108 " }, 1);
    expect(apiMock.get.mock.calls[1][1].params.search).toBe("4011100091108");
  });

  it("ETag → If-None-Match, 304 → null (данные не менялись)", async () => {
    apiMock.get.mockResolvedValue({ status: 304, data: "", headers: {} });
    expect(await fetchPriceCheckPage(query, 1, { etag: '"v1"' })).toBeNull();
    expect(apiMock.get.mock.calls[0][1].headers).toEqual({ "If-None-Match": '"v1"' });
    // 304 не считается ошибкой axios
    expect(apiMock.get.mock.calls[0][1].validateStatus(304)).toBe(true);
    expect(apiMock.get.mock.calls[0][1].validateStatus(500)).toBe(false);
  });

  it("ETag из заголовков ответа сохраняется", async () => {
    apiMock.get.mockResolvedValue({ status: 200, data: { results: [] }, headers: { etag: '"v7"' } });
    expect((await fetchPriceCheckPage(query, 1))?.etag).toBe('"v7"');
  });

  it("404 — эндпоинта нет: PriceCheckUnavailableError", async () => {
    apiMock.get.mockRejectedValue({ response: { status: 404 } });
    await expect(fetchPriceCheckPage(query, 1)).rejects.toBeInstanceOf(PriceCheckUnavailableError);
  });

  it("CORS не пустил If-None-Match — повтор без него, и больше не шлём", async () => {
    apiMock.get
      .mockRejectedValueOnce({ message: "Network Error" })
      .mockResolvedValue({ status: 200, data: { results: [] }, headers: {} });
    await fetchPriceCheckPage(query, 1, { etag: '"v1"' });
    expect(apiMock.get.mock.calls[1][1].headers).toBeUndefined();
    await fetchPriceCheckPage(query, 1, { etag: '"v1"' });
    expect(apiMock.get.mock.calls[2][1].headers).toBeUndefined();
  });

  it("500 — ошибка пробрасывается (вкладка покажет «не удалось обновить»)", async () => {
    apiMock.get.mockRejectedValue({ response: { status: 500 } });
    await expect(fetchPriceCheckPage(query, 1)).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe("buildLocalPriceCheck (запасной путь)", () => {
  const items = [
    { id: 1, name: "Убыток", purchase_price: "100", price: "90", quantity: "2" },
    { id: 2, name: "В ноль", purchase_price: "50", price: "50", quantity: "1" },
    { id: 3, name: "Низкая маржа", purchase_price: "90", price: "100", quantity: "10" },
    { id: 4, name: "Без закупки", purchase_price: "0", price: "70", quantity: "5", barcode: "4011100091108" },
    { id: 5, name: "Минус", purchase_price: "10", price: "20", quantity: "-3" },
    { id: 6, name: "Хорошо", purchase_price: "50", price: "100", quantity: "4" },
    { id: 7, name: "Доставка", purchase_price: "0", price: "300", quantity: "0", kind: "service" },
  ].map((p) => mapCatalogProduct({ kind: "product", ...p }));

  it("контрольный пример ТЗ: итоги как на сервере, услуги не считаются", () => {
    const r = buildLocalPriceCheck(items, query, 1);
    expect(r.summary.futureProfit).toBe(280);
    expect(r.summary.averageMargin).toBeCloseTo(17.18, 2);
    expect(r.summary.stockAtPrice).toBe(1980);
    expect(r.summary.productsTotal).toBe(6);
    expect(r.counts).toEqual({ all: 6, loss: 2, lowMargin: 1, noCost: 1, negativeStock: 1 });
  });

  it("поиск по штрихкоду, как на сервере", () => {
    const r = buildLocalPriceCheck(items, { ...query, search: "40111000" }, 1);
    expect(r.rows.map((x) => x.id)).toEqual([4]);
  });

  it("страницы", () => {
    const many = Array.from({ length: 450 }, (_, i) => mapCatalogProduct({ id: i, kind: "product", name: `T${i}`, price: "1" }));
    expect(buildLocalPriceCheck(many, query, 1).rows).toHaveLength(200);
    const last = buildLocalPriceCheck(many, query, 3);
    expect(last.rows).toHaveLength(50);
    expect(last.hasNext).toBe(false);
  });
});

describe("fetchCatalogVersion", () => {
  it("версия из объекта или голой строки", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { version: "2026-10-06T10:15:00.123456+06:00", products_total: 20000 } });
    expect(await fetchCatalogVersion()).toBe("2026-10-06T10:15:00.123456+06:00");
    apiMock.get.mockResolvedValueOnce({ data: "abc123" });
    expect(await fetchCatalogVersion()).toBe("abc123");
  });

  it("мусор вместо версии — null («не знаю»)", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { results: [] } });
    expect(await fetchCatalogVersion()).toBeNull();
  });

  it("404 — эндпоинта нет: больше не спрашиваем", async () => {
    apiMock.get.mockRejectedValue({ response: { status: 404 } });
    expect(await fetchCatalogVersion()).toBeNull();
    expect(await fetchCatalogVersion()).toBeNull();
    expect(apiMock.get).toHaveBeenCalledTimes(1);
  });

  it("500 — null, но в следующий раз спросим снова", async () => {
    apiMock.get.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce({ data: { version: "v2" } });
    expect(await fetchCatalogVersion()).toBeNull();
    expect(await fetchCatalogVersion()).toBe("v2");
  });

  it("отмена запроса пробрасывается", async () => {
    apiMock.get.mockRejectedValue({ code: "ERR_CANCELED", name: "CanceledError" });
    await expect(fetchCatalogVersion()).rejects.toMatchObject({ code: "ERR_CANCELED" });
  });
});
