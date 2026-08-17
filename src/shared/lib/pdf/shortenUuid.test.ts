import { describe, expect, it } from "vitest";
import { shortenUuid, shortenUuidsInText } from "./shortenUuid";

describe("shortenUuid", () => {
  it("keeps prefix and suffix so a sale can still be found", () => {
    expect(shortenUuid("4734b29a-6719-47f4-a260-875cd42d0b23")).toBe(
      "4734b29a…0b23",
    );
  });

  it("replaces uuids inside sale titles", () => {
    expect(
      shortenUuidsInText(
        "Продажа 4734b29a-6719-47f4-a260-875cd42d0b23",
      ),
    ).toBe("Продажа 4734b29a…0b23");
  });
});
