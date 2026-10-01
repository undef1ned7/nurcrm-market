import { describe, expect, it } from "vitest";
import { describeBranchUsage } from "./branchUsage";

describe("describeBranchUsage", () => {
  it("перечисляет только ненулевые привязки", () => {
    expect(
      describeBranchUsage({ openShifts: 0, products: 3, employees: null, transfers: 2 }),
    ).toBe("товаров: 3, перемещений: 2");
  });
  it("пусто, если ничего не привязано или неизвестно", () => {
    expect(
      describeBranchUsage({ openShifts: null, products: 0, employees: null, transfers: null }),
    ).toBe("");
  });
});
