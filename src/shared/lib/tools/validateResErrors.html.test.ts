import { describe, expect, it } from "vitest";
import { validateResErrors } from "./validateResErrors";

describe("validateResErrors: HTML-страница ошибки сервера", () => {
  const html = "<!DOCTYPE html><html><body><h1>Server Error (500)</h1></body></html>";

  it("HTML из ответа 500 не показывается — берётся запасной текст", () => {
    const err = { isAxiosError: true, config: {}, response: { status: 500, data: html }, message: "Request failed with status code 500" };
    expect(validateResErrors(err, "Ошибка сервера")).toBe("Ошибка сервера");
  });

  it("HTML строкой (уже извлечённый текст) — тоже запасной текст", () => {
    expect(validateResErrors(html, "Ошибка сервера")).toBe("Ошибка сервера");
  });

  it("обычный текст сервера по-прежнему показывается", () => {
    const err = { isAxiosError: true, config: {}, response: { status: 400, data: { detail: "Обмен возможен только по оплаченному чеку" } } };
    expect(validateResErrors(err, "x")).toBe("Обмен возможен только по оплаченному чеку");
    expect(validateResErrors("Текст < 5 и > 3", "x")).toBe("Текст < 5 и > 3");
  });
});
