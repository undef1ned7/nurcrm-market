import type { ProductFormBlockId, ProductFormLayoutValues } from "./types";

const emptyish = new Set(["", "0", "0.0", "0.00", "0.000", "шт"]);

function filled(value: unknown) {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  const text = String(value).trim();
  if (!text) return false;
  return !emptyish.has(text);
}

function dimensionFilled(value: unknown) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n !== 0;
}

export function hasBlockValue(
  id: ProductFormBlockId,
  values: ProductFormLayoutValues = {},
): boolean {
  const item = values.newItemData || {};
  const market = values.marketData || {};

  switch (id) {
    case "code":
      return filled(market.code);
    case "barcode":
      return filled(item.barcode);
    case "alternateBarcodes":
      return filled(market.alternateBarcodesText);
    case "article":
      return filled(market.article);
    case "hotkey":
      return filled(market.hotkeyGroup);
    case "images":
      return (values.images || []).length > 0;
    case "category":
      return filled(item.category_name);
    case "brand":
      return filled(item.brand_name);
    case "unit":
      return false;
    case "pieceSale":
      return Boolean(market.enablePieceSale) || (market.packagings || []).length > 0;
    case "weight":
      return Boolean(
        values.itemType === "service"
          ? market.isFractionalService
          : market.isWeightProduct,
      );
    case "adult":
      return Boolean(market.isAdult);
    case "packaging":
      return (market.packagings || []).length > 0;
    case "markup":
      return false;
    case "wholesale":
      return filled(item.wholesale_price);
    case "discount":
      return false;
    case "supplier":
      return filled(item.client);
    case "debt":
      return Boolean(values.showDebtForm);
    case "minStock":
      return false;
    case "country":
      return filled(market.country);
    case "expiry":
      return filled(market.expiryDate);
    case "promotion":
      return (market.promotionRules || []).length > 0;
    case "characteristics":
      return (
        dimensionFilled(market.height) ||
        dimensionFilled(market.width) ||
        dimensionFilled(market.depth) ||
        dimensionFilled(market.weight)
      );
    case "description":
      return filled(market.description);
    case "plu":
      return filled(market.plu);
    default:
      return false;
  }
}

export function isBlockVisible(
  id: ProductFormBlockId,
  hidden: Iterable<string>,
  values: ProductFormLayoutValues = {},
) {
  const hiddenSet = hidden instanceof Set ? hidden : new Set(hidden);
  if (!hiddenSet.has(id)) return true;
  return hasBlockValue(id, values);
}
