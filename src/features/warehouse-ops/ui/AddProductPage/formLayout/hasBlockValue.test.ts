import { describe, expect, it } from "vitest";
import { hasBlockValue, isBlockVisible } from "./hasBlockValue";

describe("hasBlockValue", () => {
  it("does not treat default zeros / шт as filled", () => {
    expect(
      hasBlockValue("unit", { marketData: { unit: "шт" } }),
    ).toBe(false);
    expect(
      hasBlockValue("markup", { marketData: { markup: "0" } }),
    ).toBe(false);
    expect(
      hasBlockValue("characteristics", {
        marketData: { height: "0", width: "0", depth: "0", weight: "0" },
      }),
    ).toBe(false);
  });

  it("shows hidden fields that already have data", () => {
    expect(
      hasBlockValue("barcode", { newItemData: { barcode: "460123" } }),
    ).toBe(true);
    expect(
      hasBlockValue("images", { images: [{ preview: "x" }] }),
    ).toBe(true);
    expect(
      hasBlockValue("adult", { marketData: { isAdult: true } }),
    ).toBe(true);
    expect(
      hasBlockValue("characteristics", {
        marketData: { height: "10", width: "0", depth: "0", weight: "0" },
      }),
    ).toBe(true);
  });

  it("keeps hidden empty fields invisible", () => {
    expect(isBlockVisible("images", ["images"], { images: [] })).toBe(false);
    expect(
      isBlockVisible("images", ["images"], { images: [{ preview: "x" }] }),
    ).toBe(true);
    expect(isBlockVisible("images", [], { images: [] })).toBe(true);
  });
});
