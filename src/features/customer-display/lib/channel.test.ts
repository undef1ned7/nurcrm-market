import { describe, expect, it } from "vitest";
import { isCustomerDisplayMessage } from "./channel";

describe("isCustomerDisplayMessage", () => {
  it("accepts age-check messages", () => {
    expect(isCustomerDisplayMessage({ type: "age-check" })).toBe(true);
    expect(
      isCustomerDisplayMessage({
        type: "age-check",
        productName: "Вино",
      }),
    ).toBe(true);
    expect(isCustomerDisplayMessage({ type: "age-check-dismiss" })).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(isCustomerDisplayMessage({ type: "other" })).toBe(false);
    expect(isCustomerDisplayMessage(null)).toBe(false);
  });
});
