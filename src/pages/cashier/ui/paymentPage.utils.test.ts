import { describe, expect, it, vi } from "vitest";

vi.mock("@pages/sell/ui/services/printService", () => ({
  handleCheckoutResponseForPrinting: vi.fn(),
  ensurePrinterConnectedInteractively: vi.fn(),
  isPrintFormatError: vi.fn(),
}));

import { getPaymentAmounts, resolvePrepaymentApiMethod } from "./paymentPage.utils";

describe("resolvePrepaymentApiMethod", () => {
  it("наличная предоплата → cash, банк игнорируется", () => {
    expect(resolvePrepaymentApiMethod("cash", "mbank")).toBe("cash");
  });

  it("безнал с поддерживаемым банком → id банка", () => {
    expect(resolvePrepaymentApiMethod("cashless", "mbank")).toBe("mbank");
    expect(resolvePrepaymentApiMethod("cashless", "bakai")).toBe("bakai");
  });

  it("безнал с банком вне checkout-списка или без банка → transfer", () => {
    expect(resolvePrepaymentApiMethod("cashless", "demir")).toBe("transfer");
    expect(resolvePrepaymentApiMethod("cashless", "")).toBe("transfer");
  });
});

describe("getPaymentAmounts — долг с предоплатой", () => {
  const base = {
    paymentMethod: "deferred",
    total: 10000,
    deferredPrepaymentValue: 2000,
    deferredSaleDebtRemaining: 8000,
  };

  it("предоплата наличными идёт в cash", () => {
    expect(
      getPaymentAmounts({ ...base, deferredPrepaymentMethod: "cash" }),
    ).toEqual({ cash: 2000, cashless: 0, deferred: 8000 });
  });

  it("предоплата переводом идёт в cashless", () => {
    expect(
      getPaymentAmounts({ ...base, deferredPrepaymentMethod: "cashless" }),
    ).toEqual({ cash: 0, cashless: 2000, deferred: 8000 });
  });

  it("без способа — как раньше, наличные", () => {
    expect(getPaymentAmounts(base)).toEqual({
      cash: 2000,
      cashless: 0,
      deferred: 8000,
    });
  });
});
 