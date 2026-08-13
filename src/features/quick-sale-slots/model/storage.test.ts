import { describe, expect, it } from "vitest";
import { digitFromKeyboardEvent, slotForProduct } from "./storage";

describe("quick sale slots", () => {
  it("maps keyboard codes to digits", () => {
    expect(
      digitFromKeyboardEvent({ code: "Digit3", key: "3" } as KeyboardEvent),
    ).toBe("3");
    expect(
      digitFromKeyboardEvent({ code: "Numpad0", key: "0" } as KeyboardEvent),
    ).toBe("0");
    expect(
      digitFromKeyboardEvent({ code: "KeyA", key: "a" } as KeyboardEvent),
    ).toBe("");
  });

  it("finds slot for product", () => {
    expect(slotForProduct({ "1": "abc", "7": "xyz" }, "xyz")).toBe("7");
    expect(slotForProduct({ "1": "abc" }, "nope")).toBe("");
  });
});
