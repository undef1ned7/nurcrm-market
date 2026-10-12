import { describe, expect, it } from "vitest";
import {
  analyzePrice,
  calcBatchCost,
  calcDiscountEffect,
  calcRevenueForProfit,
  checkCatalogPrices,
  filterPriceRows,
  priceFromMargin,
  priceFromMarkup,
  roundPriceUp,
} from "./pricing";

describe("цена и наценка", () => {
  it("закупка 35, наценка 30% → цена 45,50 и маржа ≈ 23%", () => {
    const price = priceFromMarkup(35, 30)!;
    expect(price).toBeCloseTo(45.5);
    expect(analyzePrice(35, price).margin).toBeCloseTo(23.08, 1);
  });

  it("наценка 100% — это маржа 50%", () => {
    const price = priceFromMarkup(10, 100)!;
    expect(analyzePrice(10, price).margin).toBeCloseTo(50);
  });

  it("цена от маржи с налогом: закупка / (1 − маржа − налог)", () => {
    expect(priceFromMargin(60, 30, 10)).toBeCloseTo(100);
    expect(priceFromMargin(60, 100, 0)).toBeNull();
    expect(priceFromMargin(60, 95, 5)).toBeNull();
  });

  it("маржа после налога совпадает с заданной в режиме «От маржи»", () => {
    const price = priceFromMargin(80, 25, 1)!;
    expect(analyzePrice(80, price, 1).netMargin).toBeCloseTo(25, 6);
    expect(analyzePrice(80, price, 0).netMargin).toBeCloseTo(analyzePrice(80, price, 0).margin!, 6);
  });

  it("цена ниже закупки с налогом — убыток", () => {
    expect(analyzePrice(100, 100, 1).isLoss).toBe(true);
    expect(analyzePrice(100, 120, 1).isLoss).toBe(false);
  });

  it("округляет вверх до шага", () => {
    expect(roundPriceUp(45.5, 0)).toBe(45.5);
    expect(roundPriceUp(45.5, 1)).toBe(46);
    expect(roundPriceUp(46, 5)).toBe(50);
    expect(roundPriceUp(50, 5)).toBe(50);
    expect(roundPriceUp(41, 10)).toBe(50);
  });
});

describe("себестоимость партии", () => {
  const lines = [
    { qty: 10, price: 100, weight: 5 },
    { qty: 10, price: 300, weight: 15 },
  ];

  it("по сумме: дорогой товар несёт больше расходов", () => {
    const r = calcBatchCost(lines, 400, 1, "amount");
    expect(r.lines[0].expenseShare).toBeCloseTo(100);
    expect(r.lines[1].expenseShare).toBeCloseTo(300);
    expect(r.lines[0].unitCost).toBeCloseTo(110);
  });

  it("по количеству — поровну", () => {
    const r = calcBatchCost(lines, 400, 1, "qty");
    expect(r.lines[0].expenseShare).toBeCloseTo(200);
    expect(r.lines[1].expenseShare).toBeCloseTo(200);
  });

  it("по весу и курс валюты", () => {
    const r = calcBatchCost(lines, 400, 90, "weight");
    expect(r.lines[0].expenseShare).toBeCloseTo(100);
    expect(r.lines[0].lineSum).toBeCloseTo(90000);
  });

  it("по весу без веса у всех строк — расходы не распределяются", () => {
    const r = calcBatchCost([{ qty: 1, price: 10 }, { qty: 1, price: 10, weight: 2 }], 50, 1, "weight");
    expect(r.weightMissing).toBe(true);
    expect(r.lines[0].expenseShare).toBe(0);
  });

  it("строка с весом, но без количества не забирает расходы (стресс-тест)", () => {
    const r = calcBatchCost(
      [{ qty: 10, price: 50, weight: 5 }, { qty: 0, price: 25, weight: 10 }],
      300,
      1,
      "weight",
    );
    expect(r.lines[0].expenseShare).toBeCloseTo(300);
    expect(r.lines[0].unitCost).toBeCloseTo(80);
    expect(r.lines[1].expenseShare).toBe(0);
    expect(r.total).toBeCloseTo(800);
  });

  it("расходы не на что разложить — не входят в итог и помечены", () => {
    const r = calcBatchCost([{ qty: 0, price: 0 }], 300, 1, "amount");
    expect(r.extraUndistributed).toBe(true);
    expect(r.total).toBe(0);
  });

  it("предлагает цену с наценкой", () => {
    const r = calcBatchCost([{ qty: 10, price: 100 }], 0, 1, "amount", 20);
    expect(r.lines[0].suggestedPrice).toBeCloseTo(120);
  });
});

describe("безубыточность", () => {
  it("расходы / (маржа − налог)", () => {
    const r = calcRevenueForProfit(100000, 25, 5, 25, 500)!;
    expect(r.monthly).toBeCloseTo(500000);
    expect(r.perDay).toBeCloseTo(20000);
    expect(r.checksPerDay).toBeCloseTo(40);
  });

  it("с желаемой прибылью", () => {
    const r = calcRevenueForProfit(100000, 25, 5, 25, 500, 40000)!;
    expect(r.monthly).toBeCloseTo(700000);
  });

  it("маржа не больше налога — прибыль невозможна", () => {
    expect(calcRevenueForProfit(100000, 5, 5, 25, 500)).toBeNull();
    expect(calcRevenueForProfit(100000, 3, 5, 25, 500)).toBeNull();
  });
});

describe("скидка и акция", () => {
  it("маржа 30%, скидка 10% → в 1,5 раза больше", () => {
    const r = calcDiscountEffect(30, 10);
    expect(r.multiplier).toBeCloseTo(1.5);
    expect(r.isLoss).toBe(false);
    expect(r.marginAfter).toBeCloseTo(22.22, 1);
  });

  it("скидка съедает всю наценку — убыток", () => {
    expect(calcDiscountEffect(10, 10).isLoss).toBe(true);
    expect(calcDiscountEffect(10, 15).multiplier).toBeNull();
  });
});

describe("проверка цен", () => {
  const items = [
    { id: 1, name: "Убыток", cost: 100, price: 90, qty: 2 },
    { id: 2, name: "В ноль", cost: 50, price: 50, qty: 1 },
    { id: 3, name: "Низкая маржа", cost: 90, price: 100, qty: 10 },
    { id: 4, name: "Без закупки", cost: 0, price: 70, qty: 5 },
    { id: 5, name: "Минус", cost: 10, price: 20, qty: -3 },
    { id: 6, name: "Хорошо", cost: 50, price: 100, qty: 4 },
  ];
  const { rows, summary } = checkCatalogPrices(items, 15);
  const flags = (id: number) => rows.find((r) => r.id === id)!.flags;

  it("ставит метки внимания", () => {
    expect(flags(1)).toContain("loss");
    expect(flags(2)).toContain("noMarkup");
    expect(flags(3)).toContain("lowMargin");
    expect(flags(4)).toContain("noCost");
    expect(flags(5)).toContain("negativeStock");
    expect(flags(6)).toEqual([]);
  });

  it("прибыль и маржа склада — только по товарам с закупкой", () => {
    // 2×(−10) + 0 + 10×10 + 0 (минусовый остаток не считается) + 4×50 = 280
    expect(summary.futureProfit).toBeCloseTo(280);
    // цена товаров с закупкой: 2×90 + 50 + 1000 + 0 + 400 = 1630
    expect(summary.averageMargin).toBeCloseTo((280 / 1630) * 100);
    expect(summary.stockAtPrice).toBeCloseTo(180 + 50 + 1000 + 350 + 400);
  });

  it("фильтры и поиск", () => {
    expect(filterPriceRows(rows, "loss").map((r) => r.id)).toEqual([1, 2]);
    expect(filterPriceRows(rows, "noCost").map((r) => r.id)).toEqual([4]);
    expect(filterPriceRows(rows, "all", "хорош").map((r) => r.id)).toEqual([6]);
  });
});
