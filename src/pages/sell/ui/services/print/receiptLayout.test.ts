import { describe, expect, it } from "vitest";
import {
  buildMarketReceiptLayout,
  resolveGraphicLineWidth,
} from "./receiptLayout";

describe("buildMarketReceiptLayout", () => {
  it("builds header and item rows for market payload", () => {
    const layout = buildMarketReceiptLayout(
      {
        company: "Test Shop",
        items: [
          {
            name: "Товар 1",
            qty: 2,
            unit_price: 100,
            line_total: 180,
            line_discount: 20,
          },
        ],
        paid_cash: 180,
        total: 180,
      },
      { receiptStyle: "market", dotsPerLine: 384, charsPerLine: 42 },
    );

    expect(layout.lines.some((l) => l.text?.includes("СПАСИБО ЗА ПОКУПКУ"))).toBe(
      true,
    );
    expect(layout.lines.some((l) => l.text?.includes("Test Shop"))).toBe(true);
    expect(layout.lines.some((l) => l.text?.includes("1) Товар 1"))).toBe(true);
    expect(
      layout.lines.some(
        (l) => l.left === "Цена x Кол-о - Скидка" && l.right === "Итого",
      ),
    ).toBe(true);
    expect(
      layout.lines.some(
        (l) => l.right === "180.00" && l.left === "100.00 x 2 - 20",
      ),
    ).toBe(true);
    expect(
      layout.lines.some((l) => l.left === "Подытог" && l.right === "200.00"),
    ).toBe(true);
  });

  it("caps graphic width for 48mm paper", () => {
    expect(resolveGraphicLineWidth(384, 64)).toBeLessThanOrEqual(42);
    expect(resolveGraphicLineWidth(384, 42)).toBe(42);
  });
});
