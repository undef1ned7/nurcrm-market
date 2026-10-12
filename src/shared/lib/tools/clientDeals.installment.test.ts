import { describe, expect, it } from "vitest";
import {
  getInstallmentPromise,
  getInstallmentStatus,
  todayISO,
} from "./clientDeals";

const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("getInstallmentStatus", () => {
  it("частично оплаченный просроченный взнос остаётся просроченным", () => {
    const s = getInstallmentStatus({
      amount: "1000",
      paid_amount: "500",
      due_date: shift(-4),
    });
    expect(s.key).toBe("partial");
    expect(s.isOverdue).toBe(true);
    expect(s.daysOverdue).toBe(4);
  });

  it("частично оплаченный в срок — не просрочен", () => {
    const s = getInstallmentStatus({
      amount: "1000",
      paid_amount: "500",
      due_date: todayISO(),
    });
    expect(s.key).toBe("partial");
    expect(s.isOverdue).toBe(false);
  });

  it("полностью оплаченный не просрочен", () => {
    const s = getInstallmentStatus({
      amount: "1000",
      paid_amount: "1000",
      paid_on: shift(-1),
      due_date: shift(-4),
    });
    expect(s.key).toBe("paid");
    expect(s.isOverdue).toBe(false);
  });
});

describe("getInstallmentPromise", () => {
  it("нет обещания / взнос закрыт", () => {
    expect(getInstallmentPromise({})).toBeNull();
    expect(
      getInstallmentPromise({ promised_date: shift(1), paid_on: shift(0) }),
    ).toBeNull();
  });
  it("прошедшее обещание помечается broken", () => {
    expect(getInstallmentPromise({ promised_date: shift(-1) })?.broken).toBe(true);
    expect(getInstallmentPromise({ promised_date: shift(2) })?.broken).toBe(false);
  });
});
