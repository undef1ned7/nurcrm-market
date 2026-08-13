import { describe, expect, it } from "vitest";
import { buildCustomerDisplayCartMessage } from "./buildCartMessage";

describe("buildCustomerDisplayCartMessage", () => {
  it("maps cart lines and totals", () => {
    const message = buildCustomerDisplayCartMessage({
      cart: [
        { name: "Хлеб", quantity: 2, price: 30, discountTotal: 10 },
        { name: "Молоко", quantity: 1, price: 80 },
      ],
      total: 130,
      cartId: "sale-1",
    });

    expect(message.type).toBe("cart");
    if (message.type !== "cart") return;
    expect(message.cartId).toBe("sale-1");
    expect(message.items).toHaveLength(2);
    expect(message.items[0].lineTotal).toBe(50);
    expect(message.subtotal).toBe(140);
    expect(message.discountTotal).toBe(10);
    expect(message.total).toBe(130);
  });
});
