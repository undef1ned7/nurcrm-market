import { describe, expect, it } from "vitest";
import {
  buildCheckoutConsultantPayload,
  consultantCommissionLabel,
  consultantDisplayFromSale,
  employeeDisplayName,
  EMPTY_CONSULTANT_DRAFT,
  isValidCommissionPercent,
  parseCommissionPercent,
  pickDefaultSalesPercent,
  previewCommissionAmount,
  receiptConsultantName,
  validateConsultantDraft,
} from "./saleConsultant";

describe("saleConsultant", () => {
  it("parses percent and previews commission from total after discount", () => {
    expect(parseCommissionPercent("5,5")).toBe(5.5);
    expect(isValidCommissionPercent(101)).toBe(false);
    expect(previewCommissionAmount(2500, 5)).toBe(125);
    expect(previewCommissionAmount(2000, 5)).toBe(100);
  });

  it("does not send consultant fields when specify is off", () => {
    expect(buildCheckoutConsultantPayload(EMPTY_CONSULTANT_DRAFT)).toEqual({});
    expect(
      buildCheckoutConsultantPayload({
        ...EMPTY_CONSULTANT_DRAFT,
        specify: true,
        consultantId: "",
      }),
    ).toEqual({});
  });

  it("sends zero percent when commission is disabled", () => {
    expect(
      buildCheckoutConsultantPayload({
        specify: true,
        consultantId: "u-1",
        consultantName: "Иван",
        commissionEnabled: false,
        percent: "7.5",
      }),
    ).toEqual({
      consultant_id: "u-1",
      consultant_commission_enabled: false,
      consultant_commission_percent: "0.00",
    });
  });

  it("validates required consultant and percent", () => {
    expect(
      validateConsultantDraft({
        ...EMPTY_CONSULTANT_DRAFT,
        specify: true,
      }),
    ).toBe("Выберите консультанта");
    expect(
      validateConsultantDraft({
        specify: true,
        consultantId: "u-1",
        consultantName: "Иван",
        commissionEnabled: true,
        percent: "",
      }),
    ).toBe("Укажите процент комиссии");
    expect(
      validateConsultantDraft({
        specify: true,
        consultantId: "u-1",
        consultantName: "Иван",
        commissionEnabled: true,
        percent: "101",
      }),
    ).toBe("Процент должен быть от 0 до 100");
    expect(
      validateConsultantDraft({
        specify: true,
        consultantId: "u-1",
        consultantName: "Иван",
        commissionEnabled: false,
        percent: "",
      }),
    ).toBeNull();
  });

  it("prefers branch pay profile for default percent", () => {
    const profiles = [
      { pay_scheme: "salary", sales_percent: "10", branch: null },
      { pay_scheme: "salary_plus_percent", sales_percent: "3", branch: null },
      { pay_scheme: "percent", sales_percent: "8", branch: "b-2" },
    ];
    expect(pickDefaultSalesPercent(profiles, "b-2")).toBe("8");
    expect(pickDefaultSalesPercent(profiles, "b-9")).toBe("3");
    expect(pickDefaultSalesPercent(profiles)).toBe("3");
  });

  it("reads consultant display without commission on receipts", () => {
    expect(
      consultantDisplayFromSale({
        consultant: "uuid",
        consultant_display: "Конс Ультант",
      }),
    ).toBe("Конс Ультант");
    expect(
      consultantCommissionLabel({
        consultant_display: "Конс",
        consultant_commission_amount: "0",
      }),
    ).toBe("—");
    expect(
      consultantCommissionLabel(
        {
          consultant_display: "Конс",
          consultant_commission_percent: "5",
          consultant_commission_amount: "125.00",
        },
        { showZero: true },
      ),
    ).toBe("5 % · 125,00 с");
    expect(
      receiptConsultantName({
        consultant: { id: "1", name: "Анна К." },
        consultant_commission_amount: "999",
      }),
    ).toBe("Анна К.");
    expect(employeeDisplayName({ last_name: "Иванов", first_name: "Иван" })).toBe(
      "Иванов Иван",
    );
  });
});
