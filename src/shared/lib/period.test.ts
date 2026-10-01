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
