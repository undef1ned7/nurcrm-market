import { describe, expect, it } from "vitest";
import { formatSaleItemName, saleItemVariantLabel } from "./saleItemName";
import {
  findNonExchangeableItems,
  getExchangeTermStatus,
  normalizeExchangeTermSettings,
} from "./exchangeTerm";
import { buildSaleReturnPayload } from "@shared/lib/tools/saleReturn";

describe("formatSaleItemName", () => {
  it("«Название — размер, цвет»", () => {
    expect(
      formatSaleItemName({
        product_name: "Платье летнее миди",
        variant_size: "44",
        variant_color: "Красный",
      }),
    ).toBe("Платье летнее миди — 44, Красный");
  });

  it("без размера — просто название; только цвет — с цветом", () => {
    expect(formatSaleItemName({ product_name: "Хлеб" })).toBe("Хлеб");
    expect(formatSaleItemName({ name: "Шарф", variant_color: "Белый" })).toBe("Шарф — Белый");
  });

  it("не дублирует, если сервер уже дописал размер", () => {
    expect(
      formatSaleItemName({ product_name: "Платье — 44, Красный", variant_size: "44", variant_color: "Красный" }),
    ).toBe("Платье — 44, Красный");
  });

  it("пустые данные — запасное название", () => {
    expect(formatSaleItemName({}, "Товар")).toBe("Товар");
    expect(formatSaleItemName(null)).toBe("—");
    expect(saleItemVariantLabel({ variant_size: "  ", variant_color: null })).toBe("");
  });
});

describe("normalizeExchangeTermSettings", () => {
  it("плоский ответ", () => {
    expect(
      normalizeExchangeTermSettings({
        ExchangeDaysLimit: 10,
        NonExchangeableCategories: "Нижнее бельё; Носки ;",
      }),
    ).toEqual({ daysLimit: 10, nonExchangeableCategories: ["нижнее бельё", "носки"] });
  });

  it("обёртка value / settings-строка JSON / snake_case", () => {
    expect(normalizeExchangeTermSettings({ value: { ExchangeDaysLimit: 0 } }).daysLimit).toBe(0);
    expect(
      normalizeExchangeTermSettings({ settings: JSON.stringify({ exchange_days_limit: "7" }) })
        .daysLimit,
    ).toBe(7);
  });

  it("не настроено / null / мусор — 14 дней и без категорий", () => {
    expect(normalizeExchangeTermSettings(null)).toEqual({
      daysLimit: 14,
      nonExchangeableCategories: [],
    });
    expect(
      normalizeExchangeTermSettings({ ExchangeDaysLimit: "abc", NonExchangeableCategories: null }),
    ).toEqual({ daysLimit: 14, nonExchangeableCategories: [] });
  });
});

describe("getExchangeTermStatus (не считая дня покупки, время Бишкека)", () => {
  const now = new Date("2026-10-08T10:00:00+06:00");

  it("чек от 05.10 → прошло 3 дн. из 14", () => {
    expect(getExchangeTermStatus("2026-10-05T12:00:00+06:00", 14, now)).toEqual({
      saleDate: "05.10.2026",
      daysPassed: 3,
      daysLimit: 14,
      expired: false,
    });
  });

  it("ровно 14 дней — ещё можно, 15 — срок вышел", () => {
    expect(getExchangeTermStatus("2026-09-24T12:00:00+06:00", 14, now)?.expired).toBe(false);
    expect(getExchangeTermStatus("2026-09-23T12:00:00+06:00", 14, now)?.expired).toBe(true);
  });

  it("покупка поздно вечером по UTC — это уже следующий день в Бишкеке", () => {
    // 2026-10-04T20:30Z = 05.10 02:30 в Бишкеке
    expect(getExchangeTermStatus("2026-10-04T20:30:00Z", 14, now)?.saleDate).toBe("05.10.2026");
  });

  it("лимит 0 — не проверять; мусорная дата — null", () => {
    expect(getExchangeTermStatus("2020-01-01", 0, now)?.expired).toBe(false);
    expect(getExchangeTermStatus("garbage", 14, now)).toBeNull();
    expect(getExchangeTermStatus(null, 14, now)).toBeNull();
  });
});

describe("findNonExchangeableItems", () => {
  it("находит строки из категорий «без обмена» без учёта регистра", () => {
    const items = [
      { name: "Носки", category_name: "Носки" },
      { name: "Платье", category_name: "Платья" },
      { name: "Без категории" },
    ];
    expect(findNonExchangeableItems(items, ["носки"]).map((i) => i.name)).toEqual(["Носки"]);
    expect(findNonExchangeableItems(items, [])).toEqual([]);
  });
});

describe("buildSaleReturnPayload: причина и брак", () => {
  it("reason уходит обрезанным, is_defect — только true", () => {
    const p = buildSaleReturnPayload({
      idempotencyKey: "k",
      reason: "  Не подошёл размер  ",
      is_defect: true,
    });
    expect(p).toEqual({ idempotency_key: "k", reason: "Не подошёл размер", is_defect: true });
  });

  it("пустая причина не уходит, длинная — до 500 символов", () => {
    expect(buildSaleReturnPayload({ idempotencyKey: "k", reason: "   " })).toEqual({
      idempotency_key: "k",
    });
    expect(buildSaleReturnPayload({ idempotencyKey: "k", reason: "x".repeat(900) }).reason).toHaveLength(500);
  });
});
