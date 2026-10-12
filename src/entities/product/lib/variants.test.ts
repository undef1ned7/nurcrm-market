import { describe, expect, it } from "vitest";
import {
  buildVariantCombos,
  compareSizes,
  groupVariantsBySize,
  labelsCountForVariant,
  normalizeVariantList,
  parseListInput,
  variantDiscountPercent,
  variantEffectivePrice,
  variantLabel,
  type ProductVariant,
} from "./variants";

const v = (over: Partial<ProductVariant>): ProductVariant => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  size: "",
  color: "",
  barcode: "",
  quantity: 0,
  price: null,
  is_active: true,
  ...over,
});

describe("compareSizes", () => {
  it("буквенные — XS…XXL, а не по алфавиту", () => {
    expect(["XL", "S", "XXL", "M", "XS", "L"].sort(compareSizes)).toEqual([
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
    ]);
  });

  it("числовые — по возрастанию, не строками", () => {
    expect(["46", "100", "40", "44.5"].sort(compareSizes)).toEqual(["40", "44.5", "46", "100"]);
  });

  it("буквы раньше чисел, пустой размер — в конце", () => {
    expect(["", "42", "M"].sort(compareSizes)).toEqual(["M", "42", ""]);
  });

  it("2XL — то же, что XXL", () => {
    expect(["2XL", "XL", "3XL"].sort(compareSizes)).toEqual(["XL", "2XL", "3XL"]);
  });
});

describe("buildVariantCombos (Быстро заполнить)", () => {
  it("5 размеров × 3 цвета = 15 строк, все выбраны", () => {
    const combos = buildVariantCombos(
      ["XS", "S", "M", "L", "XL"],
      ["Красный", "Синий", "Чёрный"],
    );
    expect(combos).toHaveLength(15);
    expect(combos.every((c) => c.selected && !c.exists)).toBe(true);
    expect(combos[0]).toMatchObject({ size: "XS", color: "Красный" });
  });

  it("без цветов — только размеры; без размеров — только цвета", () => {
    expect(buildVariantCombos(["44", "46"], [])).toHaveLength(2);
    expect(buildVariantCombos([], ["Белый"])).toEqual([
      expect.objectContaining({ size: "", color: "Белый" }),
    ]);
    expect(buildVariantCombos([], [])).toEqual([]);
  });

  it("существующее сочетание помечено и не выбрано (регистр не важен)", () => {
    const combos = buildVariantCombos(["44"], ["красный", "Синий"], [
      { size: "44", color: "Красный" },
    ]);
    expect(combos.find((c) => c.color === "красный")).toMatchObject({
      exists: true,
      selected: false,
    });
    expect(combos.find((c) => c.color === "Синий")).toMatchObject({ exists: false, selected: true });
  });

  it("повторы размеров не дают дублей", () => {
    expect(buildVariantCombos(["M", "M", "m"], ["Белый"])).toHaveLength(1);
  });
});

describe("parseListInput", () => {
  it("разделители , ; перевод строки; пробелы и повторы убираются", () => {
    expect(parseListInput(" 62, 64;64\nOne size ,, ")).toEqual(["62", "64", "One size"]);
  });

  it("ломающий ввод не падает и обрезается до 50 символов", () => {
    const out = parseListInput(`<script>alert(1)</script>, {}, &, ${"Ж".repeat(200)}`);
    expect(out[0]).toBe("<script>alert(1)</script>");
    expect(out[3]).toHaveLength(50);
  });
});

describe("цена варианта", () => {
  it("null — цена товара", () => {
    expect(variantEffectivePrice({ price: null }, "1500")).toBe(1500);
    expect(variantEffectivePrice({ price: 1200 }, "1500")).toBe(1200);
  });

  it("скидка −N% только если ниже цены товара", () => {
    expect(variantDiscountPercent({ price: 1200 }, 1500)).toBe(20);
    expect(variantDiscountPercent({ price: 1500 }, 1500)).toBe(0);
    expect(variantDiscountPercent({ price: 2000 }, 1500)).toBe(0);
    expect(variantDiscountPercent({ price: null }, 1500)).toBe(0);
    expect(variantDiscountPercent({ price: 100 }, 0)).toBe(0);
  });
});

describe("groupVariantsBySize (окно выбора размера)", () => {
  it("размеры по порядку, остаток — сумма по цветам, неактивные скрыты", () => {
    const groups = groupVariantsBySize([
      v({ size: "46", color: "Синий", quantity: 1 }),
      v({ size: "44", color: "Красный", quantity: 2 }),
      v({ size: "44", color: "Синий", quantity: 3 }),
      v({ size: "48", color: "Красный", quantity: 5, is_active: false }),
    ]);
    expect(groups.map((g) => [g.size, g.quantity])).toEqual([
      ["44", 5],
      ["46", 1],
    ]);
  });

  it("отрицательный остаток не уменьшает сумму", () => {
    const [g] = groupVariantsBySize([
      v({ size: "S", quantity: -2 }),
      v({ size: "S", color: "Белый", quantity: 1 }),
    ]);
    expect(g.quantity).toBe(1);
  });
});

describe("разное", () => {
  it("variantLabel", () => {
    expect(variantLabel("44", "Красный")).toBe("44, Красный");
    expect(variantLabel("", "Красный")).toBe("Красный");
    expect(variantLabel(null, undefined)).toBe("");
  });

  it("этикеток столько, сколько штук на остатке (целое, не меньше 0)", () => {
    expect(labelsCountForVariant({ quantity: 3 })).toBe(3);
    expect(labelsCountForVariant({ quantity: 2.7 })).toBe(2);
    expect(labelsCountForVariant({ quantity: -1 })).toBe(0);
  });

  it("normalizeVariantList: пагинация, null, мусор", () => {
    expect(normalizeVariantList(null)).toEqual([]);
    expect(
      normalizeVariantList({
        results: [{ id: 1, size: "44", quantity: "2", price: "" }, null, { size: "x" }],
      }),
    ).toEqual([
      expect.objectContaining({ id: "1", size: "44", quantity: 2, price: null, is_active: true }),
    ]);
  });
});
