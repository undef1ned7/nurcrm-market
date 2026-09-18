import { describe, expect, it } from "vitest";
import {
  cashboxDeleteErrorCode,
  cashboxDeleteErrorMessage,
  isConsumptionCashbox,
  isPosMainCashbox,
  hasActivePosMainCashbox,
  isDebtCashbox,
  hasActiveDebtCashbox,
  cashboxRoleLabel,
  buildCreateCashboxPayload,
  selectMergeCandidates,
  mergeRoleMismatchWarning,
} from "./cashboxMutations";

describe("isConsumptionCashbox", () => {
  it("true for expense roles", () => {
    expect(isConsumptionCashbox({ role: "expense_variable" })).toBe(true);
    expect(isConsumptionCashbox({ role: "expense_fixed" })).toBe(true);
    expect(isConsumptionCashbox({ inferred_role: "expense_variable" })).toBe(true);
  });

  it("false for POS roles even if name mentions expenses", () => {
    expect(
      isConsumptionCashbox({ role: "pos_main", name: "Касса расходов" }),
    ).toBe(false);
    expect(isConsumptionCashbox({ role: "pos_branch" })).toBe(false);
  });

  it("true for legacy is_consumption flag", () => {
    expect(isConsumptionCashbox({ is_consumption: true })).toBe(true);
    expect(isConsumptionCashbox({ is_consumption: false })).toBe(false);
  });

  it("falls back to name heuristic", () => {
    expect(isConsumptionCashbox({ name: "Переменные расходы" })).toBe(true);
    expect(isConsumptionCashbox({ department_name: "Касса для прочих расходов" })).toBe(
      true,
    );
    expect(isConsumptionCashbox({ name: "Основная касса компании" })).toBe(false);
  });

  it("false for non-objects", () => {
    expect(isConsumptionCashbox(null)).toBe(false);
    expect(isConsumptionCashbox("x")).toBe(false);
  });
});

describe("isPosMainCashbox / hasActivePosMainCashbox", () => {
  it("detects pos_main by role", () => {
    expect(isPosMainCashbox({ role: "pos_main" })).toBe(true);
    expect(isPosMainCashbox({ role: "pos_branch" })).toBe(false);
    expect(isPosMainCashbox({ role: "expense_variable" })).toBe(false);
    expect(isPosMainCashbox(null)).toBe(false);
  });

  it("reproduces the observed staging bug: 4 active pos_main on one company", () => {
    const rows = [
      { name: "карыз", role: "pos_main", is_active: true },
      { name: "Расход", role: "pos_main", is_active: true },
      { name: "Касса 2", role: "pos_main", is_active: true },
      { name: "Касса филиала номер 1", role: "pos_branch", is_active: true },
      { name: "Переменные расходы", role: "expense_variable", is_active: true },
      { name: "Постоянные расходы", role: "expense_fixed", is_active: true },
      { name: "Основная касса компании", role: "pos_main", is_active: true },
    ];
    expect(rows.filter(isPosMainCashbox)).toHaveLength(4);
    expect(hasActivePosMainCashbox(rows)).toBe(true);
  });

  it("ignores archived pos_main cashboxes", () => {
    expect(
      hasActivePosMainCashbox([{ role: "pos_main", is_active: false }]),
    ).toBe(false);
  });

  it("false for non-arrays", () => {
    expect(hasActivePosMainCashbox(null)).toBe(false);
    expect(hasActivePosMainCashbox(undefined)).toBe(false);
  });
});

describe("isDebtCashbox / hasActiveDebtCashbox", () => {
  it("detects by role, is_debt flag, or name heuristic", () => {
    expect(isDebtCashbox({ role: "debt" })).toBe(true);
    expect(isDebtCashbox({ is_debt: true })).toBe(true);
    expect(isDebtCashbox({ name: "карыз" })).toBe(true);
    expect(isDebtCashbox({ name: "Долги клиентов" })).toBe(true);
    expect(isDebtCashbox({ role: "pos_main", name: "Основная касса" })).toBe(false);
  });

  it("hasActiveDebtCashbox ignores archived rows", () => {
    expect(hasActiveDebtCashbox([{ role: "debt", is_active: true }])).toBe(true);
    expect(hasActiveDebtCashbox([{ role: "debt", is_active: false }])).toBe(false);
    expect(hasActiveDebtCashbox(null)).toBe(false);
  });
});

describe("cashboxRoleLabel", () => {
  it("returns a human label for known roles, null otherwise", () => {
    expect(cashboxRoleLabel({ role: "pos_main" })).toBe("Основная касса");
    expect(cashboxRoleLabel({ role: "debt" })).toBe("Для долгов");
    expect(cashboxRoleLabel({ role: "unknown_role" })).toBeNull();
    expect(cashboxRoleLabel({})).toBeNull();
  });
});

describe("buildCreateCashboxPayload", () => {
  it("plain: no explicit role, is_consumption=false", () => {
    expect(buildCreateCashboxPayload("Касса 3", "plain")).toEqual({
      name: "Касса 3",
      is_consumption: false,
    });
  });

  it("expense: is_consumption=true, no explicit role (legacy path)", () => {
    expect(buildCreateCashboxPayload("Прочие расходы", "expense")).toEqual({
      name: "Прочие расходы",
      is_consumption: true,
    });
  });

  it("debt: explicit role=debt", () => {
    expect(buildCreateCashboxPayload("Карыз", "debt")).toEqual({
      name: "Карыз",
      is_consumption: false,
      role: "debt",
    });
  });
});

describe("selectMergeCandidates / mergeRoleMismatchWarning", () => {
  const all = [
    { id: "1", role: "pos_main", is_active: true },
    { id: "2", role: "pos_main", is_active: true },
    { id: "3", role: "expense_variable", is_active: true },
    { id: "4", role: "pos_main", is_active: false },
  ];

  it("excludes sources and archived cashboxes", () => {
    const candidates = selectMergeCandidates([{ id: "1" }], all);
    expect(candidates.map((c: any) => c.id)).toEqual(["2", "3"]);
  });

  it("returns [] for non-array input", () => {
    expect(selectMergeCandidates([{ id: "1" }], null as any)).toEqual([]);
  });

  const translate = (_key: string, fallback: string) => fallback;

  it("warns on role mismatch, not on same role", () => {
    expect(
      mergeRoleMismatchWarning([{ role: "pos_main" }], { role: "expense_variable" }, translate),
    ).toMatch(/различаются/i);
    expect(
      mergeRoleMismatchWarning([{ role: "pos_main" }], { role: "pos_main" }, translate),
    ).toBeNull();
    expect(mergeRoleMismatchWarning([{ role: "pos_main" }], null, translate)).toBeNull();
  });
});

describe("cashboxDeleteErrorCode", () => {
  it("maps documented 409 codes", () => {
    expect(
      cashboxDeleteErrorCode({ response: { status: 409, data: { code: "cashbox_role_required" } } }),
    ).toBe("cashbox_role_required");
    expect(
      cashboxDeleteErrorCode({ response: { status: 409, data: { code: "cashbox_has_open_shift" } } }),
    ).toBe("cashbox_has_open_shift");
    expect(
      cashboxDeleteErrorCode({ response: { status: 409, data: { code: "merge_target_invalid" } } }),
    ).toBe("merge_target_invalid");
  });

  it("maps 404 / 405 / 501", () => {
    expect(cashboxDeleteErrorCode({ response: { status: 404 } })).toBe("cashbox_not_found");
    expect(cashboxDeleteErrorCode({ response: { status: 405 } })).toBe("not_available");
    expect(cashboxDeleteErrorCode({ response: { status: 501 } })).toBe("not_available");
  });

  it("unknown otherwise", () => {
    expect(cashboxDeleteErrorCode({ response: { status: 500 } })).toBe("unknown");
    expect(cashboxDeleteErrorCode(null)).toBe("unknown");
  });
});

describe("cashboxDeleteErrorMessage", () => {
  const translate = (_key: string, fallback: string) => fallback;

  it("returns the fallback text for each code", () => {
    expect(
      cashboxDeleteErrorMessage(
        { response: { status: 409, data: { code: "cashbox_has_pending" } } },
        translate,
      ),
    ).toMatch(/неодобренные операции/i);
    expect(
      cashboxDeleteErrorMessage({ response: { status: 405 } }, translate),
    ).toMatch(/недоступно на сервере/i);
  });

  it("surfaces the server detail text for unmapped codes instead of a generic fallback", () => {
    expect(
      cashboxDeleteErrorMessage(
        {
          response: {
            status: 400,
            data: { code: "some_new_backend_code", detail: "Совсем другая причина отказа" },
          },
        },
        translate,
      ),
    ).toBe("Совсем другая причина отказа");
  });

  it("falls back to the generic message when there is truly no detail", () => {
    expect(
      cashboxDeleteErrorMessage({ response: { status: 500 } }, translate),
    ).toMatch(/не удалось удалить кассу/i);
  });
});
