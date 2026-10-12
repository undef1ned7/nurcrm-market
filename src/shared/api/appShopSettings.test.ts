import { describe, expect, it } from "vitest";
import {
  buildAppShopPatch,
  isPaymentRequired,
  parseAppShopSettings,
  parseFieldErrors,
  type ShopForm,
} from "./appShopSettings";

const response = {
  show_in_app: true,
  visible_in_app: false,
  reason: "no_address",
  address: "",
  phone: "+996555000111",
  working_hours: "Ежедневно",
  location: { latitude: null, longitude: null },
  bonus_enabled: true,
  bonus_percent: "5.00",
  preview: { name: "NBS", address: "", bonus_percent: 5 },
  branches: [
    { id: 7, name: "Филиал Юг", show_in_app: false, visible_in_app: false, reason: "disabled", address: "Ош" },
  ],
};

const edit = (f: ShopForm, p: Partial<ShopForm>): ShopForm => ({ ...f, ...p });

describe("parseAppShopSettings", () => {
  it("находит поля и статус по ответу сервера", () => {
    const s = parseAppShopSettings(response, "NBS");
    expect(s.company.keys).toMatchObject({
      enabled: "show_in_app",
      address: "address",
      schedule: "working_hours",
      lat: "location.latitude",
      lng: "location.longitude",
      pointsPercent: "bonus_percent",
    });
    expect(s.company.keys.name).toBeUndefined();
    expect(s.company.reason).toBe("no_address");
    expect(s.company.form.pointsPercent).toBe("5");
    expect(s.company.preview?.pointsPercent).toBe(5);
    expect(s.branches).toHaveLength(1);
    expect(s.branches[0].title).toBe("Филиал Юг");
    expect(s.branches[0].reason).toBe("disabled");
  });

  it("visible_in_app=true → «виден»", () => {
    const s = parseAppShopSettings({ ...response, visible_in_app: true, reason: null }, "NBS");
    expect(s.company.reason).toBe("visible");
  });

  it("бросает ошибку на не-объект", () => {
    expect(() => parseAppShopSettings([], "x")).toThrow();
  });
});

describe("buildAppShopPatch", () => {
  const s = parseAppShopSettings(response, "NBS");
  const forms = () => ({ company: { ...s.company.form }, [s.branches[0].key]: { ...s.branches[0].form } });

  it("без изменений — null", () => {
    expect(buildAppShopPatch(s, forms())).toBeNull();
  });

  it("отправляет только изменённые поля под ключами сервера, координаты — парой", () => {
    const f = forms();
    f.company = edit(f.company, { address: " Киевская 1 ", lat: "42.87" , lng: "74.6", name: "игнор" });
    f[s.branches[0].key] = edit(f[s.branches[0].key], { enabled: true });
    expect(buildAppShopPatch(s, f)).toEqual({
      address: "Киевская 1",
      location: { latitude: 42.87, longitude: 74.6 },
      branches: [{ id: "7", show_in_app: true }],
    });
  });

  it("обёртка company сохраняется", () => {
    const wrapped = parseAppShopSettings({ company: { show_in_app: false }, branches: [] }, "NBS");
    const f = { company: edit(wrapped.company.form, { enabled: true }) };
    expect(buildAppShopPatch(wrapped, f)).toEqual({ company: { show_in_app: true } });
  });
});

describe("ошибки", () => {
  const s = parseAppShopSettings(response, "NBS");

  it("400 → ошибки у полей компании и филиала", () => {
    const fe = parseFieldErrors(s, {
      address: ["Обязательное поле."],
      bonus_percent: ["Не больше 100."],
      branches: [{ id: 7, address: ["Адрес не найден."] }],
    });
    expect(fe.company).toMatchObject({ address: "Обязательное поле.", pointsPercent: "Не больше 100." });
    expect(fe[s.branches[0].key]).toMatchObject({ address: "Адрес не найден." });
  });

  it("403 client_app_payment_required", () => {
    expect(isPaymentRequired({ response: { status: 403, data: { code: "client_app_payment_required" } } })).toBe(true);
    expect(isPaymentRequired({ response: { status: 403, data: { code: "permission_denied" } } })).toBe(false);
  });
});
