import { productSearchHaystackLower } from "@shared/lib/tools/productBarcode";
import { isKitCompositionCandidate } from "@shared/lib/tools/marketWarehouseFilters";

export const getProductCategoryKey = (product: any) => {
  const category = product?.category;
  if (category && typeof category === "object") {
    return String(category.id ?? category.uuid ?? "").trim();
  }
  return String(category ?? product?.category_id ?? "").trim();
};

export const getProductCategoryLabel = (product: any, categories: any[] = []) => {
  const key = getProductCategoryKey(product);
  if (key) {
    const found = categories.find((c: any) => String(c.id) === key);
    if (found?.name) return found.name;
  }
  return (
    product?.category_name ||
    product?.category_title ||
    (typeof product?.category === "string" ? product.category : "") ||
    "Без категории"
  );
};

export const filterKitCompositionCandidates = (
  products: any[] = [],
  { excludeProductId = "", alreadyInKitIds = [] }: any = {},
) => {
  const excluded = new Set(
    [excludeProductId, ...alreadyInKitIds].map((id: any) => String(id)).filter(Boolean),
  );

  return (Array.isArray(products) ? products : []).filter((product: any) => {
    if (!isKitCompositionCandidate(product)) return false;
    if (excluded.has(String(product.id))) return false;
    return true;
  });
};

export const filterKitPickerList = (
  candidates: any[] = [],
  { search = "", categoryId = "", categories = [] }: any = {},
) => {
  const q = String(search || "").trim().toLowerCase();
  const cat = String(categoryId || "").trim();

  return candidates
    .filter((product: any) => {
      if (cat && getProductCategoryKey(product) !== cat) return false;
      if (!q) return true;
      return productSearchHaystackLower(product).includes(q);
    })
    .map((product: any) => {
      const qty = parseFloat(product.quantity);
      const unit = product.unit || "шт";
      return {
        id: String(product.id),
        title: product.name || product.title || "Без названия",
        subtitle: getProductCategoryLabel(product, categories),
        meta: `Остаток: ${Number.isFinite(qty) ? qty : 0} ${unit}`,
        product,
      };
    });
};
