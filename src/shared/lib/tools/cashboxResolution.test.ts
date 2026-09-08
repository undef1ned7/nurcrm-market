import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CASHBOX_ROLE,
  buildCashRoutingPayload,
  buildExpenseVariableRouting,
  buildPosRoutingFromUser,
  calcShiftDrawerExpected,
  estimateShiftWarehouseDrain,
  hasExplicitCashbox,
  resolveBranchId,
  resolvePosCashboxRole,
  shouldFrontendSendCashboxId,
} from "./cashboxResolution";

describe("cashboxResolution", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolveBranchId prefers profile.active_branch", () => {
    expect(
      resolveBranchId({ active_branch: "br-1" }, { active_branch: "br-2" }),
    ).toBe("br-1");
  });

  it("resolvePosCashboxRole uses pos_branch when branch exists", () => {
    expect(resolvePosCashboxRole({ active_branch: "br-1" }, null)).toBe(
      CASHBOX_ROLE.POS_BRANCH,
    );
    expect(resolvePosCashboxRole(null, null)).toBe(CASHBOX_ROLE.POS_MAIN);
  });

  it("buildCashRoutingPayload omits empty fields", () => {
    expect(buildCashRoutingPayload({})).toEqual({});
    expect(
      buildCashRoutingPayload({
        branch_id: "br-1",
        cashbox_role: CASHBOX_ROLE.EXPENSE_VARIABLE,
        shift_id: "shift-1",
      }),
    ).toEqual({
      branch_id: "br-1",
      cashbox_role: "expense_variable",
      shift_id: "shift-1",
    });
  });

  it("buildPosRoutingFromUser includes shift_id", () => {
    expect(buildPosRoutingFromUser({ active_branch: 42 }, null, "s-1")).toEqual({
      branch_id: "42",
      cashbox_role: "pos_branch",
      shift_id: "s-1",
    });
  });

  it("buildExpenseVariableRouting sets expense_variable role", () => {
    expect(buildExpenseVariableRouting()).toEqual({
      cashbox_role: "expense_variable",
    });
  });

  it("hasExplicitCashbox rejects empty values", () => {
    expect(hasExplicitCashbox("")).toBe(false);
    expect(hasExplicitCashbox(null)).toBe(false);
    expect(hasExplicitCashbox("box-1")).toBe(true);
  });

  it("calcShiftDrawerExpected sums opening and cash sales", () => {
    expect(calcShiftDrawerExpected(50, 33768)).toBe(33818);
  });

  it("calcShiftDrawerExpected subtracts drawer outflows", () => {
    expect(calcShiftDrawerExpected(5000, 10000, 2000)).toBe(13000);
  });

  it("estimateShiftWarehouseDrain detects procurement in shift ledger", () => {
    expect(estimateShiftWarehouseDrain(50, 33768, -20806)).toBeCloseTo(54624, 0);
  });
});
