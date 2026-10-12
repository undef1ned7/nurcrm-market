import { describe, expect, it } from "vitest";
import { SPEC, checkNum, parseNumStrict } from "./calcUtils";

describe("parseNumStrict — что вводят и копируют", () => {
  it.each([
    ["1 250,50", 1250.5],
    ["1250.5", 1250.5],
    ["1,000.50", 1000.5],
    ["1.000,50", 1000.5],
    ["1,000,000", 1000000],
    ["1.000.000", 1000000],
    ["5%", 5],
    ["+5", 5],
    ["-5", -5],
    [" 7 ", 7],
    [",5", 0.5],
  ])("%s → %s", (input, expected) => {
    expect(parseNumStrict(input)).toBeCloseTo(expected as number);
  });

  it.each(["", " ", "-", ",", "abc", "12abc", "--5", "1e3", "0x10", "Infinity", "NaN", "１２３", "9".repeat(400), "1,2,3.4.5"])(
    "%j — не число",
    (input) => {
      expect(parseNumStrict(input)).toBeNull();
    },
  );
});

describe("checkNum — ошибка у поля вместо молчаливого нуля", () => {
  it("пусто — не ошибка", () => expect(checkNum("", SPEC.money)).toEqual({ value: null, error: null }));
  it("мусор — format", () => expect(checkNum("abc", SPEC.money).error).toBe("format"));
  it("отрицательная закупка — min", () => expect(checkNum("-80", SPEC.money).error).toBe("min"));
  it("маржа 100 % — max (не входит)", () => expect(checkNum("100", SPEC.margin).error).toBe("max"));
  it("скидка 100 % — можно", () => expect(checkNum("100", SPEC.percent).value).toBe(100));
  it("курс 0 — min (строго больше)", () => expect(checkNum("0", SPEC.rate).error).toBe("min"));
  it("0 рабочих дней — min", () => expect(checkNum("0", SPEC.days).error).toBe("min"));
});
