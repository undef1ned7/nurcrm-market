import { describe, expect, it } from "vitest";
import { resolveReceiptStyle } from "./receiptStyle";

describe("resolveReceiptStyle", () => {
  it("returns an explicit style even if the sector is not market", () => {
    expect(resolveReceiptStyle("market", "cafe")).toBe("market");
    expect(resolveReceiptStyle("plain", "market")).toBe("plain");
  });

  it("falls back to market when selectedSector is market", () => {
    expect(resolveReceiptStyle(undefined, "market")).toBe("market");
    expect(resolveReceiptStyle("", "Market")).toBe("market");
  });

  it("returns undefined when neither style nor market sector is set", () => {
    expect(resolveReceiptStyle(undefined, "cafe")).toBeUndefined();
    expect(resolveReceiptStyle(null, "")).toBeUndefined();
  });
});
