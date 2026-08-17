import { describe, expect, it } from "vitest";
import { formatDate, formatInteger, formatMoneyAmount } from "./format";

describe("i18n format", () => {
  it("formats money with two fraction digits", () => {
    expect(formatMoneyAmount(1200.5, "ru")).toMatch(/1[\s\u00a0]?200[,.]50/);
    expect(formatMoneyAmount(1200.5, "ky")).toMatch(/1[\s\u00a0]?200[,.]50/);
  });

  it("formats integers", () => {
    expect(formatInteger(3, "ru")).toBe("3");
  });

  it("formats a calendar date in Bishkek timezone", () => {
    const text = formatDate("2026-08-14T12:00:00+06:00", "ru");
    expect(text).toMatch(/14/);
    expect(text).toMatch(/08|8/);
    expect(text).toMatch(/2026/);
  });

  it("returns empty string for invalid dates", () => {
    expect(formatDate("not-a-date", "ru")).toBe("");
  });
});
