import { describe, expect, it } from "vitest";
import { validateResErrors } from "./validateResErrors";

describe("validateResErrors: ошибки полей DRF", () => {
  const axios400 = (data: unknown) => ({ isAxiosError: true, config: {}, response: { status: 400, data } });

  it("ошибка поля name показывается (а не запасной текст)", () => {
    const err = axios400({ name: ["Бренд с таким названием уже существует."] });
    expect(validateResErrors(err, "Ошибка при сохранении.")).toBe("Бренд с таким названием уже существует.");
  });

  it("name вместе с другими полями — все сообщения", () => {
    const err = axios400({ name: ["Обязательное поле."], price: ["Введите число."] });
    expect(validateResErrors(err, "x")).toBe("Обязательное поле.; Введите число.");
  });

  it("ошибка поля code показывается (DRF { code: [...] })", () => {
    const err = axios400({ code: ["Филиал с таким кодом уже существует."] });
    expect(validateResErrors(err, "x")).toBe("Филиал с таким кодом уже существует.");
    // Payload из rejectWithValue (тело ответа без обёртки axios)
    expect(validateResErrors({ code: ["Филиал с таким кодом уже существует."] }, "x")).toBe(
      "Филиал с таким кодом уже существует.",
    );
  });

  it("name объекта-исключения не попадает в текст", () => {
    const err = Object.assign(new Error(""), { name: "AxiosError" });
    expect(validateResErrors(err, "Запасной текст")).toBe("Запасной текст");
    const plain = { name: "AxiosError", stack: "at foo", code: "ERR_BAD_RESPONSE" };
    expect(validateResErrors(plain, "Запасной текст")).toBe("Запасной текст");
  });
});
