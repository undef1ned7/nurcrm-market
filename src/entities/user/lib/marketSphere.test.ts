import { describe, expect, it } from "vitest";
import {
  canEditMarketSphere,
  getMarketSphereFeatures,
  normalizeMarketSphere,
  sphereHiddenProductBlocks,
} from "./marketSphere";

describe("normalizeMarketSphere", () => {
  it("пусто и неизвестное — «Продукты» (сайт ведёт себя как раньше)", () => {
    expect(normalizeMarketSphere(undefined)).toBe("grocery");
    expect(normalizeMarketSphere(null)).toBe("grocery");
    expect(normalizeMarketSphere("")).toBe("grocery");
    expect(normalizeMarketSphere("cafe")).toBe("grocery");
  });

  it("известные значения, регистр и пробелы не мешают", () => {
    expect(normalizeMarketSphere("clothing")).toBe("clothing");
    expect(normalizeMarketSphere(" SERVICES ")).toBe("services");
  });
});

describe("матрица функций (ТЗ, раздел 3)", () => {
  it("Продукты: весовые поля есть, одежды и услуг нет", () => {
    const f = getMarketSphereFeatures("grocery");
    expect(f.weightFields).toBe(true);
    expect(f.variants || f.exchange || f.rentals || f.appointments || f.workOrders).toBe(false);
    expect(f.consultant).toBe(false);
  });

  it("Одежда: размеры, консультант, обмен, срок, прокат; без весовых полей", () => {
    const f = getMarketSphereFeatures("clothing");
    expect(f).toMatchObject({
      weightFields: false,
      variants: true,
      consultant: true,
      exchange: true,
      exchangeTerm: true,
      rentals: true,
      performer: false,
      appointments: false,
    });
  });

  it("Услуги: каталог на услугах, мастер, запись, наряды, прокат; без размеров", () => {
    const f = getMarketSphereFeatures("services");
    expect(f).toMatchObject({
      weightFields: false,
      variants: false,
      servicesFirst: true,
      performer: true,
      appointments: true,
      workOrders: true,
      rentals: true,
      exchange: false,
    });
  });

  it("скрытые блоки формы товара", () => {
    expect(sphereHiddenProductBlocks("grocery")).toEqual([]);
    expect(sphereHiddenProductBlocks("clothing")).toEqual(["weight", "plu", "expiry"]);
    expect(sphereHiddenProductBlocks("services")).toEqual(["weight", "plu", "expiry"]);
  });
});

describe("canEditMarketSphere", () => {
  it("владелец и админ — да, кассир — нет", () => {
    expect(canEditMarketSphere({ role: "owner" })).toBe(true);
    expect(canEditMarketSphere({ role: "Admin" })).toBe(true);
    expect(canEditMarketSphere({ role: "cashier" })).toBe(false);
    expect(canEditMarketSphere(null)).toBe(false);
  });
});
