import { describe, expect, it } from "vitest";
import {
  formatPeriodForApi,
  previousPeriod,
  resolvePeriod,
  toDateInputValue,
} from "./period";

const NOW = new Date(2026, 9, 15, 14, 30); // 15.10.2026

describe("resolvePeriod", () => {
  it("сегодня — с 00:00 до 23:59:59", () => {
    const p = resolvePeriod("today", null, NOW);
    expect(formatPeriodForApi(p.from)).toBe("2026-10-15T00:00:00");
    expect(formatPeriodForApi(p.to)).toBe("2026-10-15T23:59:59");
  });

  it("неделя — 7 дней, включая сегодня", () => {
    const p = resolvePeriod("week", null, NOW);
    expect(toDateInputValue(p.from)).toBe("2026-10-09");
  });

  it("месяц — с 1-го числа", () => {
    expect(toDateInputValue(resolvePeriod("month", null, NOW).from)).toBe("2026-10-01");
  });

  it("квартал — три календарных месяца", () => {
    expect(toDateInputValue(resolvePeriod("quarter", null, NOW).from)).toBe("2026-08-01");
  });

  it("свои даты: перепутанный порядок исправляется", () => {
    const p = resolvePeriod("custom", { from: new Date(2026, 9, 10), to: new Date(2026, 9, 5) }, NOW);
    expect(toDateInputValue(p.from)).toBe("2026-10-05");
    expect(toDateInputValue(p.to)).toBe("2026-10-10");
  });
});

describe("previousPeriod", () => {
  it("сегодня → вчера", () => {
    const cur = resolvePeriod("today", null, NOW);
    const prev = previousPeriod("today", cur);
    expect(toDateInputValue(prev.from)).toBe("2026-10-14");
    expect(toDateInputValue(prev.to)).toBe("2026-10-14");
  });

  it("неделя → предыдущие 7 дней", () => {
    const cur = resolvePeriod("week", null, NOW);
    const prev = previousPeriod("week", cur);
    expect(toDateInputValue(prev.from)).toBe("2026-10-02");
    expect(toDateInputValue(prev.to)).toBe("2026-10-08");
  });

  it("месяц → тот же отрезок дней прошлого месяца", () => {
    const cur = resolvePeriod("month", null, NOW);
    const prev = previousPeriod("month", cur);
    expect(toDateInputValue(prev.from)).toBe("2026-09-01");
    expect(toDateInputValue(prev.to)).toBe("2026-09-15");
  });

  it("31 число не выходит за конец короткого прошлого месяца", () => {
    const cur = resolvePeriod("month", null, new Date(2026, 9, 31));
    const prev = previousPeriod("month", cur);
    expect(toDateInputValue(prev.to)).toBe("2026-09-30");
  });
});

/* ---------- регрессии стресс-теста «Сводки» (06.10.2026) ---------- */
import { comparablePreviousPeriod, resolvePeriod as rp } from "./period";

describe("сравнение «на это же время»", () => {
  it("сегодня до 10:30 сравнивается со вчера до 10:30, а не со всем вчерашним днём", () => {
    const now = new Date(2026, 9, 6, 10, 30);
    const prev = comparablePreviousPeriod("today", rp("today", null, now), now);
    expect(prev.from).toEqual(new Date(2026, 9, 5));
    expect(prev.to.getDate()).toBe(5);
    expect([prev.to.getHours(), prev.to.getMinutes()]).toEqual([10, 30]);
  });

  it("свой период целиком в прошлом — сравнение с полными днями", () => {
    const now = new Date(2026, 9, 6, 10, 30);
    const cur = rp("custom", { from: new Date(2026, 8, 1), to: new Date(2026, 8, 10) }, now);
    expect(comparablePreviousPeriod("custom", cur, now).to.getHours()).toBe(23);
  });

  it("прошлый квартал не перекрывает текущий (был лишний день)", () => {
    const now = new Date(2024, 4, 31, 12);
    const cur = rp("quarter", null, now);
    const prev = previousPeriod("quarter", cur);
    expect(prev.to.getTime()).toBeLessThan(cur.from.getTime());
  });
});
