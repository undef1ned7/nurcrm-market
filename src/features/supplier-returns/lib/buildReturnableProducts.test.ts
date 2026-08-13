import { describe, expect, it } from "vitest";
import { buildReturnableProducts } from "./buildReturnableProducts";

describe("buildReturnableProducts", () => {
  it("uses receipt lines when receipt is provided", () => {
    const rows = buildReturnableProducts({
      products: [{ id: "123", name: "Молоко", quantity: 8, purchase_price: 62, unit: "шт" }],
      receipt: {
        items: [{ id: "line-1", product_id: "123", qty: 40, purchase_price: 60 }],
      },
      existingReturns: [
        {
          id: "r1",
          supplierId: "15",
          supplierName: "Белая река",
          receiptId: "rec-1",
          createdAt: "2026-08-01",
          createdByName: "A",
          reason: "defect",
          comment: "",
          compensation: "none",
          status: "posted",
          items: [
            {
              productId: "123",
              productName: "Молоко",
              unit: "шт",
              isWeight: false,
              qty: 5,
              purchasePrice: 60,
              lineTotal: 300,
              receiptItemId: "line-1",
            },
          ],
          itemsCount: 1,
          totalAmount: 300,
          source: "composed",
        },
      ],
      receiptId: "rec-1",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].purchasedQty).toBe(40);
    expect(rows[0].alreadyReturnedQty).toBe(5);
    expect(rows[0].returnableQty).toBe(8);
    expect(rows[0].purchasePrice).toBe(60);
  });

  it("falls back to catalog stock without a receipt", () => {
    const rows = buildReturnableProducts({
      products: [{ id: "9", name: "Хлеб", quantity: 3, purchase_price: 20 }],
      existingReturns: [],
    });
    expect(rows[0].returnableQty).toBe(3);
    expect(rows[0].purchasedQty).toBeNull();
  });
});
