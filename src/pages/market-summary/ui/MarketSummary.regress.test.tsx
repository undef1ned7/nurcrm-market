/**
 * Регрессии по стресс-тесту «Сводки» (06.10.2026): частичный отказ запросов,
 * нули вместо «—», кассир без «Аналитики», нагрузка от «Обновить».
 */
import { describe, expect, it, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import ru from "../../../../public/locales/ru/translation.json";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@shared/api", () => ({ default: apiMock }));
vi.mock("react-chartjs-2", () => ({
  Bar: (p: any) => <div data-testid="bar">{(p.data.labels || []).join("|")}</div>,
}));

import MarketSummary from "./MarketSummary";

const i18n = i18next.createInstance();
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "ru",
    fallbackLng: "ru",
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
});

const mkStore = (profile: any = { role: "owner" }) =>
  configureStore({
    reducer: { user: (s = { profile, company: { subscription_plan: { name: "Стандарт" } } }) => s },
  });
const wrap = (profile?: any) =>
  render(
    <Provider store={mkStore(profile)}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <MarketSummary />
        </MemoryRouter>
      </I18nextProvider>
    </Provider>,
  );

const kind = (url: string, cfg: any) =>
  url.includes("analytics")
    ? cfg?.params?.tab === "abc"
      ? "abc"
      : "analytics"
    : url.includes("pos/sales")
      ? "sales"
      : url.includes("products/list")
        ? "catalog"
        : "other";

const good = {
  cards: { revenue: "12500", transactions: 10, avg_check: "1250", gross_profit_total: "3000" },
  charts: { sales_dynamics: [{ date: "2026-10-06", revenue: 12500 }], payment_methods: [{ method: "cash", total: 12500 }] },
  tables: { top_products: [{ name: "Хлеб", sold: 3, revenue: 90 }] },
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  apiMock.get.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("частичный отказ и ошибки", () => {
  it("список продаж 403 — выручка всё равно видна, ошибка только в блоке продаж", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) => {
      const k = kind(url, cfg);
      if (k === "sales") return Promise.reject({ response: { status: 403, data: {} } });
      if (k === "analytics") return Promise.resolve({ data: good });
      return Promise.resolve({ data: { results: [] } });
    });
    wrap();
    expect((await screen.findAllByText("12 500 сом")).length).toBeGreaterThan(0);
    expect(screen.getByText("Нет доступа к списку продаж.")).toBeTruthy();
    expect(screen.queryByText(/Недостаточно прав для просмотра цифр/)).toBeNull();
  });

  it("аналитика 500 — в карточках «—», а не «0 сом»", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      kind(url, cfg) === "analytics"
        ? Promise.reject({ response: { status: 500, data: {} } })
        : Promise.resolve({ data: { results: [] } }),
    );
    wrap();
    expect(await screen.findByText(/Не удалось загрузить сводку/)).toBeTruthy();
    const kpis = document.querySelector(".msum__kpis")!.textContent || "";
    expect(kpis).not.toMatch(/0 сом/);
    expect(kpis).toMatch(/—/);
  });

  it("null в ответе — не «Нет связи с сервером», цифры видны", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      kind(url, cfg) === "analytics"
        ? Promise.resolve({ data: { ...good, charts: { sales_dynamics: [null], payment_methods: [null] } } })
        : Promise.resolve({ data: { results: [null] } }),
    );
    wrap();
    expect((await screen.findAllByText("12 500 сом")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Нет связи с сервером/)).toBeNull();
  });
});

describe("кассир без права «Аналитика»", () => {
  it("видит продажи и остатки, аналитика не запрашивается", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      kind(url, cfg) === "sales"
        ? Promise.resolve({ data: { results: [{ id: 1, status: "paid", total: 100, user_display: "Айбек" }] } })
        : Promise.resolve({ data: { results: [] } }),
    );
    wrap({ role: "cashier" });
    expect(await screen.findByText("Айбек")).toBeTruthy();
    expect(screen.getByText(/видны владельцу и сотрудникам с правом «Аналитика»/)).toBeTruthy();
    expect(screen.queryByText("Валовая прибыль")).toBeNull();
    expect(apiMock.get.mock.calls.some(([u, c]) => kind(u, c) === "analytics")).toBe(false);
  });
});

describe("нагрузка", () => {
  it("«Заканчивается» берёт с сервера только малый остаток, а не весь каталог", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      kind(url, cfg) === "analytics"
        ? Promise.resolve({ data: good })
        : Promise.resolve({ data: { results: [{ id: "p1", kind: "product", name: "Соль", quantity: "2", stock: false }], next: null } }),
    );
    wrap();
    expect(await screen.findByText("Соль")).toBeTruthy();
    const catalogCall = apiMock.get.mock.calls.find(([u, c]) => kind(u, c) === "catalog")!;
    expect(catalogCall[1].params).toMatchObject({ stock_type: "total", stock_condition: "lt", stock_value: 6 });
  });

  it("10 нажатий «Обновить» во время загрузки — одна загрузка остатков", async () => {
    let catalogCalls = 0;
    apiMock.get.mockImplementation((url: string, cfg: any) => {
      const k = kind(url, cfg);
      if (k === "catalog") {
        catalogCalls += 1;
        return new Promise(() => {}); // медленная сеть: не отвечает
      }
      if (k === "analytics") return Promise.resolve({ data: good });
      return Promise.resolve({ data: { results: [] } });
    });
    wrap();
    await screen.findAllByText("12 500 сом");
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByLabelText("Обновить"));
    await flush();
    expect(catalogCalls).toBe(1);
  });

  it("автообновление остатков: версия каталога та же — не перекачиваются, изменилась — перекачиваются", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let version = "v1";
    let catalogCalls = 0;
    apiMock.get.mockImplementation((url: string, cfg: any) => {
      if (String(url).includes("catalog-version")) return Promise.resolve({ data: { version } });
      const k = kind(url, cfg);
      if (k === "catalog") {
        catalogCalls += 1;
        return Promise.resolve({ data: { results: [{ id: "p1", kind: "product", name: "Соль", quantity: "2" }], next: null } });
      }
      if (k === "analytics") return Promise.resolve({ data: good });
      return Promise.resolve({ data: { results: [] } });
    });
    wrap();
    expect(await screen.findByText("Соль")).toBeTruthy();
    expect(catalogCalls).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(121_000);
    });
    await flush();
    expect(catalogCalls).toBe(1);
    version = "v2";
    await act(async () => {
      vi.advanceTimersByTime(121_000);
    });
    await flush();
    expect(catalogCalls).toBe(2);
  });

  it("продажи запрашиваются от новых к старым", async () => {
    apiMock.get.mockResolvedValue({ data: { results: [] } });
    wrap();
    await flush();
    const salesCall = apiMock.get.mock.calls.find(([u, c]) => kind(u, c) === "sales")!;
    expect(salesCall[1].params.ordering).toBe("-created_at");
  });

  it("период целиком в прошлом — без автообновления раз в 20 секунд", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    apiMock.get.mockImplementation((url: string, cfg: any) =>
      kind(url, cfg) === "analytics" ? Promise.resolve({ data: good }) : Promise.resolve({ data: { results: [] } }),
    );
    wrap();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Спец. дата" }));
    const [from, to] = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.change(from, { target: { value: "2025-01-01" } });
    fireEvent.change(to, { target: { value: "2025-01-31" } });
    await flush();
    const before = apiMock.get.mock.calls.filter(([u, c]) => kind(u, c) === "analytics").length;
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    const after = apiMock.get.mock.calls.filter(([u, c]) => kind(u, c) === "analytics").length;
    expect(after).toBe(before);
  });
});

describe("отображение", () => {
  it("изменение к прошлому периоду — с запятой: «+25,0 %»", async () => {
    apiMock.get.mockImplementation((url: string, cfg: any) => {
      if (kind(url, cfg) !== "analytics") return Promise.resolve({ data: { results: [] } });
      const isToday = cfg.params.period_start.slice(0, 10) === new Date().toISOString().slice(0, 10) ||
        new Date(cfg.params.period_start).getDate() === new Date().getDate();
      return Promise.resolve({ data: { ...good, cards: { ...good.cards, revenue: isToday ? 1250 : 1000 } } });
    });
    wrap();
    expect(await screen.findByText(/\+25,0 % к вчера на это время/)).toBeTruthy();
  });
});
