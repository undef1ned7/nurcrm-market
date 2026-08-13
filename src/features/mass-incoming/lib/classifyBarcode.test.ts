import { describe, expect, it } from "vitest";
import { mergeScannedRow } from "./classifyBarcode";

describe("mergeScannedRow", () => {
  it("uses product id as stable key", () => {
    const row = mergeScannedRow("IN_STOCK", "4601", {
      id: "p1",
      name: "Чай",
      stock_qty: 4,
    });
    expect(row.key).toBe("IN_STOCK:p1");
    expect(row.quantity).toBe(1);
    expect(row.stockQty).toBe(4);
  });

  it("keeps unknown barcodes unique by code", () => {
    const row = mergeScannedRow("UNKNOWN", "999", null);
    expect(row.key).toBe("UNKNOWN:999");
    expect(row.name).toBe("Неизвестный штрихкод");
  });
});
