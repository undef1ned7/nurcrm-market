import { describe, expect, it, beforeEach } from "vitest";
import {
  applyBranchScope,
  clearBranchScopeHolders,
  holdBranchScope,
  releaseBranchScope,
  clearBranchScope,
  getProfileBranchId,
  isBranchBoundProfile,
  syncBranchScopeFromProfile,
} from "./branchContext";

type Cfg = { method?: string; url?: string; params?: any };
const run = (c: Cfg) => applyBranchScope<Cfg>(c);

const branchAdmin = {
  role: "admin",
  branch_ids: ["b1"],
  primary_branch_id: "b1",
};

describe("branchContext", () => {
  beforeEach(() => {
    clearBranchScope();
    clearBranchScopeHolders();
  });

  it("читает primary_branch_id из профиля бэка", () => {
    expect(getProfileBranchId(branchAdmin)).toBe("b1");
  });

  it("админ филиала закреплён, владелец и админ без филиалов — нет", () => {
    expect(isBranchBoundProfile(branchAdmin)).toBe(true);
    expect(isBranchBoundProfile({ role: "owner", branch_ids: ["b1"] })).toBe(false);
    expect(isBranchBoundProfile({ role: "admin", branch_ids: [] })).toBe(false);
  });

  it("подставляет branch в GET списков", () => {
    syncBranchScopeFromProfile(branchAdmin);
    const cfg = run({ method: "get", url: "main/products/list/", params: { page: 1 } });
    expect(cfg.params).toEqual({ page: 1, branch: "b1" });
  });

  it("не трогает явный branch, POST, профиль и филиалы", () => {
    syncBranchScopeFromProfile(branchAdmin);
    expect(run({ method: "get", url: "x/", params: { branch: "z" } }).params.branch).toBe("z");
    expect(run({ method: "get", url: "x/?branch=z" }).params).toBeUndefined();
    expect(run({ method: "post", url: "x/" }).params).toBeUndefined();
    expect(run({ method: "get", url: "/users/profile/" }).params).toBeUndefined();
    expect(run({ method: "get", url: "/users/branches/" }).params).toBeUndefined();
  });

  it("без закреплённого филиала ничего не добавляет", () => {
    syncBranchScopeFromProfile({ role: "owner" });
    expect(run({ method: "get", url: "x/" }).params).toBeUndefined();
  });

  it("override карточки филиала работает и для владельца", () => {
    syncBranchScopeFromProfile({ role: "owner" });
    holdBranchScope("a", "b9");
    expect(run({ method: "get", url: "x/" }).params).toEqual({ branch: "b9" });
    syncBranchScopeFromProfile(branchAdmin);
    expect(run({ method: "get", url: "x/" }).params).toEqual({ branch: "b9" });
  });

  it("очистка старой страницы не затирает филиал новой", async () => {
    const oldToken = holdBranchScope("analytics", "b1");
    holdBranchScope("shifts", "b1"); // новая вкладка захватила в render
    releaseBranchScope("analytics", oldToken); // очистка старой — позже
    await new Promise((r) => setTimeout(r, 5));
    expect(run({ method: "get", url: "x/" }).params).toEqual({ branch: "b1" });
  });

  it("повторный захват того же ключа (StrictMode) сохраняется", async () => {
    const t1 = holdBranchScope("k", "b1");
    releaseBranchScope("k", t1);
    holdBranchScope("k", "b1");
    await new Promise((r) => setTimeout(r, 5));
    expect(run({ method: "get", url: "x/" }).params).toEqual({ branch: "b1" });
  });
});
