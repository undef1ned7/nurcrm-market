import { describe, expect, it, vi } from "vitest";

// describeBranchUsage переводит подписи через i18n. В юнит-тестах HTTP-бэкенда переводов нет,
// поэтому подставляем настоящий i18next с русским translation.json: тест проверяет и точный
// русский текст, и то, что ключи существуют.
vi.mock("@shared/config/i18n", async () => {
  const i18next = (await import("i18next")).default;
  const ru = (await import("../../../../public/locales/ru/translation.json")).default;
  const instance = i18next.createInstance();
  await instance.init({
    lng: "ru",
    resources: { ru: { translation: ru } },
    interpolation: { escapeValue: false },
  });
  return { default: instance };
});

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
