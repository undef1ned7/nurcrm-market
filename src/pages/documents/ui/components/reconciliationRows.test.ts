import { describe, expect, it } from "vitest";
import { buildReconciliation } from "./reconciliationRows";

const sale = (amount: number, date = "2026-10-02T10:00:00Z") => ({
  date,
  ref_type: "sale",
  title: "Продажа a2a414fb...ffcd",
  a_debit: amount,
  b_credit: amount,
});
const deal = (amount: number, date = "2026-10-02T10:00:05Z") => ({
  date,
  ref_type: "deal",
  title: "Сделка: Долг Гулумкан Исакова (Долг)",
  a_debit: amount,
  b_credit: amount,
});
const pay = (amount: number, n: number) => ({
  date: "2026-10-02T11:00:00Z",
  ref_type: "installment_payment",
  title: `Оплата №${n}`,
  a_credit: amount,
  b_debit: amount,
});
const sixPayments = () => [1, 2, 3, 4, 5, 6].map((n) => pay(2500, n));

describe("buildReconciliation", () => {
  it("не удваивает долг: продажа 15000 + сделка-долг 15000 + 6×2500 → сальдо 0", () => {
    const r = buildReconciliation({
      rows: [sale(15000), deal(15000), ...sixPayments()],
    });
    expect(r.excludedDuplicates).toBe(1);
    expect(r.totals.companyDebit).toBe(15000);
    expect(r.totals.companyCredit).toBe(15000);
    expect(r.closingCompany).toBe(0);
    expect(r.lines[1].reference).toBe(true);
  });

  it("продажа без оплаты → долг 10000", () => {
    const r = buildReconciliation({ rows: [sale(10000), deal(10000)] });
    expect(r.closingCompany).toBe(10000);
  });

  it("частичная оплата → 4000", () => {
    const r = buildReconciliation({
      rows: [sale(10000), deal(10000), pay(6000, 1)],
    });
    expect(r.closingCompany).toBe(4000);
  });

  it("сделка без парной продажи считается как обычное начисление", () => {
    const r = buildReconciliation({ rows: [deal(15000)] });
    expect(r.excludedDuplicates).toBe(0);
    expect(r.closingCompany).toBe(15000);
  });

  it("не парует сделку с продажей на другую сумму или далёкую по дате", () => {
    expect(
      buildReconciliation({ rows: [sale(10000), deal(15000)] }).excludedDuplicates,
    ).toBe(0);
    expect(
      buildReconciliation({
        rows: [sale(15000, "2026-09-01T10:00:00Z"), deal(15000)],
      }).excludedDuplicates,
    ).toBe(0);
  });

  it("каждая продажа гасит максимум одну сделку", () => {
    const r = buildReconciliation({
      rows: [sale(15000), deal(15000), deal(15000)],
    });
    expect(r.excludedDuplicates).toBe(1);
    expect(r.closingCompany).toBe(30000);
  });

  it("две одинаковые продажи с двумя сделками → обе сделки справочные", () => {
    const r = buildReconciliation({
      rows: [sale(5000), deal(5000), sale(5000), deal(5000)],
    });
    expect(r.excludedDuplicates).toBe(2);
    expect(r.closingCompany).toBe(10000);
  });

  it("доверяет явному флагу бэка affects_balance=false", () => {
    const r = buildReconciliation({
      rows: [sale(15000), { ...deal(15000), affects_balance: false }],
    });
    expect(r.lines[1].reference).toBe(true);
    expect(r.excludedDuplicates).toBe(0);
    expect(r.closingCompany).toBe(15000);
  });

  it("учитывает начальное сальдо", () => {
    const r = buildReconciliation({
      opening_balance: 1000,
      rows: [sale(15000)],
    });
    expect(r.closingCompany).toBe(16000);
  });
});
