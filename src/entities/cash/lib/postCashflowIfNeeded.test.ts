import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const cashflowPartialFailureMock = vi.fn();

vi.mock("@shared/lib/notifications", () => ({
  notify: {
    cashflowPartialFailure: (...args: unknown[]) => {
      cashflowPartialFailureMock(...args);
    },
  },
  getCashflowPartialFailureKey: (ctx: string) =>
    `notifications.cashflow.partialFailure.${ctx}`,
}));

const unwrap = vi.fn(async () => ({ id: "cf-1" }));
const addCashFlowsMock = vi.fn((_payload: unknown) => ({ unwrap }));

vi.mock("../model/cashSlice", () => ({
  addCashFlows: (payload: unknown) => addCashFlowsMock(payload),
}));

describe("postCashflowIfNeeded", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    addCashFlowsMock.mockClear();
    unwrap.mockClear();
    cashflowPartialFailureMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("no-ops when VITE_BE_CASHFLOWS=true", async () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "true");
    const { postCashflowIfNeeded } = await import("./postCashflowIfNeeded");
    const dispatch = vi.fn();

    const result = await postCashflowIfNeeded(dispatch, {
      type: "income",
      amount: "10.00",
      cashbox: "box-1",
    });

    expect(result).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
    expect(addCashFlowsMock).not.toHaveBeenCalled();
  });

  it("dispatches addCashFlows when flag is off", async () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "false");
    const { postCashflowIfNeeded } = await import("./postCashflowIfNeeded");
    const dispatch = vi.fn(() => ({ unwrap }));

    const payload = {
      type: "income" as const,
      amount: "10.00",
      cashbox: "box-1",
      name: "Продажа",
    };
    const result = await postCashflowIfNeeded(dispatch, payload);

    expect(addCashFlowsMock).toHaveBeenCalledWith(payload);
    expect(dispatch).toHaveBeenCalled();
    expect(unwrap).toHaveBeenCalled();
    expect(result).toEqual({ id: "cf-1" });
  });

  it("skips legacy POST when cashbox is not explicit", async () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "false");
    const { postCashflowIfNeeded } = await import("./postCashflowIfNeeded");
    const dispatch = vi.fn();

    const result = await postCashflowIfNeeded(dispatch, {
      type: "income",
      amount: "10.00",
    });

    expect(result).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
    expect(addCashFlowsMock).not.toHaveBeenCalled();
  });

  it("warns and does not throw when warnOnFailure is set", async () => {
    vi.stubEnv("VITE_BE_CASHFLOWS", "false");
    const unwrapFail = vi.fn(async () => {
      throw new Error("cashflow failed");
    });
    const { postCashflowIfNeeded } = await import("./postCashflowIfNeeded");
    const dispatch = vi.fn(() => ({ unwrap: unwrapFail }));

    const result = await postCashflowIfNeeded(
      dispatch,
      { type: "income", amount: "10.00", cashbox: "box-1" },
      { warnOnFailure: true, failureContext: "sale" },
    );

    expect(result).toBeUndefined();
    expect(cashflowPartialFailureMock).toHaveBeenCalled();
  });
});
