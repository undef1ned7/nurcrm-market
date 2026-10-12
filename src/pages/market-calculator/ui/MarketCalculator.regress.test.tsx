/**
 * Регрессии по стресс-тесту «Калькуляции» (06.10.2026):
 * мусорный ввод, сканер штрихкодов, сохранение вкладок, «Проверка цен» на 20 000 товаров.
 */
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ru from "../../../../public/locales/ru/translation.json";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));

import {
  buildLocalPriceCheck,
  mapCatalogProduct,
  resetCatalogVersionSupport,
  resetPriceCheckConditional,
  type CatalogProduct,
} from "@entities/product";
import MarketCalculator from "./MarketCalculator";
import { CheckTab } from "./CheckTab";
import { BreakevenTab } from "./BreakevenTab";

const i18n = i18next.createInstance();
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
});

const store = configureStore({
  reducer: { user: (s = { profile: { role: "owner" }, company: { subscription_plan: { name: "Старт" } } }) => s },
});
const wrap = (ui: any) =>
  render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nextProvider>
    </Provider>,
  );

const product = (over: Record<string, any> = {}) => ({
  id: "p1",
  kind: "product",
  name: "Батончик Mars 50г",
  barcode: "4011100091108",
  purchase_price: "60",
  price: "100",
  quantity: "48",
  stock: false,
  ...over,
});

beforeEach(() => {
  resetCatalogVersionSupport();
  resetPriceCheckConditional();
  apiMock.get.mockReset();
  apiMock.get.mockResolvedValue({ data: { results: [], cards: {} } });
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ввод", () => {
  it("мусор в закупке — ошибка у поля и подсказка, а не «введите закупку»", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "abc" } });
    expect(screen.getByText("Введите число, например 1 250,50")).toBeTruthy();
    expect(screen.getByText(/Исправьте поля, отмеченные красным/)).toBeTruthy();
  });

  it("закупка «1,000.50» из Excel понимается как 1000,50", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "1,000.50" } });
    // наценка по умолчанию 30 % → 1 300,65
    expect(screen.getByText(/1\s300,65/)).toBeTruthy();
  });

  it("отрицательная закупка — ошибка «Не меньше 0»", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "-80" } });
    expect(screen.getByText("Не меньше 0")).toBeTruthy();
  });

  it("плитка «Маржа» = заданной марже, когда есть налог", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("radio", { name: /От маржи/ }));
    fireEvent.change(screen.getByLabelText("Маржа, %"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Налог с выручки, %"), { target: { value: "1" } });
    const tile = screen.getByText("от цены продажи, после налога").closest(".calc-tile") as HTMLElement;
    expect(within(tile).getByText("25 %")).toBeTruthy();
  });

  it("скидка «5%» с маржой 30 % → в 1,2 раза, а не «в 1 раз»", () => {
    wrap(<MarketCalculator />);
    fireEvent.click(screen.getByRole("tab", { name: /Скидка и акция/ }));
    fireEvent.change(screen.getByLabelText("Скидка, %"), { target: { value: "5%" } });
    expect(screen.getByText("в 1,2 раз(а)")).toBeTruthy();
  });

  it("отрицательная скидка — ошибка, результата нет", () => {
    wrap(<MarketCalculator />);
    fireEvent.click(screen.getByRole("tab", { name: /Скидка и акция/ }));
    fireEvent.change(screen.getByLabelText("Скидка, %"), { target: { value: "-10" } });
    expect(screen.getByText("Не меньше 0")).toBeTruthy();
    expect(screen.queryByText(/0,75 раз/)).toBeNull();
  });
});

describe("вкладки", () => {
  it("введённое не теряется при переключении", () => {
    wrap(<MarketCalculator />);
    fireEvent.change(screen.getByLabelText("Закупочная цена"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("tab", { name: /Скидка и акция/ }));
    fireEvent.click(screen.getByRole("tab", { name: /Цена и наценка/ }));
    expect((screen.getByLabelText("Закупочная цена") as HTMLInputElement).value).toBe("80");
  });

  it("«Проверка цен» не грузит каталог, пока её не открыли", () => {
    wrap(<MarketCalculator />);
    expect(apiMock.get.mock.calls.some(([u]) => String(u).includes("products/list"))).toBe(false);
  });
});

describe("поиск товара", () => {
  it("сканер: штрихкод + Enter раньше задержки поиска — товар выбирается сам", async () => {
    apiMock.get.mockResolvedValue({ data: { results: [product(), product({ id: "p2", barcode: "999", name: "Другой" })] } });
    wrap(<MarketCalculator />);
    const q = screen.getByLabelText("Товар");
    fireEvent.change(q, { target: { value: "4011100091108" } });
    await act(async () => {
      fireEvent.keyDown(q, { key: "Enter" });
    });
    expect((screen.getByLabelText("Закупочная цена") as HTMLInputElement).value).toBe("60");
    expect((q as HTMLInputElement).value).toBe("Батончик Mars 50г");
  });

  it("стрелки и Enter выбирают из списка", async () => {
    vi.useFakeTimers();
    apiMock.get.mockResolvedValue({
      data: { results: [product(), product({ id: "p2", name: "Mars XL", purchase_price: "90", barcode: "1" })] },
    });
    wrap(<MarketCalculator />);
    const q = screen.getByLabelText("Товар");
    fireEvent.focus(q);
    fireEvent.change(q, { target: { value: "mars" } });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    fireEvent.keyDown(q, { key: "ArrowDown" });
    fireEvent.keyDown(q, { key: "ArrowDown" });
    fireEvent.keyDown(q, { key: "Enter" });
    expect((screen.getByLabelText("Закупочная цена") as HTMLInputElement).value).toBe("90");
  });
});

// ── «Проверка цен»: сервер считает склад (price-check, 08.10.2026) ──────────

/** Каталог «на сервере» — из него мок price-check считает ответ по тем же формулам. */
const serverCatalog = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    mapCatalogProduct(
      product({ id: `p${i}`, name: `Товар ${String(i).padStart(5, "0")}`, barcode: `47${i}`, purchase_price: String(50 + (i % 5)), price: "60" }),
    ),
  );

/** Контрольный пример из ТЗ (01-price-check-endpoint.md §1.3), порог 15 %. */
const CONTROL = [
  { id: 1, name: "Убыток", purchase_price: "100", price: "90", quantity: "2" },
  { id: 2, name: "В ноль", purchase_price: "50", price: "50", quantity: "1" },
  { id: 3, name: "Низкая маржа", purchase_price: "90", price: "100", quantity: "10" },
  { id: 4, name: "Без закупки", purchase_price: "0", price: "70", quantity: "5" },
  { id: 5, name: "Минус", purchase_price: "10", price: "20", quantity: "-3" },
  { id: 6, name: "Хорошо", purchase_price: "50", price: "100", quantity: "4" },
].map((p) => mapCatalogProduct(product(p)));

/** Ответ price-check по контракту: деньги строками, маржа числом. */
const priceCheckResponse = (catalog: CatalogProduct[], params: Record<string, any> = {}) => {
  const page = Number(params.page ?? 1);
  const size = Number(params.page_size ?? 200);
  const r = buildLocalPriceCheck(
    catalog,
    { filter: params.filter ?? "all", threshold: Number(params.threshold ?? 15), search: String(params.search ?? "") },
    page,
    size,
  );
  const m2 = (n: number | null) => (n == null ? null : n.toFixed(2));
  return {
    summary: {
      stock_at_cost: m2(r.summary.stockAtCost),
      stock_at_price: m2(r.summary.stockAtPrice),
      future_profit: m2(r.summary.futureProfit),
      average_margin: m2(r.summary.averageMargin),
      products_total: r.summary.productsTotal,
    },
    counts: r.counts,
    count: r.count,
    next: r.hasNext ? `main/products/price-check/?page=${page + 1}` : null,
    previous: null,
    results: r.rows.map((row) => ({
      id: row.id,
      name: row.name,
      barcode: row.barcode,
      purchase_price: m2(row.cost),
      price: m2(row.price),
      quantity: row.qty.toFixed(3),
      markup: row.markup,
      margin: row.margin,
      stock_profit: m2(row.stockProfit),
      flags: row.flags,
    })),
    calculated_at: "2026-10-08T10:15:00+06:00",
  };
};

type ServerOpts = {
  catalog: CatalogProduct[];
  /** Версия каталога; null — эндпоинта версии нет (404). */
  version?: () => string | null;
  etag?: string;
};

/** Мок сервера: price-check, catalog-version и (на всякий случай) список товаров. */
const mockServer = ({ catalog, version = () => "v1", etag = '"pc-1"' }: ServerOpts) => {
  const calls: { url: string; params: any; headers: any }[] = [];
  apiMock.get.mockImplementation((url: string, config: any = {}) => {
    calls.push({ url: String(url), params: config.params ?? {}, headers: config.headers ?? {} });
    if (String(url).includes("catalog-version")) {
      const v = version();
      return v === null
        ? Promise.reject({ response: { status: 404 } })
        : Promise.resolve({ status: 200, data: { version: v, products_total: catalog.length }, headers: {} });
    }
    if (String(url).includes("price-check")) {
      if (config.headers?.["If-None-Match"] === etag) {
        return Promise.resolve({ status: 304, data: "", headers: { etag } });
      }
      return Promise.resolve({ status: 200, data: priceCheckResponse(catalog, config.params), headers: { etag } });
    }
    return Promise.resolve({ status: 200, data: { results: [] }, headers: {} });
  });
  return {
    calls,
    priceChecks: () => calls.filter((c) => c.url.includes("price-check")),
    listCalls: () => calls.filter((c) => c.url.includes("products/list")),
  };
};

const rowsCount = () => document.querySelectorAll("tbody tr").length;
const tileValue = (label: string) =>
  (screen.getByText(label).closest(".calc-tile") as HTMLElement).textContent ?? "";

describe("«Проверка цен»: сервер считает склад", () => {
  it("25 000 товаров — один запрос, итоги по всему складу, без предупреждения об обрезке", async () => {
    const server = mockServer({ catalog: serverCatalog(25000) });
    wrap(<CheckTab />);
    expect(await screen.findByText("Показано 200 из 25 000", {}, { timeout: 5000 })).toBeTruthy();
    expect(rowsCount()).toBe(200);
    expect(server.priceChecks()).toHaveLength(1);
    expect(server.listCalls()).toHaveLength(0); // каталог больше не выкачивается
    expect(screen.queryByText(/Загружено .* товаров из/)).toBeNull();
    const first = server.priceChecks()[0].params;
    expect(first).toMatchObject({ filter: "all", threshold: 15, page: 1, page_size: 200 });
  });

  it("«Показать ещё» догружает следующую страницу с сервера", async () => {
    const server = mockServer({ catalog: serverCatalog(25000) });
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 25 000", {}, { timeout: 5000 });
    await act(async () => {
      fireEvent.click(screen.getByText("Показать ещё 200"));
    });
    expect(await screen.findByText("Показано 400 из 25 000")).toBeTruthy();
    expect(rowsCount()).toBe(400);
    expect(server.priceChecks().at(-1)!.params.page).toBe(2);
  });

  it("контрольный пример ТЗ: итоги и счётчики фильтров", async () => {
    mockServer({ catalog: CONTROL });
    wrap(<CheckTab />);
    await screen.findByText("Показано 6 из 6");
    expect(tileValue("Будущая прибыль склада")).toMatch(/280\s*сом/);
    expect(tileValue("Средняя маржа склада")).toMatch(/17,2\s*%/);
    expect(tileValue("Склад по цене продажи")).toMatch(/1\s980\s*сом/);
    const chip = (name: RegExp) => screen.getByRole("button", { name });
    expect(chip(/В убыток или в ноль/).textContent).toMatch(/2$/);
    expect(chip(/Без закупочной цены/).textContent).toMatch(/1$/);
    expect(chip(/Минус на складе/).textContent).toMatch(/1$/);
  });

  it("фильтр и поиск по штрихкоду уходят на сервер", async () => {
    const server = mockServer({ catalog: serverCatalog(1000) });
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 1 000");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Без закупочной цены/ }));
    });
    await waitFor(() => expect(server.priceChecks().at(-1)!.params.filter).toBe("noCost"));

    fireEvent.change(screen.getByLabelText("Поиск по названию, артикулу или штрихкоду"), { target: { value: "47999" } });
    await waitFor(() => expect(server.priceChecks().at(-1)!.params.search).toBe("47999"), { timeout: 2000 });
    expect(server.priceChecks().at(-1)!.params.page).toBe(1);
  });

  it("автообновление: версия каталога та же — данные не перекачиваются", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = mockServer({ catalog: serverCatalog(300) });
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 300");
    await act(async () => {
      vi.advanceTimersByTime(125_000);
    });
    await act(async () => {
      vi.advanceTimersByTime(125_000);
    });
    expect(server.priceChecks()).toHaveLength(1);
    expect(server.calls.filter((c) => c.url.includes("catalog-version")).length).toBeGreaterThanOrEqual(3);
  });

  it("автообновление: версия изменилась — данные перезагружаются", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let v = "v1";
    const server = mockServer({ catalog: serverCatalog(300), version: () => v });
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 300");
    v = "v2";
    await act(async () => {
      vi.advanceTimersByTime(125_000);
    });
    await waitFor(() => expect(server.priceChecks()).toHaveLength(2));
  });

  it("версии нет на сервере — повтор с If-None-Match, 304 оставляет таблицу", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = mockServer({ catalog: serverCatalog(300), version: () => null });
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 300");
    await act(async () => {
      vi.advanceTimersByTime(125_000);
    });
    await waitFor(() => expect(server.priceChecks()).toHaveLength(2));
    expect(server.priceChecks()[1].headers["If-None-Match"]).toBe('"pc-1"');
    expect(screen.getByText("Показано 200 из 300")).toBeTruthy();
    expect(rowsCount()).toBe(200);
  });

  it("CORS не пустил If-None-Match — тот же запрос повторяется без него", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const server = mockServer({ catalog: serverCatalog(300), version: () => null });
    const base = apiMock.get.getMockImplementation()!;
    apiMock.get.mockImplementation((url: string, config: any = {}) =>
      config.headers?.["If-None-Match"] ? Promise.reject({ message: "Network Error" }) : base(url, config),
    );
    wrap(<CheckTab />);
    await screen.findByText("Показано 200 из 300");
    await act(async () => {
      vi.advanceTimersByTime(125_000);
    });
    await waitFor(() =>
      expect(apiMock.get.mock.calls.filter(([u, c]) => String(u).includes("price-check") && !c?.headers).length).toBe(2),
    );
    expect(screen.queryByText("Не удалось обновить каталог — показаны последние полученные данные.")).toBeNull();
    expect(server.calls.length).toBeGreaterThan(0);
  });

  it("медленная сеть: автообновление не запускает вторую загрузку параллельно", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let inflight = 0;
    let maxInflight = 0;
    apiMock.get.mockImplementation(
      () =>
        new Promise((res) => {
          inflight += 1;
          maxInflight = Math.max(maxInflight, inflight);
          setTimeout(() => {
            inflight -= 1;
            res({ status: 200, data: { version: "v1" }, headers: {} });
          }, 200_000);
        }),
    );
    wrap(<CheckTab />);
    await act(async () => {
      vi.advanceTimersByTime(130_000);
    });
    await act(async () => {
      vi.advanceTimersByTime(130_000);
    });
    expect(maxInflight).toBe(1);
  });
});

describe("«Проверка цен»: старый сервер без price-check (запасной путь)", () => {
  const catalogApi = (total: number, maxServe = total) =>
    apiMock.get.mockImplementation((url: string) => {
      if (String(url).includes("price-check") || String(url).includes("catalog-version")) {
        return Promise.reject({ response: { status: 404 } });
      }
      const page = String(url).includes("page=") ? Number(new URL("http://x/" + url).searchParams.get("page")) : 1;
      const from = (page - 1) * 200;
      const n = Math.max(0, Math.min(200, maxServe - from));
      const results = Array.from({ length: n }, (_, i) =>
        product({ id: `p${from + i}`, name: `Товар ${from + i}`, purchase_price: String(50 + (i % 5)), price: "60" }),
      );
      const next = page * 200 < total ? `main/products/list/?page=${page + 1}&page_size=200` : null;
      return Promise.resolve({ data: { count: total, next, results } });
    });

  it("20 000 товаров — в таблице 200 строк и «Показать ещё»", async () => {
    catalogApi(20000);
    wrap(<CheckTab />);
    expect(await screen.findByText("Показано 200 из 20 000", {}, { timeout: 20000 })).toBeTruthy();
    expect(rowsCount()).toBe(200);
    await act(async () => {
      fireEvent.click(screen.getByText("Показать ещё 200"));
    });
    expect(rowsCount()).toBe(400);
  }, 30000);

  it("больше 20 000 — предупреждение, что загружена часть", async () => {
    catalogApi(25000);
    wrap(<CheckTab />);
    expect(await screen.findByText(/Загружено 20\s000 товаров из 25\s000/, {}, { timeout: 20000 })).toBeTruthy();
  }, 30000);
});

describe("«Безубыточность»", () => {
  it("неверные типы в сохранённых данных не роняют вкладку", () => {
    localStorage.setItem("market_calc_breakeven", JSON.stringify({ rent: 123, margin: { x: 1 }, days: null }));
    wrap(<BreakevenTab />);
    expect((screen.getByLabelText("Аренда") as HTMLInputElement).value).toBe("123");
  });

  it("0 рабочих дней — ошибка, а не «0 сом в день»", () => {
    wrap(<BreakevenTab />);
    fireEvent.change(screen.getByLabelText("Аренда"), { target: { value: "80000" } });
    fireEvent.change(screen.getByLabelText("Средняя маржа, %"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Рабочих дней в месяце"), { target: { value: "0" } });
    expect(screen.getByText("Не меньше 1")).toBeTruthy();
    expect(screen.queryByText(/0 сом в день/)).toBeNull();
  });

  it("отрицательная маржа за 30 дней — предупреждение, в поле не подставляется", async () => {
    apiMock.get.mockResolvedValue({ data: { cards: { revenue: "50000.00", margin_percent_total: -4.31, avg_check: "640.00" } } });
    wrap(<BreakevenTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("Взять маржу и средний чек из продаж за 30 дней"));
    });
    expect(screen.getByText(/маржа отрицательная: [-−]4,3 %/)).toBeTruthy();
    expect((screen.getByLabelText("Средняя маржа, %") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Средний чек") as HTMLInputElement).value).toBe("640");
    expect(screen.queryByText(/нет продаж для расчёта/)).toBeNull();
  });

  it("нет продаж: выручка «0.00», маржа null — «нет продаж», а не 0 %", async () => {
    apiMock.get.mockResolvedValue({
      data: { cards: { revenue: "0.00", avg_check: "0.00", margin_percent_total: null, gross_profit_total: "0.00" } },
    });
    wrap(<BreakevenTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("Взять маржу и средний чек из продаж за 30 дней"));
    });
    expect(screen.getByText(/За 30 дней нет продаж для расчёта/)).toBeTruthy();
    expect((screen.getByLabelText("Средняя маржа, %") as HTMLInputElement).value).toBe("");
  });

  it("маржа строкой с бэка (margin_percent_total) подставляется", async () => {
    apiMock.get.mockResolvedValue({ data: { cards: { revenue: "120000.00", margin_percent_total: 23.46, avg_check: "812.50" } } });
    wrap(<BreakevenTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("Взять маржу и средний чек из продаж за 30 дней"));
    });
    expect((screen.getByLabelText("Средняя маржа, %") as HTMLInputElement).value).toBe("23,5");
    expect((screen.getByLabelText("Средний чек") as HTMLInputElement).value).toBe("813");
  });

  it("маржа 1e308 из аналитики не подставляется", async () => {
    apiMock.get.mockResolvedValue({ data: { cards: { margin_percent_total: 1e308, avg_check: 500 } } });
    wrap(<BreakevenTab />);
    await act(async () => {
      fireEvent.click(screen.getByText("Взять маржу и средний чек из продаж за 30 дней"));
    });
    expect((screen.getByLabelText("Средняя маржа, %") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Средний чек") as HTMLInputElement).value).toBe("500");
  });
});
