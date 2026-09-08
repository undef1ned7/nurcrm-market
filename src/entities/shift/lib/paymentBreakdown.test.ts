import { describe, expect, it } from "vitest";
import {
  aggregateSalesPaymentBreakdown,
  formatPaymentBreakdownMessage,
  parseApiPaymentBreakdown,
  resolveShiftPaymentBreakdown,
  timesLabel,
} from "./paymentBreakdown";

describe("timesLabel", () => {
  it("uses Russian plural forms", () => {
    expect(timesLabel(1)).toBe("1 раз");
    expect(timesLabel(2)).toBe("2 раза");
    expect(timesLabel(4)).toBe("4 раза");
    expect(timesLabel(5)).toBe("5 раз");
    expect(timesLabel(11)).toBe("11 раз");
    expect(timesLabel(21)).toBe("21 раз");
    expect(timesLabel(22)).toBe("22 раза");
  });
});

describe("aggregateSalesPaymentBreakdown", () => {
  it("counts cash, bank and debt receipts separately", () => {
    const rows = aggregateSalesPaymentBreakdown([
      { status: "paid", payment_method: "cash", total: "100" },
      { status: "paid", payment_method: "cash", total: "50" },
      { status: "paid", payment_method: "mbank", total: "200" },
      { status: "unpaid", payment_method: "debt", total: "80" },
    ]);

    expect(rows).toEqual([
      { method: "mbank", label: "МБанк", count: 1, amount: 200 },
      { method: "cash", label: "Наличные", count: 2, amount: 150 },
      { method: "debt", label: "Отсрочка", count: 1, amount: 80 },
    ]);
  });

  it("counts mixed payments as split once", () => {
    const rows = aggregateSalesPaymentBreakdown([
      {
        status: "paid",
        payment_method: "cash",
        total: "300",
        payments: [
          { method: "mbank", amount: "200" },
          { method: "cash", amount: "100" },
        ],
      },
    ]);

    expect(rows).toEqual([
      { method: "split", label: "Смешанная", count: 1, amount: 300 },
    ]);
  });

  it("skips cancelled and returned sales", () => {
    const rows = aggregateSalesPaymentBreakdown([
      { status: "paid", payment_method: "cash", total: "10" },
      { status: "canceled", payment_method: "cash", total: "999" },
      { status: "returned", payment_method: "mbank", total: "50" },
    ]);

    expect(rows).toEqual([
      { method: "cash", label: "Наличные", count: 1, amount: 10 },
    ]);
  });
});

describe("resolveShiftPaymentBreakdown", () => {
  it("prefers API payment_breakdown over sales fallback", () => {
    const rows = resolveShiftPaymentBreakdown(
      {
        payment_breakdown: [
          { method: "cash", count: 3, amount: "120.5", label: "Наличные" },
        ],
      },
      [{ status: "paid", payment_method: "mbank", total: "9" }],
    );

    expect(rows).toEqual([
      { method: "cash", label: "Наличные", count: 3, amount: 120.5 },
    ]);
  });

  it("falls back to sales when API field is missing", () => {
    const rows = resolveShiftPaymentBreakdown(
      {},
      [{ status: "paid", payment_method: "optima", total: "15" }],
    );
    expect(rows[0]).toMatchObject({ method: "optima", count: 1, amount: 15 });
  });

  it("parses empty API list as empty array", () => {
    expect(parseApiPaymentBreakdown([])).toEqual([]);
  });

  it("returns empty array when shift has empty payment_breakdown", () => {
    expect(resolveShiftPaymentBreakdown({ payment_breakdown: [] }, [])).toEqual(
      [],
    );
  });

  it("formats a human summary", () => {
    const message = formatPaymentBreakdownMessage([
      { method: "cash", label: "Наличные", count: 2, amount: 150 },
    ]);
    expect(message).toContain("Наличные — 2 раза");
    expect(message).toContain("сом");
  });
});
