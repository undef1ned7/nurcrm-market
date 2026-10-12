import { describe, expect, it } from "vitest";
import {
  buildRentalPayload,
  isRentalOverdue,
  normalizeRental,
  rentalTiles,
  validateRentalDraft,
  type RentalDraft,
} from "./rentals";

const draft = (over: Partial<RentalDraft> = {}): RentalDraft => ({
  clientId: "c-1",
  items: [{ key: "r1", product: "p-1", variant: "v-1", name: "Платье — 44", qty: "1" }],
  dateFrom: "2026-10-06",
  dateTo: "2026-10-08",
  depositType: "document",
  depositAmount: "",
  depositMethod: "cash",
  depositDocument: "Паспорт ID AN123",
  note: "",
  ...over,
});

describe("validateRentalDraft", () => {
  it("валидная выдача с залогом-паспортом", () => {
    expect(validateRentalDraft(draft())).toBeNull();
  });

  it("ошибки по полям", () => {
    expect(validateRentalDraft(draft({ clientId: "" }))).toBe("client");
    expect(validateRentalDraft(draft({ items: [] }))).toBe("items");
    expect(validateRentalDraft(draft({ items: [{ key: "x", product: "p", name: "n", qty: "-1" }] }))).toBe("qty");
    expect(validateRentalDraft(draft({ dateTo: "2026-10-01" }))).toBe("dates");
    expect(validateRentalDraft(draft({ depositType: "money", depositAmount: "0" }))).toBe("depositAmount");
    expect(validateRentalDraft(draft({ depositType: "money", depositAmount: "-5" }))).toBe("depositAmount");
    expect(validateRentalDraft(draft({ depositDocument: "  " }))).toBe("depositDocument");
  });
});

describe("buildRentalPayload — тело как шлёт касса NurMarket", () => {
  it("залог документом", () => {
    expect(buildRentalPayload(draft())).toEqual({
      client: "c-1",
      items: [{ product: "p-1", variant: "v-1", qty: "1" }],
      date_from: "2026-10-06",
      date_to: "2026-10-08",
      tariff: "day",
      deposit_type: "document",
      deposit_document: "Паспорт ID AN123",
    });
  });

  it("залог деньгами: сумма с двумя знаками и способ", () => {
    expect(
      buildRentalPayload(draft({ depositType: "money", depositAmount: "5000", note: " срочно " })),
    ).toMatchObject({ deposit_type: "money", deposit_amount: "5000.00", deposit_method: "cash", note: "срочно" });
  });
});

describe("плитки и просрочка", () => {
  const r = (over: any) => normalizeRental({ id: Math.random(), status: "active", ...over })!;

  it("просрочен — по статусу сервера или по дате возврата", () => {
    expect(isRentalOverdue(r({ status: "overdue" }), "2026-10-06")).toBe(true);
    expect(isRentalOverdue(r({ date_to: "2026-10-05" }), "2026-10-06")).toBe(true);
    expect(isRentalOverdue(r({ date_to: "2026-10-06" }), "2026-10-06")).toBe(false);
    expect(isRentalOverdue(r({ status: "returned", date_to: "2026-01-01" }), "2026-10-06")).toBe(false);
  });

  it("на руках / просрочено / залоги деньгами без двойного счёта", () => {
    const a = r({ id: "a", deposit_type: "money", deposit_amount: "5000.00", date_to: "2099-01-01" });
    const b = r({ id: "b", deposit_type: "document", date_to: "2099-01-01" });
    const c = r({ id: "c", status: "overdue", deposit_type: "money", deposit_amount: "1500.50" });
    expect(rentalTiles([a, b, c], [c])).toEqual({ onHands: 3, overdue: 1, moneyDeposits: 6500.5 });
  });

  it("normalizeRental терпит мусор", () => {
    expect(normalizeRental(null)).toBeNull();
    expect(normalizeRental({ id: 1, items: null, deposit_amount: "abc" })).toMatchObject({
      items: [],
      depositAmount: 0,
      clientName: "—",
    });
  });
});
