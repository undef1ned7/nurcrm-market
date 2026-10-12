import { describe, expect, it } from "vitest";
import {
  buildWorkOrderPayload,
  isWorkOrderIssued,
  normalizeWorkOrder,
  validateWorkOrderDraft,
  workOrderDue,
} from "./workOrders";

const draft = {
  clientId: "c",
  title: "iPhone 12",
  description: "",
  price: "3000",
  prepayment: "500",
  prepaymentMethod: "cash" as const,
};

describe("заказ-наряд", () => {
  it("к оплате = стоимость − предоплата, не меньше нуля", () => {
    expect(workOrderDue({ total: 3000, prepayment: 500 })).toBe(2500);
    expect(workOrderDue({ total: 300, prepayment: 500 })).toBe(0);
  });

  it("валидация", () => {
    expect(validateWorkOrderDraft(draft)).toBeNull();
    expect(validateWorkOrderDraft({ ...draft, title: " " })).toBe("title");
    expect(validateWorkOrderDraft({ ...draft, prepayment: "-1" })).toBe("prepayment");
    expect(validateWorkOrderDraft({ ...draft, prepayment: "5000" })).toBe("prepaymentTooBig");
  });

  it("payload: деньги с двумя знаками + маршрутизация смены", () => {
    expect(buildWorkOrderPayload(draft, { shift_id: "s-1" })).toEqual({
      client: "c",
      title: "iPhone 12",
      price: "3000.00",
      prepayment: "500.00",
      prepayment_method: "cash",
      shift_id: "s-1",
    });
  });

  it("нормализация и статус «выдан»", () => {
    const o = normalizeWorkOrder({ id: 5, device: "Ноутбук", estimated_price: "1000", status: "issued" })!;
    expect(o).toMatchObject({ title: "Ноутбук", total: 1000, prepayment: 0 });
    expect(isWorkOrderIssued(o)).toBe(true);
  });
});
