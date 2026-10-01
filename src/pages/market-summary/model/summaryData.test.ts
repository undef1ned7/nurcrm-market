import { describe, expect, it } from "vitest";
import {
  deltaPercent,
  paymentKind,
  parseRecentSales,
  parseSummarySales,
  pickLowStock,
} from "./summaryData";

describe("parseSummarySales", () => {
  it("читает карточки, дни, оплаты и лучшие товары (новый контракт)", () => {
    const s = parseSummarySales({
      cards: { revenue: "1000", transactions: 4, avg_check: "250", gross_profit_total: "300", returns_total: "50", returns_count: 1 },
      charts: {
        sales_dynamics: [{ date: "2026-10-01", revenue: 400, transactions: 2 }],
        payment_methods: [{ name: "Наличные", value: 600, percent: 60 }],
      },
      tables: { top_products: [{ name: "Хлеб", qty: 3, sum: "90" }] },
    });
    expect(s.totals).toMatchObject({ revenue: 1000, checks: 4, avgCheck: 250, grossProfit: 300, returnsTotal: 50 });
    expect(s.days).toEqual([{ date: "2026-10-01", revenue: 400 }]);
    expect(s.payments[0]).toMatchObject({ kind: "cash", value: 600 });
    expect(s.topProducts[0]).toEqual({ name: "Хлеб", qty: 3, revenue: 90 });
  });

  it("старый контракт и пустой ответ", () => {
    const s = parseSummarySales({ cards: { revenue: 5 }, charts: { sales_dynamics: [{ date: "d", value: 5 }], payment_methods: [{ method: "transfer", total: 5 }] } });
    expect(s.days[0].revenue).toBe(5);
    expect(s.payments[0].kind).toBe("card");
    expect(s.totals.grossProfit).toBeNull();
    expect(parseSummarySales(null).totals.revenue).toBe(0);
  });
});

describe("paymentKind", () => {
  it.each([
    ["cash", "cash"], ["Наличные", "cash"], ["Безналичные", "card"],
    ["bank_transfer", "card"], ["debt", "debt"], ["В долг", "debt"],
    ["mixed", "mixed"], ["Смешанная", "mixed"], ["x", "other"],
  ])("%s → %s", (raw, kind) => expect(paymentKind(raw)).toBe(kind));
});

describe("deltaPercent", () => {
  it("считает рост и падение, без базы — null", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(50, 100)).toBe(-50);
    expect(deltaPercent(10, 0)).toBeNull();
  });
});

describe("parseRecentSales", () => {
  it("определяет статус чека", () => {
    const r = parseRecentSales({
      results: [
        { id: 1, status: "paid", total: "10", payment_method: "cash" },
        { id: 2, status: "paid", total: "20", payment_method: "debt" },
        { id: 3, status: "canceled", total: "5" },
      ],
    });
    expect(r.map((x) => x.kind)).toEqual(["paid", "debt", "return"]);
  });
});

describe("pickLowStock", () => {
  it("6 товаров с остатком ≤ 5, услуги не входят", () => {
    const items = [
      ...Array.from({ length: 8 }, (_, i) => ({ qty: i, isService: false })),
      { qty: 0, isService: true },
      { qty: 100, isService: false },
    ];
    const low = pickLowStock(items);
    expect(low).toHaveLength(6);
    expect(low.every((p) => !p.isService && p.qty <= 5)).toBe(true);
    expect(low.map((p) => p.qty)).toEqual([0, 1, 2, 3, 4, 5].sort((a, b) => a - b));
  });
});
