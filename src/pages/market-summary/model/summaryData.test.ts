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
    const s = parseSummarySales({ cards: { revenue: 5 }, charts: { sales_dynamics: [{ date: "2026-10-01", value: 5 }], payment_methods: [{ method: "transfer", total: 5 }] } });
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

/* ---------- регрессии стресс-теста «Сводки» (06.10.2026) ---------- */
import { bucketFor, groupDays, parseDay } from "./summaryData";

describe("стресс-тест: мусор в ответе", () => {
  it("null внутри массивов не роняет разбор", () => {
    const s = parseSummarySales({
      cards: { revenue: 10 },
      charts: { sales_dynamics: [null, { date: "2026-10-06", revenue: 10 }], payment_methods: [null, { method: "cash", total: 10 }] },
      tables: { top_products: [null, { name: "Хлеб", sold: 1, revenue: 10 }] },
    });
    expect(s.days).toHaveLength(1);
    expect(s.payments).toHaveLength(1);
    expect(s.topProducts).toHaveLength(1);
    expect(parseRecentSales({ results: [null, { id: 1, status: "paid", total: 5 }] })).toHaveLength(1);
  });

  it("день без понятной даты не попадает на график (было «NaN.NaN»)", () => {
    const s = parseSummarySales({ charts: { sales_dynamics: [{ date: "garbage", revenue: 1 }, { revenue: 2 }, { date: "2026-10-06", revenue: 3 }] } });
    expect(s.days.map((d) => d.revenue)).toEqual([3]);
  });

  it("неверное время продажи → null (было «Invalid Date»)", () => {
    expect(parseRecentSales({ results: [{ id: 1, total: 1, paid_at: "not a date" }] })[0].at).toBeNull();
  });

  it("«YYYY-MM-DD» — местный день, а не UTC", () => {
    expect(parseDay("2026-10-06")!.getDate()).toBe(6);
  });

  it("только количество без суммы — не деньги", () => {
    expect(parseSummarySales({ charts: { payment_methods: [{ method: "cash", count: 7 }] } }).payments).toEqual([]);
  });
});

describe("стресс-тест: способы оплаты", () => {
  it.each([
    ["cashless", "card"], ["noncash", "card"], ["Карта", "card"], ["Перевод", "card"],
    ["Элсом", "card"], ["О!Деньги", "card"], ["Мбанк", "card"], ["credit_card", "card"],
  ])("%s → %s", (raw, kind) => expect(paymentKind(raw)).toBe(kind));

  it("mixed + уже разложенные cash/card — смешанная помечается «в том числе»", () => {
    const s = parseSummarySales({
      cards: { revenue: 1000 },
      charts: { payment_methods: [{ method: "mixed", total: 1000 }, { method: "cash", total: 600 }, { method: "card", total: 400 }] },
    });
    expect(s.mixedIncluded).toBe(true);
  });

  it("mixed отдельно (без раскладки) — обычная строка", () => {
    const s = parseSummarySales({
      cards: { revenue: 1000 },
      charts: { payment_methods: [{ method: "mixed", total: 300 }, { method: "cash", total: 700 }] },
    });
    expect(s.mixedIncluded).toBe(false);
  });
});

describe("стресс-тест: последние продажи и график", () => {
  it("открытые корзины («Новый») не показываются, повтор id не ломает ключи", () => {
    const r = parseRecentSales({ results: [{ id: 1, status: "new", total: 1 }, { id: 2, status: "paid" }, { id: 2, status: "paid" }] });
    expect(r.map((x) => x.kind)).toEqual(["paid", "paid"]);
    expect(new Set(r.map((x) => x.id)).size).toBe(2);
  });

  it("длинные периоды группируются: 10 лет — по месяцам", () => {
    const from = new Date(2016, 0, 1);
    const to = new Date(2026, 0, 1);
    expect(bucketFor(from, to)).toBe("month");
    expect(bucketFor(new Date(2026, 0, 1), new Date(2026, 6, 1))).toBe("week");
    expect(bucketFor(new Date(2026, 9, 1), new Date(2026, 9, 6))).toBe("day");
    const days = Array.from({ length: 3650 }, (_, i) => {
      const d = new Date(2016, 0, 1 + i);
      const p = (n: number) => String(n).padStart(2, "0");
      return { date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, revenue: 1 };
    });
    const pts = groupDays(days, "month");
    expect(pts.length).toBeLessThanOrEqual(121);
    expect(pts.reduce((s, p) => s + p.revenue, 0)).toBe(3650);
  });
});
