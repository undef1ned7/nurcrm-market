import { describe, expect, it } from "vitest";
import { daysToShelfLife, shelfLifeToDays } from "./shelfLife";

describe("shelfLifeToDays", () => {
  it("converts days as-is", () => {
    expect(shelfLifeToDays("6", "days")).toBe(6);
    expect(shelfLifeToDays(6, "days")).toBe(6);
  });

  it("converts months to days (1 month = 30 days)", () => {
    expect(shelfLifeToDays("2", "months")).toBe(60);
  });

  it("rounds fractional input", () => {
    expect(shelfLifeToDays("6.6", "days")).toBe(7);
  });

  it("returns null for empty/zero/negative/invalid input", () => {
    expect(shelfLifeToDays("", "days")).toBeNull();
    expect(shelfLifeToDays(null, "days")).toBeNull();
    expect(shelfLifeToDays("0", "days")).toBeNull();
    expect(shelfLifeToDays("-5", "days")).toBeNull();
    expect(shelfLifeToDays("abc", "days")).toBeNull();
  });
});

describe("daysToShelfLife", () => {
  it("shows exact months when evenly divisible", () => {
    expect(daysToShelfLife(60)).toEqual({ value: "2", unit: "months" });
    expect(daysToShelfLife(30)).toEqual({ value: "1", unit: "months" });
  });

  it("shows days when not evenly divisible by 30 or under a month", () => {
    expect(daysToShelfLife(6)).toEqual({ value: "6", unit: "days" });
    expect(daysToShelfLife(45)).toEqual({ value: "45", unit: "days" });
  });

  it("returns empty value for null/zero/invalid", () => {
    expect(daysToShelfLife(null)).toEqual({ value: "", unit: "days" });
    expect(daysToShelfLife(undefined)).toEqual({ value: "", unit: "days" });
    expect(daysToShelfLife(0)).toEqual({ value: "", unit: "days" });
  });

  it("round-trips through shelfLifeToDays", () => {
    const shelfLife = daysToShelfLife(90);
    expect(shelfLifeToDays(shelfLife.value, shelfLife.unit)).toBe(90);
  });
});
