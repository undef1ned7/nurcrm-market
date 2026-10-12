import { describe, expect, it } from "vitest";
import { formatAmount, formatShiftDate, isNotFound, shiftErrorMessage, toAmount } from "./shiftFormat";

describe("formatAmount — без «NaN сом»", () => {
  it.each([
    ["12500", "12500.00"],
    ["-50.5", "-50.50"],
    [7, "7.00"],
    ["1,5", "1.50"],
    ["1 000", "1000.00"],
    [null, "0.00"],
    ["", "0.00"],
    ["abc", "—"],
    ["∞", "—"],
    [Infinity, "—"],
  ])("%j → %s", (v, out) => expect(formatAmount(v)).toBe(out));

  it("toAmount: мусор → null", () => {
    expect(toAmount("abc")).toBeNull();
    expect(toAmount("-1500.50")).toBe(-1500.5);
  });
});

describe("formatShiftDate", () => {
  it("месяц в родительном падеже: «5 октября 09:00»", () => {
    expect(formatShiftDate(new Date(2026, 9, 5, 9, 0).toISOString())).toBe("5 октября 09:00");
  });

  it.each(["garbage", "2026-13-45", "", null, undefined])("%j → «—», а не Invalid Date", (v) => {
    expect(formatShiftDate(v)).toBe("—");
  });
});

describe("ошибки загрузки", () => {
  it("404 — не найдена, 500 — сбой", () => {
    expect(isNotFound({ status: 404 })).toBe(true);
    expect(isNotFound({ status: 500 })).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });

  it("технический текст axios заменяется понятным", () => {
    expect(shiftErrorMessage({ status: 500, message: "Request failed with status code 500" }, "Не удалось")).toBe("Не удалось");
    expect(shiftErrorMessage({ message: "Network Error" }, "Не удалось")).toBe("Не удалось");
  });

  it("понятный ответ сервера на 4xx показывается", () => {
    expect(shiftErrorMessage({ status: 403, data: { detail: "Нет доступа к сменам" } }, "Не удалось")).toBe("Нет доступа к сменам");
  });
});
