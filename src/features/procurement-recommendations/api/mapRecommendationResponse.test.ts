import { describe, expect, it } from "vitest";
import { mapRecommendationResponse } from "./mapRecommendationResponse";

describe("mapRecommendationResponse", () => {
  it("maps backend JSON into frontend recommendation items", () => {
    const payload = mapRecommendationResponse(
      {
        supplier: { id: "15", name: "Белая река" },
        results: [
          {
            product_id: "123",
            product_name: "Молоко 1 л",
            barcode: "1234567890",
            unit: "шт",
            is_weight: false,
            current_stock: 8,
            pack_size: 10,
            purchase_price: 62,
            sales: {
              last_7_days: 35,
              last_30_days: 140,
              previous_period: 112,
            },
            last_purchase: {
              date: "2026-08-01T10:20:00+06:00",
              quantity: 40,
              purchase_price: 62,
            },
          },
        ],
      },
      { id: "15", name: "Белая река" },
    );

    expect(payload.source).toBe("backend");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      productId: "123",
      productName: "Молоко 1 л",
      currentStock: 8,
      sales7d: 35,
      sales30d: 140,
      previous30d: 112,
      packSize: 10,
    });
    expect(payload.items[0].lastPurchase?.quantity).toBe(40);
  });
});
